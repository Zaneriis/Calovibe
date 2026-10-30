const { test, before } = require('node:test');
const { buildWeb } = require('../build.cjs');
before(() => buildWeb());
const assert = require('node:assert/strict');
const { createWebServer, upstreamOrigin } = require('../server.cjs');
const { contractApi } = require('./contract-api.cjs');
test('configuration refuses credentials, paths and non HTTP origins', () => {
  for (const value of ['file:///etc', 'http://user:secret@localhost', 'http://localhost/api', 'http://localhost?target=x', undefined]) assert.throws(() => upstreamOrigin(value));
});
test('missing built assets refuses startup', async () => {
  await assert.rejects(() => createWebServer({ backendOrigin: 'http://127.0.0.1:1', directory: '/missing-calovibe-build' }));
});
test('built assets, minimal health and narrowly allowlisted fixed proxy', async t => {
  const api = await contractApi();
  const app = await createWebServer({ backendOrigin: api.origin });
  t.after(async () => { await app.close(); await api.close(); });
  const index = await app.inject('/');
  assert.equal(index.statusCode, 200);
  assert.match(index.body, /assets\/index-/);
  assert.doesNotMatch(index.body, /mockups|test-csrf-session/);
  assert.deepEqual((await app.inject('/health/live')).json(), { status: 'alive' });
  for (const url of ['/api/admin', '/auth/admin', '/api/session/extra', '/auth/logout', '/api/%73ession', '/api/session/../admin']) assert.equal((await app.inject(url)).statusCode, 404, url);
  assert.equal(api.state.calls.length, 0);
  const login = await app.inject('/auth/login');
  assert.equal(login.statusCode, 302);
  const callback = await app.inject('/auth/callback?code=test-code&state=test-state');
  assert.equal(callback.statusCode, 302);
  assert.equal(callback.headers.location, '/');
  assert.match(callback.headers['set-cookie'], /Secure; HttpOnly; SameSite=Lax; Path=\//);
  assert.equal(api.state.calls.at(-1).url, '/auth/callback?code=test-code&state=test-state');
  const session = await app.inject('/api/session');
  assert.equal(session.statusCode, 200); assert.equal(session.json().csrfToken, 'test-csrf-session');
  assert.equal(session.headers['cache-control'], 'no-store');
  api.state.session = 401; assert.equal((await app.inject('/api/session')).statusCode, 401);
  api.state.status = 403; assert.equal((await app.inject('/api/_technical/status')).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: '/auth/logout' })).statusCode, 403);
  api.state.origin = 'http://web.test';
  const result = await app.inject({ method: 'POST', url: '/auth/logout', headers: { origin: api.state.origin, 'x-csrf-token': 'test-csrf-session', cookie: 'test-session=opaque' } });
  assert.equal(result.statusCode, 204); assert.equal(api.state.writes, 1); assert.equal(api.state.calls.at(-1).cookie, 'test-session=opaque');
});
test('dependency outage is an HTTP failure, never service ready', async t => {
  const api = await contractApi(); const app = await createWebServer({ backendOrigin: api.origin });
  t.after(() => app.close()); await api.close();
  assert.equal((await app.inject('/api/session')).statusCode, 502);
});



