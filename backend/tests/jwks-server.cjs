// Synthetic public-key fixture for API validation only; never a production authority.
const https = require('node:https');
const fs = require('node:fs');
const server = https.createServer({ key: fs.readFileSync('/run/fixtures/tls.key'), cert: fs.readFileSync('/run/fixtures/tls.crt') }, (_request, response) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(fs.readFileSync('/run/fixtures/jwks.json'));
});
server.listen(9443, '0.0.0.0');
process.once('SIGTERM', () => server.close());
