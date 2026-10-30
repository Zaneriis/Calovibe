const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('configuration fermée : secrets fichiers, URL HTTPS explicites et SHA exact', async t => {
  const { readConfig, readDatabase, trustedUrl } = await import('../dist/config.js');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'calovibe-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'database.json');
  fs.writeFileSync(file, JSON.stringify({ host: 'postgres', port: 5432, database: 'test', user: 'runtime', password: 'SYNTHETIC_ONLY' }));
  const env = { APP_VERSION: 'a'.repeat(40), OIDC_ISSUER: 'https://identity.test/realm',
    OIDC_JWKS_URL: 'https://identity.test/realm/jwks', API_AUDIENCE: 'https://api.test', DATABASE_CONFIG_FILE: file };
  assert.equal(readConfig(env).version, env.APP_VERSION);
  assert.equal(readConfig(env).database.max, 5);
  for (const name of Object.keys(env)) assert.throws(() => readConfig({ ...env, [name]: '' }));
  for (const url of ['http://identity.test', 'https://user:password@identity.test', 'https://identity.test/#token', 'https://identity.test/?token=secret', 'garbage']) {
    assert.throws(() => trustedUrl(url));
  }
  for (const change of [{ APP_VERSION: 'latest' }, { PORT: '0' }, { PORT: '65536' }, { PORT: '1.5' }, { API_AUDIENCE: env.OIDC_ISSUER }]) {
    assert.throws(() => readConfig({ ...env, ...change }));
  }
  fs.writeFileSync(file, JSON.stringify({ host: 'postgres', port: 5432, database: 'test', user: 'runtime', password: 'test', superuser: true }));
  assert.throws(() => readDatabase(file));
  fs.writeFileSync(file, '{}');
  assert.throws(() => readDatabase(file));
});

test('live indépendant, readiness vraie dépendance ; accès anonyme et ambigu refusé avant base', async () => {
  const { createApp } = await import('../dist/app.js');
  const app = createApp({ version: 'a'.repeat(40), issuer: 'https://issuer.test', jwksUrl: 'https://issuer.test/jwks',
    audience: 'https://api.test', port: 3000, host: '127.0.0.1', database: {
      host: '127.0.0.1', port: 1, database: 'test', user: 'test', password: 'SYNTHETIC_ONLY', connectionTimeoutMillis: 100
    } });
  try {
    assert.deepEqual((await app.inject('/health/live')).json(), { status: 'alive' });
    assert.equal((await app.inject('/health/ready')).statusCode, 503);
    for (const headers of [{}, { authorization: 'Basic SYNTHETIC' }, { authorization: 'Bearer one,two' },
      { authorization: 'Bearer SYNTHETIC', cookie: '__Host-calovibe-session=SYNTHETIC' }]) {
      const result = await app.inject({ url: '/api/_technical/status', headers });
      assert.equal(result.statusCode, 401);
      assert.equal(result.json().code, 'UNAUTHENTICATED');
      assert.equal(result.headers['cache-control'], 'no-store');
      assert.doesNotMatch(result.body, /SYNTHETIC|password|postgres|issuer/);
    }
    assert.equal((await app.inject('/api/journal')).statusCode, 404);
  } finally { await app.close(); }
});

test('migrations versionnées et empreintes déterministes', async () => {
  const { migrations } = await import('../dist/database.js');
  const result = migrations();
  assert.deepEqual(result.map(row => row.name), ['001_owner.sql']);
  assert.match(result[0].checksum, /^[a-f0-9]{64}$/);
  assert.deepEqual(migrations(), result);
  assert.doesNotMatch(result[0].sql, /journal|session|password/i);
});
