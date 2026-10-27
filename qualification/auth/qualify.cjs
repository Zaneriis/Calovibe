// Qualification only: Keycloak issues every token; the local API has no business data.
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { promisify } = require('node:util');
const { URLSearchParams } = require('node:url');
const { AbortController } = globalThis;
const { chromium } = require('playwright');
const { discoverAuthorizationServerMetadata, startAuthorization, exchangeAuthorization } = require('@modelcontextprotocol/client');
const run = promisify(execFile);
const root = path.resolve(__dirname, '../..');
const grant = 'urn:ietf:params:oauth:grant-type:token-exchange';
const accessType = 'urn:ietf:params:oauth:token-type:access_token';
const read = 'calovibe:read';
const write = 'calovibe:write';
const report = { candidate: 'Keycloak OSS 26.8.1', productionAuthoritySelected: false,
  synthetic: true, qualified: false, checks: [], cleanup: false };
const reportDir = path.join(root, 'artifacts/auth-qualification');
const pass = name => { report.checks.push(name); console.log('PASS ' + name); };
const secret = () => randomBytes(24).toString('hex');
const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const close = server => new Promise((resolve, reject) => {
  server.close(error => error ? reject(error) : resolve());
  server.closeAllConnections();
});
const scopes = payload => (payload.scope || '').split(' ').filter(Boolean);

function realmSeed({ mcp, api, redirect, password, exchangeSecret, otherSecret }) {
  const audience = target => ({ name: 'audience-' + target, protocol: 'openid-connect',
    protocolMapper: 'oidc-audience-mapper', config: { 'included.client.audience': target,
      'access.token.claim': 'true', 'id.token.claim': 'false' } });
  const subjectMapper = { name: 'subject', protocol: 'openid-connect',
    protocolMapper: 'oidc-sub-mapper', config: { 'access.token.claim': 'true' } };
  const base = { protocol: 'openid-connect', enabled: true, fullScopeAllowed: false,
    defaultClientScopes: [], optionalClientScopes: [read, write], directAccessGrantsEnabled: false };
  const resource = (uri, enabled, clientSecret) => ({ ...base, clientId: uri, publicClient: false,
    secret: clientSecret, standardFlowEnabled: false,
    attributes: { resource_url: uri, 'standard.token.exchange.enabled': String(enabled) },
    protocolMappers: [subjectMapper], defaultClientScopes: [read, write, 'hidden-marker'] });
  return { realm: 'qualification', enabled: true, sslRequired: 'none', registrationAllowed: false,
    resetPasswordAllowed: false, rememberMe: false, accessTokenLifespan: 60,
    roles: { client: { [api]: [{ name: 'read' }, { name: 'write' }] } },
    users: [{ username: 'synthetic-user', enabled: true, emailVerified: true,
      firstName: 'Synthetic', lastName: 'Qualification', email: 'synthetic@example.invalid',
      credentials: [{ type: 'password', value: password, temporary: false }],
      clientRoles: { [api]: ['read', 'write'] } }],
    clients: [{ ...base, clientId: 'reference-public', publicClient: true, consentRequired: true,
      standardFlowEnabled: true, redirectUris: [redirect],
      attributes: { 'pkce.code.challenge.method': 'S256' },
      protocolMappers: [subjectMapper, audience(mcp)] },
    resource(mcp, true, exchangeSecret), resource(api, false, secret()),
    { ...resource('unauthorized-client', false, otherSecret), defaultClientScopes: [] }],
    clientScopes: [read, write].map((name, index) => ({ name, protocol: 'openid-connect',
      attributes: { 'include.in.token.scope': 'true', 'display.on.consent.screen': 'true',
        'consent.screen.text': index ? 'Synthetic write permission' : 'Synthetic read permission' },
      protocolMappers: [audience(mcp), audience(api), {
        name: 'api-roles', protocol: 'openid-connect', protocolMapper: 'oidc-usermodel-client-role-mapper',
        config: { 'usermodel.clientRoleMapping.clientId': api,
          'claim.name': 'api_roles', 'jsonType.label': 'String',
          multivalued: 'true', 'access.token.claim': 'true', 'id.token.claim': 'false' }
      }] })).concat([{ name: 'hidden-marker', protocol: 'openid-connect',
      attributes: { 'include.in.token.scope': 'false' }, protocolMappers: [{ name: 'marker',
        protocol: 'openid-connect', protocolMapper: 'oidc-hardcoded-claim-mapper',
        config: { 'claim.name': 'synthetic_marker', 'claim.value': 'qualification-only',
          'jsonType.label': 'String', 'access.token.claim': 'true', 'id.token.claim': 'false' } }] }]),
    clientScopeMappings: { [api]: [{ clientScope: read, roles: ['read'] },
      { clientScope: write, roles: ['write'] }] },
    clientProfiles: { profiles: [{ name: 'strict-downscope', executors: [
      { executor: 'downscope-assertion-grant-enforcer', configuration: {} }
    ] }] },
    clientPolicies: { policies: [{ name: 'downscope-all-exchanges', enabled: true,
      conditions: [{ condition: 'grant-type', configuration: { 'grant-types': [grant] } }],
      profiles: ['strict-downscope'] }] }
  };
}

