// JWKS, exchange and API below are HTTP test doubles, never production dependencies.
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const http = require('node:http');
const { once } = require('node:events');
const { URLSearchParams } = require('node:url');
const { Client, StreamableHTTPClientTransport } = require('@modelcontextprotocol/client');
const version = 'a'.repeat(40);
const read = 'calovibe:read';
const access = 'urn:ietf:params:oauth:token-type:access_token';
let jose, privateKey, publicJwk, otherKey, dependency, service, origin, resource, config;
let mode = 'nominal', exchangeCalls = [], apiCalls = [], lastApiToken;
let incoming;

async function sign(overrides = {}, key = privateKey, header = {}) {
  return new jose.SignJWT({ scope: read, azp: 'reference-public', ...overrides })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key', ...header })
    .setIssuer(config.issuer).setSubject('test-owner').setAudience(resource)
    .setIssuedAt().setExpirationTime('2m').sign(key);
}
async function token(overrides = {}, key = privateKey) {
  const now = Math.floor(Date.now() / 1000);
  return new jose.SignJWT({ iss: config.issuer, sub: 'test-owner', aud: resource, iat: now,
    exp: now + 120, azp: 'reference-public', scope: read, ...overrides })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).sign(key);
}
const json = (res, status, value) => { res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(value)); };
const count = () => [exchangeCalls.length, apiCalls.length];
async function request(credential, options = {}) {
  return fetch(`${origin}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json',
    ...(credential ? { authorization: `Bearer ${credential}` } : {}), ...options.headers },
  body: '{}', ...options, signal: AbortSignal.timeout(3000) });
}
async function connect(t, credential = incoming, wire = []) {
  const client = new Client({ name: 'real-runtime-test', version: '0.1.0' }, {
    versionNegotiation: { mode: { pin: '2026-07-28' } }
  });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), {
    requestInit: { headers: { authorization: `Bearer ${credential}` } }, onInsufficientScope: 'throw',
    async fetch(url, init) {
      const response = await fetch(url, init);
      wire.push({ status: response.status, challenge: response.headers.get('www-authenticate') });
      return response;
    }
  }), { timeout: 3000 });
  return client;
}

before(async () => {
  jose = await import('jose');
  const pair = await jose.generateKeyPair('RS256');
  privateKey = pair.privateKey;
  publicJwk = { ...await jose.exportJWK(pair.publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
  otherKey = (await jose.generateKeyPair('RS256')).privateKey;
  dependency = http.createServer(async (req, res) => {
    if (req.url === '/issuer/jwks') return json(res, 200, { keys: mode === 'empty-jwks' ? [] : [publicJwk] });
    if (req.url === '/issuer/.well-known/openid-configuration') return json(res, 200,
      { issuer: mode === 'wrong-metadata' ? 'https://wrong.invalid' : config.issuer, jwks_uri: config.jwksUrl, token_endpoint: config.tokenEndpoint });
    if (req.url === '/health/ready') return json(res, mode === 'unready' ? 503 : 200, {});
    if (req.url === '/issuer/token') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = new URLSearchParams(Buffer.concat(chunks).toString());
      exchangeCalls.push(body);
      if (mode === 'exchange-hang') return;
      if (mode === 'exchange-large') return json(res, 200, { value: 'x'.repeat(70000) });
      if (mode === 'exchange-refused') return json(res, 403, { error: 'sensitive-test-detail' });
      if (mode === 'exchange-redirect') return res.writeHead(302, { location: '/api/_technical/status' }).end();
      if (mode === 'exchange-invalid-json') return res.writeHead(200, { 'content-type': 'application/json' }).end('{');
      if (mode === 'exchange-passthrough') return json(res, 200, { token_type: 'Bearer', issued_token_type: access, access_token: body.get('subject_token') });
      const payload = { aud: config.apiResource, azp: config.clientId, api_roles: ['read'] };
      if (mode === 'downstream-audience') payload.aud = resource;
      if (mode === 'downstream-multiple-audiences') payload.aud = [config.apiResource, resource];
      if (mode === 'downstream-subject') payload.sub = 'other-owner';
      if (mode === 'downstream-client') payload.azp = 'other-client';
      if (mode === 'downstream-scope') payload.scope = `${read} calovibe:write`;
      if (mode === 'downstream-role') payload.api_roles = ['read', 'write'];
      if (mode === 'downstream-missing-role') delete payload.api_roles;
      if (mode === 'downstream-issuer') payload.iss = 'https://wrong.invalid';
      if (mode === 'downstream-expired') payload.exp = Math.floor(Date.now() / 1000) - 10;
      const delegated = await token(payload, mode === 'downstream-signature' ? otherKey : privateKey);
      return json(res, mode === 'exchange-201' ? 201 : 200, { token_type: mode === 'exchange-wrong-type' ? 'ID' : 'Bearer',
        issued_token_type: access, access_token: delegated });
    }
    if (req.url === '/api/_technical/status') {
      apiCalls.push({ method: req.method, authorization: req.headers.authorization });
      lastApiToken = req.headers.authorization?.slice(7);
      if (mode === 'api-hang') return;
      if (mode === 'api-disconnect') return req.socket.destroy();
      if (mode === 'api-redirect') return res.writeHead(302, { location: '/health/ready' }).end();
      if (mode === 'api-large') return json(res, 200, { value: 'x'.repeat(70000) });
      if (mode === 'api-invalid-json') return res.writeHead(200, { 'content-type': 'application/json' }).end('{');
      if (mode === 'api-401' || mode === 'api-403' || mode === 'api-500') return json(res, Number(mode.slice(4)), { detail: 'sensitive-test-detail' });
      return json(res, mode === 'api-201' ? 201 : 200, mode === 'api-invalid' ? { status: 'ready' } : { schemaVersion: '0.1.0', status: 'ready', version });
    }
    res.writeHead(404).end();
  });
  dependency.listen(0, '127.0.0.1');
  await once(dependency, 'listening');
  const dependencyOrigin = `http://127.0.0.1:${dependency.address().port}`;
  resource = 'http://127.0.0.1:3002/mcp'; // stable audience; HTTP listener uses an independent random port.
  config = { issuer: `${dependencyOrigin}/issuer`, jwksUrl: `${dependencyOrigin}/issuer/jwks`,
    tokenEndpoint: `${dependencyOrigin}/issuer/token`, mcpResource: resource,
    apiResource: `${dependencyOrigin}/api`, apiBaseUrl: dependencyOrigin, clientId: resource,
    clientSecret: 'TEST-ONLY-SECRET', ownerSubject: 'test-owner', version, host: '127.0.0.1', port: 0, timeoutMs: 150 };
  service = await (await import('../dist/server.js')).startServer(config);
  origin = `http://127.0.0.1:${service.address.port}`;
  incoming = await sign();
});
after(async () => {
  await service?.close();
  if (dependency?.listening) {
    const closed = new Promise(resolve => dependency.close(resolve));
    dependency.closeAllConnections();
    await closed;
  }
});

