const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildContracts } = require('../scripts/build-contracts.cjs');
async function build() {
  await buildContracts(path.join(__dirname, '../shared/contracts'), path.join(__dirname, 'dist'), 'mcp');
  const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(__dirname, 'tsconfig.json')], { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('Compilation MCP échouée.');
}
build().catch(() => { console.error('Build MCP échoué.'); process.exitCode = 1; });
