const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

for (const service of ['backend', 'web', 'mcp']) {
  test(`build ${service} sans sources ni sorties des autres services`, t => {
    const artifacts = path.join(root, 'artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    const directory = fs.mkdtempSync(path.join(artifacts, 'service-build-'));
    t.after(() => {
      assert.equal(path.dirname(directory), artifacts);
      fs.rmSync(directory, { recursive: true, force: true });
    });
    fs.mkdirSync(path.join(directory, service), { recursive: true });
    for (const file of ['build.cjs', 'package.json']) fs.copyFileSync(path.join(root, service, file), path.join(directory, service, file));
    if (service === 'web') {
      fs.copyFileSync(path.join(root, 'web/page.cjs'), path.join(directory, 'web/page.cjs'));
      fs.mkdirSync(path.join(directory, 'web/mockups'));
      fs.copyFileSync(path.join(root, 'web/mockups/calovibe-accueil.html'), path.join(directory, 'web/mockups/calovibe-accueil.html'));
    } else {
      fs.cpSync(path.join(root, 'shared/contracts'), path.join(directory, 'shared/contracts'), { recursive: true });
      fs.mkdirSync(path.join(directory, 'scripts'));
      fs.copyFileSync(path.join(root, 'scripts/build-contracts.cjs'), path.join(directory, 'scripts/build-contracts.cjs'));
    }
    const run = () => spawnSync(process.execPath, ['build.cjs'], { cwd: path.join(directory, service), encoding: 'utf8' });
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    const output = path.join(directory, service, 'dist');
    assert.deepEqual(fs.readdirSync(output).sort(), service === 'web' ? ['index.html', 'lucide.js']
      : [service === 'backend' ? 'api.openapi.json' : 'mcp-tools.json']);
    for (const sibling of ['backend', 'web', 'mcp'].filter(name => name !== service)) assert.equal(fs.existsSync(path.join(directory, sibling)), false);
    const source = service === 'web' ? path.join(directory, 'web/mockups/calovibe-accueil.html') : path.join(directory, 'shared/contracts/api.openapi.json');
    fs.unlinkSync(source);
    assert.notEqual(run().status, 0, 'Une source absente doit faire échouer le build');
  });
}
