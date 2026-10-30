const http = require('node:http');
// Strictly a test contract API, never an authentication implementation.
async function contractApi() {
  const state = { session: 200, status: 200, logout: 204, malformed: false, writes: 0, calls: [], delay: 0 };
  const server = http.createServer(async (req, res) => {
    state.calls.push({ method: req.method, url: req.url, csrf: req.headers['x-csrf-token'], origin: req.headers.origin, cookie: req.headers.cookie });
    if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/session' && req.method === 'GET') { res.statusCode = state.session; res.end(JSON.stringify(state.malformed ? { authenticated: true } : { authenticated: true, csrfToken: 'test-csrf-session' })); }
    else if (req.url === '/api/_technical/status' && req.method === 'GET') { res.statusCode = state.status; res.end(JSON.stringify({ schemaVersion: '0.1.0', status: 'ready', version: 'test-contract' })); }
    else if (req.url === '/auth/logout' && req.method === 'POST') {
      res.statusCode = req.headers['x-csrf-token'] === 'test-csrf-session' && req.headers.origin === state.origin ? state.logout : 403;
      if (res.statusCode === 204) { state.writes++; state.session = 401; }
      res.end();
    } else if (req.url === '/auth/login') { res.writeHead(302, { Location: '/identity-test-only' }); res.end(); }
    else if (req.url.startsWith('/auth/callback?') && req.method === 'GET') { res.writeHead(302, { Location: '/', 'Set-Cookie': '__Host-calovibe-session=test-opaque; Secure; HttpOnly; SameSite=Lax; Path=/' }); res.end(); }
    else { res.statusCode = 404; res.end('{}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { state, origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}
module.exports = { contractApi };

