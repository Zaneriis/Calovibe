const path = require('node:path');
async function buildWeb(destination = path.join(__dirname, 'dist')) {
  const { build } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  await build({ root: __dirname, configFile: false, plugins: [react()], build: { outDir: destination, emptyOutDir: true } });
  return destination;
}
if (require.main === module) buildWeb().catch(() => { console.error('Échec du build web.'); process.exitCode = 1; });
module.exports = { buildWeb };
