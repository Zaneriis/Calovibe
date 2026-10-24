const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const runtime = readFileSync(path.join(__dirname, '../.node-version'), 'utf8').trim();
const files = ['scripts/check.cjs', 'scripts/review-gate.cjs', 'tests/review-gate.test.cjs',
  'scripts/configure-apt-mirror.cjs', 'tests/ci-mirror.test.cjs', 'tests/contracts-data.test.cjs', 'tests/contracts-api-mcp.test.cjs',
  'mockups/tests/navigation.test.cjs', 'mockups/tests/browser-check.cjs',
  'tests/mcp-reference.test.cjs', 'tests/support/mcp-reference.cjs',
  'contracts/loader.cjs', 'scripts/build-contracts.cjs', 'tests/toolchain.test.cjs', 'eslint.config.cjs'];
if (process.version !== 'v' + runtime) throw new Error('Runtime requis : Node ' + runtime);
for (const args of [...files.map(file => ['--check', file]),
  ['--test', 'tests/review-gate.test.cjs', 'tests/ci-mirror.test.cjs',
    'mockups/tests/navigation.test.cjs', 'tests/contracts-data.test.cjs', 'tests/contracts-api-mcp.test.cjs', 'tests/mcp-reference.test.cjs', 'tests/toolchain.test.cjs'],
  ['node_modules/eslint/bin/eslint.js', '.', '--max-warnings', '0'],
  ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.toolchain.json'],
  ['scripts/build-contracts.cjs', 'contracts', 'artifacts/contracts']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(1);
}