async function main() {
  assert.equal(process.version, 'v24.22.1', 'Use the repository Node version');
  const { jwtVerify, createRemoteJWKSet } = await import('jose');
  const project = 'calovibe-authq-' + randomBytes(6).toString('hex');
  const seedDir = path.join(reportDir, project);
  assert.equal(path.dirname(seedDir), reportDir);
  assert.match(path.basename(seedDir), /^calovibe-authq-[a-f0-9]{12}$/);
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 300_000);
  let server, browser, composeStarted = false;
  let writes = 0;
  let jwks, issuer, mcp, api;
  const env = { ...process.env, AQ_DB_PASSWORD: secret(), AQ_UID: String(process.getuid?.() ?? 1000), AQ_SEED_DIR: seedDir.replaceAll('\\', '/') };
  const docker = (args, cleanup = false) => run('docker', args, { cwd: root, env,
    timeout: cleanup ? 60_000 : 180_000, maxBuffer: 2 * 1024 * 1024,
    ...(cleanup ? {} : { signal: controller.signal }) });
  const composeArgs = ['compose', '-p', project, '-f', path.join(__dirname, 'compose.yml')];
  const compose = (args, cleanup = false) => docker([...composeArgs, ...args], cleanup);
  const boundedFetch = (url, options = {}) => fetch(url, { ...options,
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
  async function verify(token, audience) {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience, algorithms: ['RS256'],
      requiredClaims: ['sub', 'aud', 'exp', 'iat'] });
    assert.deepEqual(Array.isArray(payload.aud) ? payload.aud : [payload.aud], [audience], 'Exclusive URI audience');
    return payload;
  }
  try {
    await fs.mkdir(seedDir, { recursive: true });
    report.phase = 'docker-version';
    report.docker = (await docker(['version', '--format', '{{.Server.Version}}'])).stdout.trim();
    report.compose = (await docker(['compose', 'version', '--short'])).stdout.trim();
    server = http.createServer(async (req, res) => {
      if (req.url.startsWith('/callback')) { res.end('Synthetic OAuth callback received.'); return; }
      const audience = req.url === '/mcp' ? mcp : req.url === '/api' ? api : undefined;
      if (!audience) { res.writeHead(404).end(); return; }
      let claims;
      try { claims = await verify((req.headers.authorization || '').replace(/^Bearer /, ''), audience); }
      catch { res.writeHead(401).end(); return; }
      const required = req.method === 'POST' ? write : read;
      if (!scopes(claims).includes(required)) { res.writeHead(403).end(); return; }
      if (req.method === 'POST') writes++;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ sub: claims.sub, writes }));
    });
    const apiPort = await listen(server);
    const origin = 'http://127.0.0.1:' + apiPort;
    mcp = origin + '/mcp'; api = origin + '/api';
    const redirect = origin + '/callback';
    const portReservation = http.createServer();
    env.AQ_PORT = String(await listen(portReservation));
    await close(portReservation);
    env.AQ_ORIGIN = 'http://127.0.0.1:' + env.AQ_PORT;
    issuer = env.AQ_ORIGIN + '/realms/qualification';
    const password = secret(), exchangeSecret = secret(), otherSecret = secret();
    const seed = realmSeed({ mcp, api, redirect, password, exchangeSecret, otherSecret });
    await fs.writeFile(path.join(seedDir, 'qualification-realm.json'), JSON.stringify(seed), { mode: 0o600 });
    report.resourceUris = { mcp, api };
    report.phase = 'image-pull';
    await compose(['pull']);
    composeStarted = true;
    report.phase = 'compose-up';
    await compose(['up', '-d', '--wait', '--wait-timeout', '90']);
    const ids = (await compose(['ps', '-q'])).stdout.trim().split(/\s+/);
    assert.equal(ids.length, 2);
    const containers = JSON.parse((await docker(['inspect', ...ids])).stdout);
    for (const container of containers) {
      assert.equal(container.Config.Labels['com.docker.compose.project'], project);
      assert.ok(container.HostConfig.Memory > 0 && container.HostConfig.NanoCpus > 0);
      for (const bindings of Object.values(container.HostConfig.PortBindings || {}))
        for (const binding of bindings || []) assert.equal(binding.HostIp, '127.0.0.1');
    }
    const pg = containers.find(item => item.Config.Labels['com.docker.compose.service'] === 'postgres');
    assert.deepEqual(pg.HostConfig.PortBindings || {}, {});
    report.images = containers.map(item => ({ image: item.Config.Image, id: item.Image }));
    report.keycloak = (await compose(['exec', '-T', 'keycloak', '/opt/keycloak/bin/kc.sh', '--version'])).stdout.trim();
    report.postgres = (await compose(['exec', '-T', 'postgres', 'postgres', '--version'])).stdout.trim();
    assert.match(report.keycloak, /Keycloak 26\.8\.1/);
    assert.match(report.postgres, /18\.6/);
    pass('AQ02: two bounded containers; PostgreSQL private; host bindings loopback');
    if (process.argv.includes('--failure-cleanup')) {
      const injected = new Error('Deliberate failure after Docker startup');
      injected.code = 'AQ_EXPECTED_FAILURE';
      throw injected;
    }
    report.phase = 'discovery';
    let metadata;
    for (let attempt = 0; attempt < 90; attempt++) {
      controller.signal.throwIfAborted();
      try {
        const response = await boundedFetch(issuer + '/.well-known/openid-configuration');
        if (response.ok) { metadata = await response.json(); break; }
      } catch { /* Startup only; the global deadline still applies. */ }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.ok(metadata, 'Keycloak readiness bounded at 90 seconds');
    assert.equal(metadata.issuer, issuer);
    metadata = await discoverAuthorizationServerMetadata(new URL(issuer), { fetchFn: boundedFetch });
    assert.equal(metadata.issuer, issuer);
    assert.ok(metadata.code_challenge_methods_supported.includes('S256'));
    for (const endpoint of ['authorization_endpoint', 'token_endpoint', 'jwks_uri'])
      assert.equal(new URL(metadata[endpoint]).origin, env.AQ_ORIGIN);
    jwks = createRemoteJWKSet(new URL(metadata.jwks_uri), { timeoutDuration: 5000 });
    pass('AQ04: SDK discovery; exact issuer and loopback endpoints; PKCE S256');
    browser = await chromium.launch({ headless: true });
    const clientInformation = { client_id: 'reference-public', token_endpoint_auth_method: 'none' };
    async function authorize(scope = read, resource = mcp) {
      const state = secret();
      const pending = await startAuthorization(issuer, { metadata, clientInformation,
        redirectUrl: redirect, scope, state, resource: new URL(resource) });
      assert.equal(pending.authorizationUrl.searchParams.get('code_challenge_method'), 'S256');
      const context = await browser.newContext();
      context.setDefaultTimeout(15_000);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return [env.AQ_ORIGIN, origin].includes(url.origin) ? route.continue() : route.abort();
      });
      try {
        const page = await context.newPage();
        report.browserStep = 'login-form';
        await page.goto(pending.authorizationUrl.href);
        await page.locator('#username').fill('synthetic-user');
        await page.locator('#password').fill(password);
        await page.locator('#kc-login').click();
        report.browserStep = 'consent-or-callback';
        await Promise.race([page.waitForURL(url => url.href.startsWith(redirect)),
          page.locator('[name="accept"]').waitFor({ state: 'visible' })]);
        if (!page.url().startsWith(redirect)) {
          assert.ok((await page.locator('body').innerText()).includes('Synthetic read permission'));
          report.explicitConsentShown = true;
          await page.locator('[name="accept"]').click();
        }
        report.browserStep = 'callback';
        await page.waitForURL(url => url.href.startsWith(redirect));
        const callback = new URL(page.url());
        assert.equal(callback.searchParams.get('state'), state);
        assert.equal(callback.searchParams.get('iss'), issuer);
        assert.ok(callback.searchParams.get('code'));
        return { authorizationCode: callback.searchParams.get('code'), iss: callback.searchParams.get('iss'),
          codeVerifier: pending.codeVerifier, redirectUri: redirect, resource: new URL(resource),
          metadata, clientInformation, fetchFn: boundedFetch };
      } finally { await context.close(); }
    }
    report.phase = 'browser-pkce';
    const auth = await authorize();
    let incoming = await exchangeAuthorization(issuer, auth);
    let initial = await verify(incoming.access_token, mcp);
    assert.ok(scopes(initial).includes(read));
    assert.ok(!scopes(initial).includes(write));
    pass('AQ04/05: real browser consent and Code/PKCE; signed MCP-only URI token');
