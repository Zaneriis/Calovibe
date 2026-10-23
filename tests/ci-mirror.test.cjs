const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const script = resolve(__dirname, '../scripts/configure-apt-mirror.cjs');
// Fixture fidèle à actions/runner-images/images/ubuntu/scripts/build/configure-apt-sources.sh.
const source = 'http://azure.archive.ubuntu.com/ubuntu/\tpriority:1\n'
  + 'https://archive.ubuntu.com/ubuntu/\tpriority:2\n'
  + 'https://security.ubuntu.com/ubuntu/\tpriority:3\n';
const expected = 'https://archive.ubuntu.com/ubuntu/\tpriority:1\n'
  + 'https://archive.ubuntu.com/ubuntu/\tpriority:2\n'
  + 'https://security.ubuntu.com/ubuntu/\tpriority:3\n';
const ubuntuSources = `Types: deb
URIs: mirror+file:/etc/apt/apt-mirrors.txt
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://security.ubuntu.com/ubuntu/
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
`;
function fixture(t, contents = source) {
  const dir = mkdtempSync(join(tmpdir(), 'calovibe-ci-mirror-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'apt-mirrors.txt');
  writeFileSync(file, contents);
  return file;
}
function run(file) {
  return spawnSync(process.execPath, [script, file], { encoding: 'utf8' });
}
test('la CLI remplace Azure priorité 1, conserve la liste restante et ubuntu.sources intact', t => {
  const file = fixture(t);
  const neighbor = join(file, '..', 'ubuntu.sources');
  writeFileSync(neighbor, ubuntuSources);
  const result = run(file);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(file, 'utf8'), expected);
  assert.equal(readFileSync(neighbor, 'utf8'), ubuntuSources);
});
test('la CLI conserve les fins de ligne CRLF', t => {
  const file = fixture(t, source.replaceAll('\n', '\r\n'));
  const result = run(file);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(file, 'utf8'), expected.replaceAll('\n', '\r\n'));
});
test('la seconde exécution est idempotente', t => {
  const file = fixture(t);
  assert.equal(run(file).status, 0);
  const result = run(file);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(file, 'utf8'), expected);
});
for (const [name, input] of [
  ['priorité inattendue', source.replace('priority:1', 'priority:9')],
  ['format deb822 au lieu de la liste attendue', ubuntuSources],
  ['URI Azure inattendue avec une autre ligne valide', expected + 'http://azure.archive.ubuntu.com/ubuntu/\tpriority:9\n']
]) {
  test(`la CLI refuse ${name} sans écrire`, t => {
    const file = fixture(t, input);
    const result = run(file);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Format APT inattendu/);
    assert.equal(readFileSync(file, 'utf8'), input);
  });
}
test('la CLI échoue explicitement si le fichier est absent', t => {
  const file = join(fixture(t), '..', 'absent.txt');
  const result = run(file);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENOENT/);
});
test('la CLI exige un chemin explicite sans chemin système par défaut', () => {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
});
