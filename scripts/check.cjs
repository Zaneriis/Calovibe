const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const runtime = readFileSync(path.join(__dirname, '../.node-version'), 'utf8').trim();
const files = ['scripts/check.cjs', 'scripts/review-gate.cjs', 'tests/review-gate.test.cjs',
  'scripts/configure-apt-mirror.cjs', 'tests/ci-mirror.test.cjs', 'tests/contracts-data.test.cjs', 'tests/contracts-api-mcp.test.cjs',
  'mockups/tests/navigation.test.cjs', 'mockups/tests/browser-check.cjs',
  'mcp/tests/mcp-reference.test.cjs', 'mcp/tests/support/mcp-reference.cjs',
  'shared/contracts/loader.cjs', 'scripts/build-contracts.cjs', 'tests/toolchain.test.cjs', 'eslint.config.cjs',
  'tests/service-layout.test.cjs', 'backend/build.cjs', 'mcp/build.cjs', 'web/build.cjs', 'mockups/helpers/page.cjs', 'mockups/helpers/preview.cjs', 'mockups/helpers/build.cjs', 'web/server.cjs', 'web/tests/server.test.cjs', 'web/tests/contract-api.cjs', 'web/tests/browser.cjs'];
if (process.version !== 'v' + runtime) throw new Error('Runtime requis : Node ' + runtime);
for (const args of [...files.map(file => ['--check', file]),
  ['--test', 'tests/review-gate.test.cjs', 'tests/ci-mirror.test.cjs',
    'mockups/tests/navigation.test.cjs', 'tests/contracts-data.test.cjs', 'tests/contracts-api-mcp.test.cjs', 'mcp/tests/mcp-reference.test.cjs', 'tests/toolchain.test.cjs', 'tests/service-layout.test.cjs', 'web/tests/server.test.cjs'],
  ['node_modules/eslint/bin/eslint.js', '.', '--max-warnings', '0'],
  ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.toolchain.json'],
  ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'web/tsconfig.json'],
  ['scripts/build-contracts.cjs', 'shared/contracts', 'artifacts/contracts']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(1);
}