test('live, readiness and RFC9728 discovery are honest and minimal', async () => {
  const before = count();
  assert.deepEqual(await (await fetch(`${origin}/health/live`)).json(), { status: 'live' });
  assert.equal((await fetch(`${origin}/health/ready`)).status, 200);
  for (const failure of ['unready', 'wrong-metadata', 'empty-jwks']) {
    mode = failure;
    assert.equal((await fetch(`${origin}/health/ready`)).status, 503);
  }
  mode = 'nominal';
  const response = await request();
  assert.equal(response.status, 401);
  assert.match(response.headers.get('www-authenticate'), /resource_metadata=.*oauth-protected-resource\/mcp/);
  assert.match(response.headers.get('www-authenticate'), /scope="calovibe:read"/);
  const discovery = await (await fetch(`${origin}/.well-known/oauth-protected-resource/mcp`)).json();
  assert.deepEqual(discovery, { resource, authorization_servers: [config.issuer], scopes_supported: [read], bearer_methods_supported: ['header'] });
  assert.deepEqual(count(), before);
});

const invalidTokens = {
  'API audience': () => token({ aud: config.apiResource }),
  'combined audiences': () => token({ aud: [resource, config.apiResource] }),
  'issuer': () => token({ iss: 'https://wrong.invalid' }),
  'signature': () => token({}, otherKey),
  'expired': () => token({ exp: Math.floor(Date.now() / 1000) - 1 }),
  'future not-before': () => token({ nbf: Math.floor(Date.now() / 1000) + 60 }),
  'future issued-at': () => token({ iat: Math.floor(Date.now() / 1000) + 60 }),
  'missing expiration': () => token({ exp: undefined }),
  'missing subject': () => token({ sub: undefined }),
  'malformed': async () => 'not-a-jwt'
};
for (const [name, credential] of Object.entries(invalidTokens)) {
  test(`incoming ${name}: 401 before exchange and API`, async () => {
    const before = count();
    assert.equal((await request(await credential())).status, 401);
    assert.deepEqual(count(), before);
  });
}
for (const [name, claims] of Object.entries({ 'other owner': { sub: 'other-owner' }, 'write only': { scope: 'calovibe:write' }, 'no scopes': { scope: '' } })) {
  test(`incoming ${name}: 403 before exchange and API`, async () => {
    const before = count();
    const response = await request(await token(claims));
    assert.equal(response.status, 403);
    assert.match(response.headers.get('www-authenticate'), /insufficient_scope/);
    assert.deepEqual(count(), before);
  });
}
test('query token, cookie and foreign origin refused without downstream calls', async () => {
  const before = count();
  assert.equal((await fetch(`${origin}/mcp?access_token=TEST`)).status, 400);
  assert.equal((await request(incoming, { headers: { authorization: `Bearer ${incoming}`, cookie: 'session=TEST' } })).status, 400);
  assert.equal((await request(incoming, { headers: { origin: 'https://foreign.invalid' } })).status, 403);
  assert.deepEqual(count(), before);
});
test('foreign Host, malformed/oversized JSON and legacy are refused by the real wrapper', async () => {
  const before = count();
  const hostStatus = await new Promise((resolve, reject) => {
    const req = http.request(`${origin}/mcp`, { method: 'POST', headers: { host: 'foreign.invalid' } }, res => {
      res.resume(); res.once('end', () => resolve(res.statusCode));
    });
    req.setTimeout(1000, () => req.destroy(new Error('Test Host timeout.')));
    req.once('error', reject); req.end();
  });
  assert.equal(hostStatus, 403);
  for (const [body, status] of [['{', 400], [' '.repeat(65537), 413]]) {
    const response = await request(incoming, { body });
    assert.equal(response.status, status);
    await response.body?.cancel();
  }
  const response = await request(incoming, { body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'legacy-test', version: '0.1.0' } } }) });
  assert.notEqual(response.status, 200);
  assert.ok((await response.json()).error);
  assert.deepEqual(count(), before);
});
test('unavailable JWKS fails closed before exchange/API', async t => {
  const failed = await (await import('../dist/server.js')).startServer({ ...config, jwksUrl: `${config.issuer}/missing-jwks` });
  t.after(() => failed.close());
  const before = count();
  const response = await fetch(`http://127.0.0.1:${failed.address.port}/mcp`, { method: 'POST',
    headers: { authorization: `Bearer ${incoming}`, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 401);
  assert.deepEqual(count(), before);
});
test('only the real status tool is listed; invalid/unknown tool never calls downstream', async t => {
  const client = await connect(t);
  const before = count();
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map(tool => tool.name), ['calovibe_service_status']);
  assert.equal(tools.tools[0].inputSchema.additionalProperties, false);
  await assert.rejects(client.callTool({ name: 'calovibe_service_status', arguments: { url: 'http://foreign.invalid' } }));
  await assert.rejects(client.callTool({ name: 'journal_get_day', arguments: {} }));
  assert.deepEqual(count(), before);
});
test('real SDK HTTP request traverses native exchange and private API, preserving subject and downscoping', async t => {
  mode = 'nominal';
  const client = await connect(t, await token({ scope: `${read} calovibe:write` }));
  const before = count();
  const result = await client.callTool({ name: 'calovibe_service_status', arguments: {} });
  assert.deepEqual(result.structuredContent, { schemaVersion: '0.1.0', status: 'ready', version });
  assert.notEqual(result.isError, true);
  assert.deepEqual(count(), [before[0] + 1, before[1] + 1]);
  const body = exchangeCalls.at(-1);
  assert.deepEqual([...body.keys()].sort(), ['audience', 'client_id', 'client_secret', 'grant_type', 'requested_token_type', 'scope', 'subject_token', 'subject_token_type'].sort());
  assert.equal(body.get('grant_type'), 'urn:ietf:params:oauth:grant-type:token-exchange');
  assert.equal(body.get('scope'), read);
  assert.equal(body.get('audience'), config.apiResource);
  assert.equal(body.get('client_secret'), config.clientSecret);
  assert.notEqual(lastApiToken, body.get('subject_token'));
  const downstream = jose.decodeJwt(lastApiToken);
  assert.equal(downstream.sub, jose.decodeJwt(body.get('subject_token')).sub);
  assert.equal(downstream.aud, config.apiResource);
  assert.equal(downstream.scope, read);
  assert.deepEqual(downstream.api_roles, ['read']);
  assert.equal(apiCalls.at(-1).method, 'GET');
});
for (const failure of ['exchange-refused', 'exchange-redirect', 'exchange-invalid-json', 'exchange-passthrough', 'exchange-wrong-type', 'exchange-201', 'exchange-hang', 'exchange-large',
  'downstream-audience', 'downstream-multiple-audiences', 'downstream-subject', 'downstream-client', 'downstream-scope',
  'downstream-role', 'downstream-missing-role', 'downstream-issuer', 'downstream-expired', 'downstream-signature']) {
  test(`${failure}: honest error and zero API calls`, async t => {
    mode = failure;
    const client = await connect(t);
    const before = count();
    const result = await client.callTool({ name: 'calovibe_service_status', arguments: {} });
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined);
    assert.doesNotMatch(JSON.stringify(result), /sensitive-test-detail|TEST-ONLY-SECRET|eyJ/);
    assert.deepEqual(count(), [before[0] + 1, before[1]]);
  });
}
for (const failure of ['api-invalid', 'api-invalid-json', 'api-large', 'api-201', 'api-500', 'api-redirect', 'api-hang', 'api-disconnect']) {
  test(`${failure}: honest bounded failure without retry or synthetic success`, async t => {
    mode = failure;
    const client = await connect(t);
    const before = count();
    const result = await client.callTool({ name: 'calovibe_service_status', arguments: {} });
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined);
    assert.deepEqual(count(), [before[0] + 1, before[1] + 1]);
  });
}
for (const status of [401, 403]) {
  test(`API ${status} propagates transport authorization refusal`, async t => {
    mode = `api-${status}`;
    const wire = [];
    const client = await connect(t, incoming, wire);
    const before = count();
    await assert.rejects(client.callTool({ name: 'calovibe_service_status', arguments: {} }));
    assert.equal(wire.at(-1).status, status);
    assert.match(wire.at(-1).challenge, status === 401 ? /invalid_token/ : /insufficient_scope/);
    assert.deepEqual(count(), [before[0] + 1, before[1] + 1]);
  });
}
test('close aborts an in-flight dependency, is idempotent and stops the listener', async t => {
  mode = 'api-hang';
  const client = await connect(t);
  const before = apiCalls.length;
  const pending = client.callTool({ name: 'calovibe_service_status', arguments: {} }).then(
    result => ({ result }), error => ({ error })
  );
  const deadline = Date.now() + 2000;
  while (apiCalls.length === before && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(apiCalls.length, before + 1);
  await Promise.all([service.close(), service.close()]);
  const outcome = await pending;
  assert.ok(outcome.error || outcome.result?.isError);
  assert.equal(service.http.listening, false);
  await assert.rejects(fetch(`${origin}/health/live`));
});
