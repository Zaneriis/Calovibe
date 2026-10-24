const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const net = require('node:net');
const { loadContract, startReference, fixtures, invalid, errorFixtures, TOKENS } = require('./support/mcp-reference.cjs');
const VERSION = '2026-07-28';

function checkResult(contract, toolName, result, value, isError = false) {
  const tool = contract.tools.find(candidate => candidate.name === toolName);
  // Le SDK client normalise le résultat ; resultType est vérifié séparément sur le wire.
  assert.equal(result.isError, isError);
  assert.deepEqual(result.structuredContent, isError ? { ok: false, error: value } : { ok: true, data: value });
  assert.deepEqual(JSON.parse(result.content.find(block => block.type === 'text').text), result.structuredContent);
  assert.equal(contract.validate(tool.outputSchema, result.structuredContent), true);
}
async function call(client, fixture) {
  return client.callTool({ name: fixture.tool, arguments: fixture.input }, { timeout: 3000 });
}
async function assertClosed(ref) {
  for (const url of [ref.mcpUrl, ref.apiUrl]) {
    await assert.rejects(new Promise((resolve, reject) => {
      const socket = net.connect(Number(new URL(url).port), '127.0.0.1');
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', reject);
      socket.setTimeout(1000, () => socket.destroy(new Error('Port non fermé dans le délai du test.')));
    }), error => error.code === 'ECONNREFUSED');
  }
}