// A replay intentionally invalidates its client session in Keycloak; isolate it from the nominal subject.
    const replayAuth = await authorize();
    await exchangeAuthorization(issuer, replayAuth);
    await assert.rejects(exchangeAuthorization(issuer, replayAuth));
    const badVerifier = await authorize();
    await assert.rejects(exchangeAuthorization(issuer, { ...badVerifier, codeVerifier: secret() }));
    const changedResource = await authorize();
    await assert.rejects(exchangeAuthorization(issuer, { ...changedResource, resource: new URL(api) }));
    pass('AQ04: reused code, incorrect PKCE verifier and changed token-request resource rejected');
    const previousSubject = initial.sub;
    const freshGrant = await authorize();
    const freshIncoming = await exchangeAuthorization(issuer, freshGrant);
    assert.ok(freshIncoming.access_token !== incoming.access_token, 'New grant emits a different token');
    incoming = freshIncoming;
    initial = await verify(incoming.access_token, mcp);
    assert.equal(initial.sub, previousSubject);
    assert.ok(scopes(initial).includes(read) && !scopes(initial).includes(write));
    pass('AQ04: fresh nominal Code/PKCE grant after replay and negative flows');
    async function exchange(subject, parameters = {}) {
      const { clientId = mcp, clientSecret = exchangeSecret, audience = api, scope = read } = parameters;
      const body = new URLSearchParams({ grant_type: grant, client_id: clientId, client_secret: clientSecret,
        subject_token: subject, subject_token_type: accessType, requested_token_type: accessType, audience });
      if (scope !== null) body.set('scope', scope);
      const response = await boundedFetch(metadata.token_endpoint, { method: 'POST', body });
      const json = await response.json();
      report.lastExchange = { status: response.status, error: json.error };
      return { status: response.status, json };
    }
    report.phase = 'token-exchange';
    const downstream = await exchange(incoming.access_token);
    assert.equal(downstream.status, 200, 'Nominal exchange status; details are intentionally redacted');
    const issued = await verify(downstream.json.access_token, api);
    assert.equal(issued.sub, initial.sub);
    report.nominalExchange = { incomingScopes: scopes(initial), issuedScopes: scopes(issued),
      apiRoles: issued.api_roles || [], sameSubject: issued.sub === initial.sub };
    assert.deepEqual(scopes(issued), [read], 'Exact downstream scopes: ' + JSON.stringify(scopes(issued)));
    assert.equal(issued.synthetic_marker, 'qualification-only');
    assert.ok(!(issued.api_roles || []).includes('write'));
    pass('AQ05/06: native exchange preserves sub; API-only URI audience; scope and role downscoped');
    async function call(route, token, method = 'GET') {
      return boundedFetch(route, { method, headers: token ? { authorization: 'Bearer ' + token } : {} });
    }
    assert.equal((await call(api, downstream.json.access_token)).status, 200);
    assert.equal((await call(mcp, incoming.access_token)).status, 200);
    for (const [route, token] of [[api, incoming.access_token], [mcp, downstream.json.access_token],
      [api, undefined], [api, 'invalid'], [api, downstream.json.access_token.slice(0, -12) + 'invalidsuffix']]) {
      assert.equal((await call(route, token, 'POST')).status, 401);
      assert.equal(writes, 0);
    }
    assert.equal((await call(api, downstream.json.access_token, 'POST')).status, 403);
    assert.equal(writes, 0);
    pass('AQ07: wrong audience/signature/missing token -> 401; read-only write -> 403; zero effects');
    for (const parameters of [{ scope: write }, { scope: read + ' ' + write },
      { audience: origin + '/unknown' }, { clientId: 'unauthorized-client', clientSecret: otherSecret },
      { clientSecret: secret() }]) {
      const denied = await exchange(incoming.access_token, parameters);
      assert.ok(denied.status >= 400 && denied.status < 500);
      assert.ok(!denied.json.access_token);
      assert.equal(writes, 0);
    }
    pass('AQ06/07: unconsented write, invalid audience/client/secret denied without effects');
    const defaults = await exchange(incoming.access_token, { scope: null });
    assert.equal(defaults.status, 200);
    const defaultClaims = await verify(defaults.json.access_token, api);
    assert.ok(!scopes(defaultClaims).includes(write), 'Default write scope must be removed');
    assert.ok(!(defaultClaims.api_roles || []).includes('write'));
    assert.equal((await call(api, defaults.json.access_token, 'POST')).status, 403);
    assert.equal(writes, 0);
    pass('AQ06: omitted scopes and default write mapper cannot regain write');
    const writeAuth = await authorize(read + ' ' + write);
    const writeIncoming = await exchangeAuthorization(issuer, writeAuth);
    const writeInitial = await verify(writeIncoming.access_token, mcp);
    assert.ok(scopes(writeInitial).includes(write));
    const allowed = await exchange(writeIncoming.access_token, { scope: read + ' ' + write });
    assert.equal(allowed.status, 200);
    const writeClaims = await verify(allowed.json.access_token, api);
    assert.equal(writeClaims.sub, initial.sub);
    assert.equal((await call(api, allowed.json.access_token, 'POST')).status, 200);
    assert.equal(writes, 1);
    pass('AQ06: explicit write consent permits exactly one protected synthetic API effect');
    const wrongSubjectAudience = await exchange(downstream.json.access_token);
    assert.ok(wrongSubjectAudience.status >= 400 && !wrongSubjectAudience.json.access_token);
    assert.equal(writes, 1);
    pass('AQ07: API-audience subject cannot be reused by the MCP exchanger');
    const altered = incoming.access_token.slice(0, -12) + 'invalidsuffix';
    const badSubject = await exchange(altered);
    assert.ok(badSubject.status >= 400 && !badSubject.json.access_token);
    const expiresIn = Math.max(initial.exp, issued.exp) * 1000 - Date.now() + 2000;
    assert.ok(expiresIn < 65_000, 'Fixture expiry remains bounded');
    if (expiresIn > 0) await new Promise(resolve => setTimeout(resolve, expiresIn));
    const expired = await exchange(incoming.access_token);
    assert.ok(expired.status >= 400 && !expired.json.access_token);
    assert.equal((await call(api, downstream.json.access_token, 'POST')).status, 401);
    assert.equal(writes, 1);
    pass('AQ07: tampered and actually expired subjects rejected; no additional API effects');
    report.qualified = true;
  } catch (error) {
    if (process.argv.includes('--failure-cleanup') && error.code === 'AQ_EXPECTED_FAILURE') {
      report.failureInjectionVerified = true;
      pass('AQ08: deliberate failure after startup reaches cleanup');
    } else {
      report.failedPhase = report.phase;
      report.failure = { name: error.name, code: error.code, claim: error.claim };
      throw error;
    }
  } finally {
    clearTimeout(deadline);
    const localCleanup = await Promise.allSettled([
      browser?.close(), server?.listening ? close(server) : undefined
    ]);
    try {
      if (composeStarted) {
        await compose(['down', '--volumes', '--remove-orphans', '--timeout', '10'], true);
        for (const type of ['container', 'volume', 'network']) {
          const args = type === 'container' ? ['ps', '-aq'] : [type, 'ls', '-q'];
          const remaining = await docker([...args, '--filter', 'label=com.docker.compose.project=' + project], true);
          assert.equal(remaining.stdout.trim(), '', 'Only this project must be fully cleaned: ' + type);
        }
      }
      await fs.rm(seedDir, { recursive: true, force: true });
      assert.ok(localCleanup.every(result => result.status === 'fulfilled'), 'Browser and HTTP server cleanup');
      report.cleanup = true;
      pass(composeStarted ? 'AQ08: project containers/volumes/network absent; synthetic seed removed' : 'AQ08: no Docker project started; synthetic seed removed');
    } finally {
      report.apiWriteCounter = writes;
      await fs.mkdir(reportDir, { recursive: true });
      await fs.writeFile(path.join(reportDir, process.argv.includes('--failure-cleanup') ? 'report-failure-cleanup.json' : 'report.json'), JSON.stringify(report, null, 2) + '\n');
    }
  }
}
main().catch(error => {
  // Never print OAuth response bodies, commands containing credentials, or browser URLs with codes.
  console.error('AUTH QUALIFICATION FAILED:', error.name, error.code || '',
    error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'See last named assertion; sensitive details withheld.');
  process.exitCode = 1;
});
