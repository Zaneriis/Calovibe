const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { loadContract } = require('../shared/contracts/loader.cjs');

/** @param {string} source @param {string} destination @param {'all'|'api'|'mcp'} [channel] */
async function buildContracts(source, destination, channel = 'all') {
  if (!['all', 'api', 'mcp'].includes(channel)) throw new Error('Canal de build inconnu.');
  const contract = await loadContract(source);
  const api = await SwaggerParser.bundle(path.resolve(source, 'api.openapi.json'), { resolve: { http: false } });
  const outputs = {
    ...(channel !== 'mcp' ? { 'api.openapi.json': JSON.stringify(api, null, 2) + '\n' } : {}),
    ...(channel !== 'api' ? { 'mcp-tools.json': JSON.stringify({ ...contract.manifest, tools: contract.tools }, null, 2) + '\n' } : {})
  };
  // Chaque schéma envoyé doit être autonome, sans chemin du dépôt à résoudre.
  for (const [name, text] of Object.entries(outputs)) {
    const refs = [...text.matchAll(/"\$ref"\s*:\s*"([^"]+)"/g)];
    if (refs.some(ref => name === 'mcp-tools.json' || !ref[1].startsWith('#/'))) throw new Error('Référence externe dans les contrats construits.');
  }
  await mkdir(destination, { recursive: true });
  for (const [name, text] of Object.entries(outputs)) await writeFile(path.join(destination, name), text);
}

if (require.main === module) {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination || process.argv.length !== 4) throw new Error('Usage: node build-contracts.cjs <source> <destination>');
  buildContracts(source, destination).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { buildContracts };
