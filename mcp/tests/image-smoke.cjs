// CI Linux image smoke. It deliberately does not qualify Keycloak/API integration.
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const run = promisify(execFile);
const [image, version] = process.argv.slice(2);
assert.ok(image && /^[a-f0-9]{40}$/.test(version ?? ''), 'Usage: node mcp/tests/image-smoke.cjs image commit-sha');
const name = `calovibe-mcp-smoke-${randomBytes(6).toString('hex')}`;
const secret = randomBytes(24).toString('hex');
const subject = randomBytes(24).toString('hex');
let directory, started = false;
const docker = async args => (await run('docker', args, { timeout: 30000, maxBuffer: 1024 * 1024 })).stdout.trim();

async function main() {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'calovibe-mcp-image-'));
  await fs.writeFile(path.join(directory, 'client-secret'), secret, { mode: 0o444 });
  await fs.writeFile(path.join(directory, 'owner-subject'), subject, { mode: 0o444 });
  await fs.chmod(directory, 0o555);
  const metadata = JSON.parse(await docker(['image', 'inspect', image]))[0];
  assert.equal(metadata.Config.User, 'node');
  assert.equal(metadata.Config.Labels['org.opencontainers.image.revision'], version);
  assert.ok(metadata.Config.Healthcheck.Test.join(' ').includes('/health/ready'));
  await docker(['run', '--detach', '--name', name, '--read-only', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges', '--publish', '127.0.0.1::3002',
    '--mount', `type=bind,source=${directory},target=/run/secrets,readonly`,
    '--env', 'MCP_ISSUER=https://authority.example.invalid/realms/smoke',
    '--env', 'MCP_JWKS_URL=https://authority.example.invalid/realms/smoke/certs',
    '--env', 'MCP_TOKEN_ENDPOINT=https://authority.example.invalid/realms/smoke/token',
    '--env', 'MCP_RESOURCE=https://calovibe.example.invalid/mcp',
    '--env', 'MCP_API_RESOURCE=https://calovibe.example.invalid/api',
    '--env', 'MCP_API_BASE_URL=http://127.0.0.1:1', '--env', 'MCP_TIMEOUT_MS=100',
    '--env', 'MCP_CLIENT_ID=https://calovibe.example.invalid/mcp',
    '--env', 'MCP_CLIENT_SECRET_FILE=/run/secrets/client-secret',
    '--env', 'MCP_OWNER_SUBJECT_FILE=/run/secrets/owner-subject', image]);
  started = true;
  const mapping = await docker(['port', name, '3002/tcp']);
  assert.match(mapping, /^127\.0\.0\.1:\d+$/);
  const origin = `http://${mapping}`;
  const deadline = Date.now() + 10000;
  let live;
  while (Date.now() < deadline) {
    try {
      live = await fetch(`${origin}/health/live`, { signal: AbortSignal.timeout(1000) });
      if (live.status === 200) break;
    } catch { /* Wait only for this newly created container's listener. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(live?.status, 200);
  assert.deepEqual(await live.json(), { status: 'live' });
  assert.equal((await fetch(`${origin}/health/ready`, { signal: AbortSignal.timeout(3000) })).status, 503);
  const refusal = await fetch(`${origin}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(refusal.status, 401);
  assert.match(refusal.headers.get('www-authenticate'), /oauth-protected-resource\/mcp/);
  assert.deepEqual(await (await fetch(`${origin}/.well-known/oauth-protected-resource/mcp`)).json(), {
    resource: 'https://calovibe.example.invalid/mcp', authorization_servers: ['https://authority.example.invalid/realms/smoke'],
    scopes_supported: ['calovibe:read'], bearer_methods_supported: ['header']
  });
  await docker(['exec', name, 'node', '--input-type=module', '-e', `
    import assert from 'node:assert/strict'; import fs from 'node:fs'; import {createRequire} from 'node:module';
    const require=createRequire('/app/mcp/package.json');
    for(const name of ['@modelcontextprotocol/server','@modelcontextprotocol/node','jose']) assert.ok(require.resolve(name));
    for(const name of ['typescript','@modelcontextprotocol/client','pg']) assert.throws(()=>require.resolve(name));
    for(const name of ['/app/backend/src','/app/web/src','/app/mcp/src','/app/mcp/tests','/app/shared','/app/scripts']) assert.equal(fs.existsSync(name),false);
    assert.equal(process.env.APP_VERSION,${JSON.stringify(version)});
  `]);
  const history = await docker(['history', '--no-trunc', '--format', '{{.CreatedBy}}', image]);
  assert.ok(!history.includes(secret) && !history.includes(subject));
  await docker(['stop', '--time', '10', name]);
  const state = JSON.parse(await docker(['inspect', name]))[0].State;
  assert.equal(state.ExitCode, 0);
  assert.equal(state.OOMKilled, false);
  const logs = await docker(['logs', name]);
  assert.match(logs, /MCP démarré/);
  assert.match(logs, /MCP arrêté/);
  assert.ok(!logs.includes(secret) && !logs.includes(subject));
  console.log('PASS MCP image: SHA, production workspace, no source/fixtures/SQL, live401, ready503, secrets, SIGTERM.');
}
main().catch(() => {
  console.error('MCP image smoke failed; inspect the isolated CI container without printing secrets.');
  process.exitCode = 1;
}).finally(async () => {
  if (started) await docker(['rm', '--force', name]);
  if (directory) {
    assert.equal(path.dirname(directory), os.tmpdir());
    await fs.chmod(directory, 0o700);
    await fs.rm(directory, { recursive: true, force: true });
  }
});
