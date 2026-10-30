const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { buildWeb } = require('./prototype-build.cjs');
function createPreviewServer(directory = buildWeb()) {
  return http.createServer((request, response) => {
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }).end();
      return;
    }
    const asset = request.url === '/' ? ['index.html', 'text/html']
      : request.url === '/lucide.js' ? ['lucide.js', 'text/javascript'] : null;
    if (!asset) {
      response.writeHead(404).end('Introuvable');
      return;
    }
    response.writeHead(200, { 'Content-Type': asset[1] + '; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(fs.readFileSync(path.join(directory, asset[0])));
  });
}

if (require.main === module) {
  const server = createPreviewServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(4173, '127.0.0.1', () => console.log('Aperçu web : http://127.0.0.1:4173 — Ctrl+C pour arrêter.'));
}
module.exports = { createPreviewServer };

