const { spawnSync } = require('node:child_process');
const files = ['scripts/check.cjs', 'scripts/review-gate.cjs', 'tests/review-gate.test.cjs',
  'mockups/tests/navigation.test.cjs', 'mockups/tests/browser-check.cjs'];
if (process.version !== 'v26.2.0') throw new Error('Runtime requis : Node 26.2.0');
for (const args of [...files.map(file => ['--check', file]),
  ['--test', 'tests/review-gate.test.cjs', 'mockups/tests/navigation.test.cjs']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(1);
}
