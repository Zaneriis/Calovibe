const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

function createPreviewServer() {
  return http.createServer((request, response) => {
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }).end();
      return;
    }
    if (request.url === '/lucide.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      response.end(fs.readFileSync(require.resolve('lucide/dist/umd/lucide.js')));
      return;
    }
    if (request.url !== '/') {
      response.writeHead(404).end('Introuvable');
      return;
    }
    const fragment = fs.readFileSync(path.join(__dirname, '../mockups/calovibe-accueil.html'), 'utf8');
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Calovibe — aperçu web</title>
<style>body{margin:0;background:#f5f4fa}[hidden]{display:none!important}
#cv-preview>.cv-app{border-radius:0}#cv-preview>section>.cv-app{border-radius:0}
.preview-notice{margin:0;padding:8px 16px;background:#eeebfc;color:#39334e;font:14px 'Segoe UI',sans-serif}</style>
<script src="/lucide.js"></script></head><body>
<p class="preview-notice">Prototype interactif · données d’exemple, non enregistrées après fermeture.</p>
${fragment}</body></html>`);
  });
}

if (require.main === module) {
  const server = createPreviewServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(4173, '127.0.0.1', () => console.log('Aperçu web : http://127.0.0.1:4173 — Ctrl+C pour arrêter.'));
}
module.exports = { createPreviewServer };
