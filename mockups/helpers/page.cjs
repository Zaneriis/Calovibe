const fs = require('node:fs');
const path = require('node:path');
function renderPage() {
  const fragment = fs.readFileSync(path.join(__dirname, '../calovibe-accueil.html'), 'utf8');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Calovibe — aperçu web</title>
<style>body{margin:0;background:#f5f4fa}[hidden]{display:none!important}
#cv-preview>section>.cv-app{border-radius:0}
.preview-notice{margin:0;padding:8px 16px;background:#eeebfc;color:#39334e;font:14px 'Segoe UI',sans-serif}</style>
<script src="./lucide.js"></script></head><body>
<p class="preview-notice">Prototype interactif · données d’exemple, non enregistrées après fermeture.</p>
${fragment}</body></html>`;
}
module.exports = { renderPage };