test('référence MCP HTTP officielle — fixtures SYNTHÉTIQUES, aucune auth ni donnée de production', { timeout: 60000 }, async t => {
  const contract = await loadContract();
  const ref = await startReference(contract);
  t.after(() => ref.close());
  const client = await ref.connect();
  const listed = await client.listTools({}, { timeout: 3000 });

  await t.test('protocole moderne épinglé et catalogue complet de 31 outils liés', () => {
    assert.equal(client.getNegotiatedProtocolVersion(), VERSION);
    assert.equal(listed.tools.length, 31);
    assert.deepEqual(listed.tools, contract.wireTools);
    assert.doesNotMatch(JSON.stringify(listed.tools), /"\$ref"|x-api|x-required-scopes|data\.schema\.json|api\.openapi\.json/);
    assert.equal(ref.apiCalls.length, 0);
    const listing = ref.wire.find(message => message.method === 'tools/list');
    assert.ok(listing);
    assert.equal(listing.version, VERSION);
    assert.equal(listing.meta['io.modelcontextprotocol/protocolVersion'], VERSION);
    assert.equal(ref.wire.some(message => message.method === 'initialize'), false);
  });

  for (const fixture of fixtures) await t.test(`HTTP client → MCP → API : ${fixture.tool}`, async () => {
    ref.setFixture(fixture);
    const before = ref.apiCalls.length;
    const result = await call(client, fixture);
    checkResult(contract, fixture.tool, result, fixture.response.body);
    assert.equal(ref.apiCalls.length, before + 1);
    const received = ref.apiCalls.at(-1);
    const tool = contract.tools.find(candidate => candidate.name === fixture.tool);
    const route = tool['x-api'].path.replace(/\{([^}]+)\}/g, (_, name) => encodeURIComponent(fixture.input.path[name]));
    const url = new URL(received.url, ref.apiUrl);
    assert.equal(received.method, tool['x-api'].method.toUpperCase());
    assert.equal(url.pathname, `/api${route}`);
    assert.deepEqual(Object.fromEntries(url.searchParams), Object.fromEntries(Object.entries(fixture.input.query ?? {}).map(([key, value]) => [key, String(value)])));
    assert.deepEqual(received.body, fixture.input.body);
    assert.equal(received.apiCredentialAccepted, true, 'le jeton API synthétique est distinct du jeton MCP');
    if (fixture.tool === 'journal_entry_create') {
      assert.equal(received.body.data.localDate, '2026-10-22');
      assert.equal(received.body.data.meal, 'dinner');
      assert.equal(received.body.data.quantity, '150');
      assert.equal(received.body.data.unit, 'g');
    }
  });

  for (const fixture of invalid) await t.test(`argument invalide sans API : ${fixture.label}`, async () => {
    const before = ref.apiCalls.length;
    const result = await call(client, fixture);
    assert.equal(result.structuredContent.error.code, 'VALIDATION');
    checkResult(contract, fixture.tool, result, result.structuredContent.error, true);
    assert.equal(ref.apiCalls.length, before);
  });

  await t.test('outil inconnu : erreur JSON-RPC sans appel API', async () => {
    const before = ref.apiCalls.length;
    await assert.rejects(client.callTool({ name: 'unknown_SYNTHETIC', arguments: {} }, { timeout: 3000 }), error => error.code === -32601);
    assert.equal(ref.apiCalls.length, before);
  });

  const readFixture = fixtures.find(fixture => fixture.tool === 'journal_entry_read');
  for (const fixture of errorFixtures.filter(error => ![401, 403].includes(error.httpStatus))) {
    await t.test(`erreur API → outil structuré : ${fixture.code}`, async () => {
      ref.setFixture(readFixture);
      ref.reply = { status: fixture.httpStatus, body: fixture.error };
      const before = ref.apiCalls.length;
      const result = await call(client, readFixture);
      checkResult(contract, readFixture.tool, result, fixture.error, true);
      assert.equal(ref.apiCalls.length, before + 1);
    });
  }
  for (const status of [401, 403]) await t.test(`refus API ${status} reste un refus du transport MCP`, async () => {
    ref.setFixture(readFixture);
    ref.reply = { status, body: {} };
    const before = ref.apiCalls.length;
    await assert.rejects(call(client, readFixture));
    assert.equal(ref.responses.at(-1), status);
    assert.equal(ref.apiCalls.length, before + 1);
  });
  for (const mode of ['réponse invalide', 'statut inattendu', 'connexion interrompue', 'délai API dépassé']) await t.test(`dépendance synthétique : ${mode}`, async () => {
    ref.setFixture(readFixture);
    if (mode === 'connexion interrompue') ref.disconnect = true;
    else if (mode === 'délai API dépassé') ref.reply = null;
    else ref.reply = { status: mode === 'statut inattendu' ? 500 : 200, body: { token: 'DO_NOT_ECHO_SYNTHETIC', invalid: true } };
    const before = ref.apiCalls.length;
    const result = await call(client, readFixture);
    assert.equal(result.structuredContent.error.code, 'DEPENDENCY_UNAVAILABLE');
    assert.doesNotMatch(JSON.stringify(result), /DO_NOT_ECHO_SYNTHETIC/);
    checkResult(contract, readFixture.tool, result, result.structuredContent.error, true);
    assert.equal(ref.apiCalls.length, before + 1);
  });

  await t.test('client lecture seule : lecture autorisée, écriture HTTP 403 avant API', async () => {
    ref.setFixture(readFixture);
    const readonly = await ref.connect(TOKENS.read);
    await readonly.listTools({}, { timeout: 3000 });
    checkResult(contract, readFixture.tool, await call(readonly, readFixture), readFixture.response.body);
    const before = ref.apiCalls.length;
    await assert.rejects(call(readonly, fixtures.find(fixture => fixture.tool === 'journal_entry_create')));
    assert.equal(ref.responses.at(-1), 403);
    assert.equal(ref.apiCalls.length, before);
  });
  await t.test('write seul ne donne pas read : HTTP 403 avant API', async () => {
    const writer = await ref.connect(TOKENS.write);
    const before = ref.apiCalls.length;
    await assert.rejects(call(writer, readFixture));
    assert.equal(ref.responses.at(-1), 403);
    assert.equal(ref.apiCalls.length, before);
  });
  for (const token of [null, 'SYNTHETIC_UNKNOWN']) await t.test(`client ${token ? 'jeton invalide' : 'sans jeton'} : HTTP 401 avant API`, async () => {
    const before = ref.apiCalls.length;
    await assert.rejects(ref.connect(token));
    assert.equal(ref.responses.at(-1), 401);
    assert.equal(ref.apiCalls.length, before);
  });
  await t.test('Origin et Host étrangers refusés avant API', async () => {
    const before = ref.apiCalls.length;
    const response = await fetch(ref.mcpUrl, { method: 'POST', headers: { origin: 'https://foreign.invalid' } });
    assert.equal(response.status, 403);
    // fetch impose le Host de destination ; node:http envoie ici le Host hostile réellement testé.
    const hostStatus = await new Promise((resolve, reject) => {
      const request = http.request(ref.mcpUrl, { method: 'POST', headers: { host: 'foreign.invalid' } }, reply => {
        reply.resume(); reply.once('end', () => resolve(reply.statusCode));
      });
      request.setTimeout(1000, () => request.destroy(new Error('Délai du test Host dépassé.')));
      request.once('error', reject); request.end();
    });
    assert.equal(hostStatus, 403);
    assert.equal(ref.apiCalls.length, before);
  });
  await t.test('JSON malformé et corps surdimensionné refusés sans API', async () => {
    const before = ref.apiCalls.length;
    for (const [body, status] of [['{', 400], [' '.repeat(65537), 413]]) {
      const response = await fetch(ref.mcpUrl, { method: 'POST', headers: {
        authorization: `Bearer ${TOKENS.both}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream'
      }, body });
      assert.equal(response.status, status);
      await response.body?.cancel();
    }
    assert.equal(ref.apiCalls.length, before);
  });
  await t.test('ancien initialize refusé, aucune retombée legacy', async () => {
    const before = ref.apiCalls.length;
    const response = await fetch(ref.mcpUrl, { method: 'POST', headers: {
      authorization: `Bearer ${TOKENS.both}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream'
    }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'synthetic-legacy', version: '0.1.0' }
    } }) });
    const body = await response.json();
    assert.ok(body.error);
    assert.notEqual(response.status, 200);
    assert.equal(ref.apiCalls.length, before);
  });
  await t.test('les réponses tools/call réelles portent resultType complete avant normalisation client', () => {
    const results = ref.wireResults.filter(exchange => exchange.method === 'tools/call' && exchange.body.result);
    assert.ok(results.length >= fixtures.length + invalid.length);
    for (const exchange of results) {
      assert.equal(exchange.body.result.resultType, 'complete');
      assert.ok(Object.hasOwn(exchange.body.result, 'structuredContent'));
    }
  });
  await t.test('arrêt explicite ferme les deux ports après réussite et erreurs', async () => {
    await ref.close();
    await assertClosed(ref);
  });
  await t.test('échec de connexion nettoyé, arrêt idempotent', async () => {
    const failed = await startReference(contract);
    try { await assert.rejects(failed.connect(null)); }
    finally { await failed.close(); }
    await failed.close();
    await assertClosed(failed);
  });
});
