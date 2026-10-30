const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadContract } = require('../shared/contracts/loader.cjs');
const { buildContracts } = require('../scripts/build-contracts.cjs');
const { startReference, fixtures, invalid } = require('../mcp/tests/support/mcp-reference.cjs');
const root = path.resolve(__dirname, '..');
const artifacts = path.join(root, 'artifacts');

function temporary(t) {
  fs.mkdirSync(artifacts, { recursive: true });
  const directory = fs.mkdtempSync(path.join(artifacts, 'toolchain-test-'));
  t.after(() => {
    assert.equal(path.dirname(directory), artifacts);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return directory;
}
function sourceCopy(t) {
  const directory = temporary(t);
  for (const name of ['api.openapi.json', 'mcp-tools.json', 'data.schema.json']) {
    fs.copyFileSync(path.join(root, 'shared/contracts', name), path.join(directory, name));
  }
  return directory;
}
function command(script, args, options = {}) {
  return spawnSync(process.execPath, [path.join(root, script), ...args], { cwd: root, encoding: 'utf8', ...options });
}

test('runtime et npm exacts, garde refuse une version différente avant les contrôles', t => {
  const runtime = fs.readFileSync(path.join(root, '.node-version'), 'utf8').trim();
  const pkg = require('../package.json');
  assert.equal(runtime, '24.22.1');
  assert.equal(process.version, 'v' + runtime);
  assert.equal(pkg.engines.node, runtime);
  assert.equal(pkg.packageManager, 'npm@11.13.0');
  const preload = path.join(temporary(t), 'wrong-runtime.cjs');
  fs.writeFileSync(preload, "Object.defineProperty(process, 'version', { value: 'v26.2.0' });");
  const result = spawnSync(process.execPath, ['--require', preload, path.join(root, 'scripts/check.cjs')], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Runtime requis : Node 24\.22\.1/);
});

test('lint rejette une variable inconnue dans le vrai loader, sans ignorer le fichier', () => {
  const result = command('node_modules/eslint/bin/eslint.js', ['--stdin', '--stdin-filename', 'shared/contracts/loader.cjs', '--format', 'json', '--max-warnings', '0'], {
    input: fs.readFileSync(path.join(root, 'shared/contracts/loader.cjs'), 'utf8') + '\nmissingToolchainName();\n'
  });
  assert.equal(result.status, 1, result.stderr);
  const [report] = JSON.parse(result.stdout);
  assert.ok(report.messages.some(message => message.ruleId === 'no-undef' && message.message.includes('missingToolchainName')));
});

test('types rejette un appel incorrect du vrai loader dans une copie isolée', t => {
  const directory = temporary(t);
  fs.writeFileSync(path.join(directory, 'loader.cjs'), fs.readFileSync(path.join(root, 'shared/contracts/loader.cjs'), 'utf8') + '\nloadContract(42);\n');
  fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({
    extends: path.join(root, 'tsconfig.toolchain.json'), files: ['loader.cjs']
  }));
  const result = command('node_modules/typescript/bin/tsc', ['--project', path.join(directory, 'tsconfig.json'), '--pretty', 'false']);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stdout, /TS2345.*number.*string/);
});

test('build déterministe et consommation des seuls artefacts par le client MCP officiel', { timeout: 60000 }, async t => {
  const source = sourceCopy(t);
  const first = path.join(temporary(t), 'first');
  const second = path.join(temporary(t), 'second');
  await buildContracts(source, first);
  await buildContracts(source, second);
  const portable = temporary(t);
  for (const name of ['api.openapi.json', 'mcp-tools.json']) {
    const output = fs.readFileSync(path.join(first, name), 'utf8');
    assert.equal(output, fs.readFileSync(path.join(second, name), 'utf8'));
    if (name === 'mcp-tools.json') assert.doesNotMatch(output, /"\$ref"/);
    else for (const ref of output.matchAll(/"\$ref"\s*:\s*"([^"]+)"/g)) assert.ok(ref[1].startsWith('#/'));
    fs.copyFileSync(path.join(first, name), path.join(portable, name));
  }
  // Le consommateur ne dispose d'aucun des fichiers sources utilisés pour construire ces sorties.
  for (const name of ['api.openapi.json', 'mcp-tools.json', 'data.schema.json']) fs.unlinkSync(path.join(source, name));
  assert.deepEqual(fs.readdirSync(portable).sort(), ['api.openapi.json', 'mcp-tools.json']);
  const contract = await loadContract(portable);
  assert.equal(contract.tools.length, 31);
  assert.equal(contract.manifest.protocolVersion, '2026-07-28');
  const ref = await startReference(contract);
  t.after(() => ref.close());
  const client = await ref.connect();
  assert.deepEqual((await client.listTools()).tools, contract.wireTools);
  assert.equal(client.getNegotiatedProtocolVersion(), contract.manifest.protocolVersion);
  for (const fixture of fixtures) {
    ref.setFixture(fixture);
    const before = ref.apiCalls.length;
    const result = await client.callTool({ name: fixture.tool, arguments: fixture.input }, { timeout: 3000 });
    assert.equal(result.isError, false);
    assert.deepEqual(result.structuredContent, { ok: true, data: fixture.response.body });
    assert.equal(ref.apiCalls.length, before + 1);
  }
  for (const fixture of invalid) {
    const before = ref.apiCalls.length;
    const result = await client.callTool({ name: fixture.tool, arguments: fixture.input }, { timeout: 3000 });
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent.error.code, 'VALIDATION');
    assert.equal(ref.apiCalls.length, before);
  }
});

for (const mode of ['référence locale cassée', 'référence HTTP interdite', 'format inconnu']) {
  test('build refuse ' + mode + ' et ne publie aucune sortie', async t => {
    const source = sourceCopy(t);
    const manifestPath = path.join(source, 'mcp-tools.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.tools[0].inputSchema = mode === 'format inconnu' ? { type: 'string', format: 'unknown-toolchain-format' }
      : { $ref: mode === 'référence HTTP interdite' ? 'https://example.invalid/schema.json' : 'missing.schema.json' };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    const output = path.join(temporary(t), 'output');
    const result = command('scripts/build-contracts.cjs', [source, output]);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(fs.existsSync(output), false);
    assert.match(result.stderr, mode === 'format inconnu' ? /unknown.*format/ : /resolve|Error|ENOENT/i);
  });
}

test('consommateur refuse une sortie absente ou corrompue, sans reprise silencieuse des sources', async t => {
  const directory = temporary(t);
  await assert.rejects(loadContract(directory));
  await buildContracts(path.join(root, 'shared/contracts'), directory);
  fs.writeFileSync(path.join(directory, 'mcp-tools.json'), '{');
  await assert.rejects(loadContract(directory), SyntaxError);
});
