const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const base = { issuer: 'https://identity.example.invalid/realms/test',
  jwksUrl: 'https://identity.example.invalid/realms/test/protocol/openid-connect/certs',
  tokenEndpoint: 'https://identity.example.invalid/realms/test/protocol/openid-connect/token',
  mcpResource: 'https://calovibe.example.invalid/mcp', apiResource: 'https://calovibe.example.invalid/api',
  apiBaseUrl: 'http://backend:3001', clientId: 'https://calovibe.example.invalid/mcp', clientSecret: 'TEST-SECRET',
  ownerSubject: 'test-owner', version: 'a'.repeat(40), host: '127.0.0.1', port: 0, timeoutMs: 100 };

test('configuration is fixed, distinct, HTTPS and bounded; private API HTTP is explicit', async () => {
  const { validateConfig } = await import('../dist/config.js');
  assert.deepEqual(validateConfig(base), base);
  assert.equal(Object.isFrozen(validateConfig(base)), true);
  for (const overrides of [
    { issuer: 'http://identity.example.invalid/realm' }, { mcpResource: 'http://public.invalid/mcp' },
    { tokenEndpoint: 'https://foreign.invalid/token' }, { jwksUrl: 'https://foreign.invalid/jwks' },
    { apiResource: base.mcpResource }, { apiResource: 'https://public.invalid/api#fragment' },
    { apiBaseUrl: 'http://user:secret@backend:3001' }, { apiBaseUrl: 'http://backend:3001/?access_token=TEST' },
    { apiBaseUrl: 'http://backend:3001/free-path' }, { mcpResource: 'https://public.invalid/other' },
    { ownerSubject: '' }, { clientSecret: '' }, { clientId: '' }, { version: 'latest' },
    { port: -1 }, { port: 65536 }, { port: 1.5 }, { timeoutMs: 0 }, { timeoutMs: 30001 }
  ]) assert.throws(() => validateConfig({ ...base, ...overrides }));
});
test('secrets and owner subject load only from files; values never appear in errors', async t => {
  const { loadConfig } = await import('../dist/config.js');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'calovibe-mcp-config-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const secret = path.join(directory, 'client-secret');
  const owner = path.join(directory, 'owner-subject');
  await fs.writeFile(secret, 'TEST-FILE-SECRET\n');
  await fs.writeFile(owner, 'TEST-FILE-OWNER\n');
  const env = { MCP_ISSUER: base.issuer, MCP_JWKS_URL: base.jwksUrl, MCP_TOKEN_ENDPOINT: base.tokenEndpoint,
    MCP_RESOURCE: base.mcpResource, MCP_API_RESOURCE: base.apiResource, MCP_API_BASE_URL: base.apiBaseUrl,
    MCP_CLIENT_ID: base.clientId, MCP_CLIENT_SECRET_FILE: secret, MCP_OWNER_SUBJECT_FILE: owner, APP_VERSION: base.version };
  const config = await loadConfig(env);
  assert.equal(config.clientSecret, 'TEST-FILE-SECRET');
  assert.equal(config.ownerSubject, 'TEST-FILE-OWNER');
  assert.equal(config.port, 3002);
  await assert.rejects(loadConfig({ ...env, MCP_CLIENT_SECRET_FILE: '' }));
  await assert.rejects(loadConfig({ ...env, MCP_ISSUER: '' }));
  await fs.writeFile(secret, '');
  await assert.rejects(loadConfig(env), error => {
    assert.doesNotMatch(error.message, /TEST-FILE|client-secret/);
    return true;
  });
});
test('real main fails closed without configuration and redacts errors', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../dist/main.js')], {
    env: { APP_VERSION: base.version, MCP_ISSUER: 'sensitive-test-issuer' }, encoding: 'utf8'
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Démarrage MCP impossible/);
  assert.doesNotMatch(result.stderr + result.stdout, /sensitive-test-issuer|TEST-SECRET|owner/);
});
