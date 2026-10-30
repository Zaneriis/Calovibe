const fs = require('node:fs');
const path = require('node:path');
const { renderPage } = require('./page.cjs');
function buildWeb(destination = path.join(__dirname, '../../artifacts/prototype-dist')) {
  const html = renderPage();
  const icons = fs.readFileSync(require.resolve('lucide/dist/umd/lucide.js'));
  fs.mkdirSync(destination, { recursive: true });
  fs.writeFileSync(path.join(destination, 'index.html'), html);
  fs.writeFileSync(path.join(destination, 'lucide.js'), icons);
  return destination;
}
if (require.main === module) buildWeb();
module.exports = { buildWeb };


