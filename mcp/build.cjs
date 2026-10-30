const path = require('node:path');
const { buildContracts } = require('../scripts/build-contracts.cjs');
buildContracts(path.join(__dirname, '../shared/contracts'), path.join(__dirname, 'dist'), 'mcp')
  .catch(error => { console.error(error.message); process.exitCode = 1; });
