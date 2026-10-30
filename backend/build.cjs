const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildContracts } = require('../scripts/build-contracts.cjs');
(async () => {
  const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--project', path.join(__dirname, 'tsconfig.json')], { stdio: 'inherit' });
  if (compiled.error || compiled.status !== 0) throw new Error('Compilation backend échouée.');
  await buildContracts(path.join(__dirname, '../shared/contracts'), path.join(__dirname, 'dist'), 'api');
})()
  .catch(error => { console.error(error.message); process.exitCode = 1; });
