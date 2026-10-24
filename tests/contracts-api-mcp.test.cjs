const assert = require('node:assert/strict');
const path = require('node:path');
const { before, test } = require('node:test');
const SwaggerParser = require('@apidevtools/swagger-parser');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const source = require('../contracts/api.openapi.json');
const manifest = require('../contracts/mcp-tools.json');
const examples = require('../contracts/examples/api-mcp-valid.json');
const invalid = require('../contracts/examples/api-mcp-invalid.json');
const errors = require('../contracts/examples/api-mcp-errors.json');
const resultExample = require('../contracts/examples/api-mcp-result.json');
const apiPath = path.resolve(__dirname, '../contracts/api.openapi.json');
const options = { resolve: { http: false } };
const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
addFormats(ajv, { mode: 'full', formats: ['date', 'date-time', 'uuid', 'json-pointer'] });
ajv.addFormat('calovibe-base64', value => {
  if (value.length > 13981016) return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.length <= 10485760 && bytes.toString('base64') === value;
});
let api, resolvedTools, components;
const validators = new Map();
function accepts(schema, value, expected = true) {
  if (!validators.has(schema)) validators.set(schema, ajv.compile(schema));
  const validate = validators.get(schema);
  assert.equal(validate(value), expected, JSON.stringify(validate.errors));
}
function operation(toolName) {
  const tool = manifest.tools.find(tool => tool.name === toolName);
  assert.ok(tool, toolName);
  return api.paths[tool['x-api'].path][tool['x-api'].method];
}
before(async () => {
  api = await SwaggerParser.validate(apiPath, options);
  components = api.components.schemas;
  const schemas = Object.fromEntries(manifest.tools.flatMap(tool => [
    [`${tool.name}_input`, tool.inputSchema], [`${tool.name}_output`, tool.outputSchema]
  ]));
  // Swagger Parser lie les refs du catalogue dans un document OpenAPI temporaire standard.
  const carrier = { openapi: source.openapi, info: source.info, paths: {}, components: { schemas } };
  resolvedTools = (await SwaggerParser.validate(path.join(path.dirname(apiPath), 'mcp-tools.json'), carrier, options)).components.schemas;
});

test('OpenAPI 3.1.2 et toutes les DTO/MCP compilent en JSON Schema 2020-12 strict', () => {
  assert.equal(api.openapi, '3.1.2');
  assert.equal(manifest.protocolVersion, '2026-07-28');
  for (const schema of [...Object.values(components), ...Object.values(resolvedTools)]) {
    assert.equal(ajv.validateSchema(schema), true);
    ajv.compile(schema);
  }
});

test('le validateur standard rejette un document OpenAPI structurellement invalide et une référence cassée', async () => {
  const malformed = structuredClone(source);
  delete malformed.paths['/v1/journal/days/{localDate}'].get.responses['200'].description;
  await assert.rejects(SwaggerParser.validate(apiPath, malformed, options));
  const broken = structuredClone(source);
  broken.components.schemas.EntryView.properties.entry.$ref = 'data.schema.json#/$defs/absent';
  await assert.rejects(SwaggerParser.validate(apiPath, broken, options));
});

test('les 31 capacités sont en bijection API/MCP, avec paramètres, payloads, résultats et scopes identiques', () => {
  const operations = Object.entries(api.paths).flatMap(([route, methods]) => Object.entries(methods).map(([method, op]) => ({ route, method, op })));
  assert.equal(operations.length, 31);
  assert.equal(manifest.tools.length, operations.length);
  assert.equal(new Set(manifest.tools.map(tool => tool.name)).size, operations.length);
  for (const { route, method, op } of operations) {
    const tool = manifest.tools.find(tool => tool.name === op.operationId);
    assert.deepEqual(tool['x-api'], { path: route, method, operationId: op.operationId });
    assert.deepEqual(tool['x-required-scopes'], op['x-required-scopes']);
    assert.deepEqual(op['x-required-scopes'], [tool.annotations.readOnlyHint ? 'calovibe:read' : 'calovibe:write']);
    const input = resolvedTools[`${tool.name}_input`];
    for (const parameter of op.parameters) {
      const location = parameter.in === 'path' ? 'path' : 'query';
      assert.deepEqual(input.properties[location].properties[parameter.name], parameter.schema);
      assert.equal(input.properties[location].required.includes(parameter.name), parameter.required);
      assert.equal(route.includes(`{${parameter.name}}`), parameter.in === 'path');
    }
    if (op.requestBody) assert.deepEqual(input.properties.body, op.requestBody.content['application/json'].schema);
    const output = resolvedTools[`${tool.name}_output`].oneOf[0].properties.data;
    assert.deepEqual(output, tool.annotations.readOnlyHint ? op.responses['200'].content['application/json'].schema : op.responses['200'].content['application/json'].schema.allOf[0]);
    if (method === 'put' || method === 'delete' || tool.name === 'operation_undo') assert.equal(tool.annotations.destructiveHint, true);
    assert.equal(tool.annotations.openWorldHint, tool.name === 'photo_submit');
    assert.equal(tool.annotations.idempotentHint, true);
  }
});

test('les primitives communes restent des références DATA et aucun $defs dupliqué', () => {
  const text = JSON.stringify(source);
  assert.ok(text.includes('data.schema.json#/$defs/quantity'));
  assert.ok(text.includes('data.schema.json#/$defs/undo'));
  assert.ok(text.includes('data.schema.json#/$defs/error'));
  assert.equal(Object.hasOwn(source, '$defs'), false);
  for (const name of ['quantity', 'decimal', 'localDate', 'uuid', 'nutrition', 'journalEntry', 'goals']) {
    assert.equal(Object.hasOwn(source.components.schemas, name), false);
  }
});

for (const fixture of examples.capabilities) test(`requête/réponse API et structuredContent MCP valides : ${fixture.tool}`, () => {
  accepts(resolvedTools[`${fixture.tool}_input`], fixture.input);
  const op = operation(fixture.tool);
  if (fixture.input.body) accepts(op.requestBody.content['application/json'].schema, fixture.input.body);
  accepts(op.responses[String(fixture.response.status)].content['application/json'].schema, fixture.response.body);
  accepts(resolvedTools[`${fixture.tool}_output`], { ok: true, data: fixture.response.body });
});
for (const fixture of examples.components) test(`variante valide : ${fixture.label}`, () => accepts(components[fixture.component], fixture.value));
for (const fixture of invalid) test(`requête invalide refusée : ${fixture.label}`, () => accepts(resolvedTools[`${fixture.tool}_input`], fixture.input, false));

test('les champs obligatoires de chaque capacité sont réellement refusés lorsqu’ils manquent', () => {
  for (const fixture of examples.capabilities) {
    const schema = resolvedTools[`${fixture.tool}_input`];
    for (const key of schema.required) {
      const value = structuredClone(fixture.input); delete value[key];
      accepts(schema, value, false);
    }
    for (const location of ['body', 'path', 'query']) {
      const nested = schema.properties[location];
      if (!nested?.required || !fixture.input[location]) continue;
      for (const key of nested.required) {
        const value = structuredClone(fixture.input); delete value[location][key];
        accepts(schema, value, false);
      }
    }
    accepts(schema, { ...fixture.input, guessedMeal: 'lunch' }, false);
  }
});

test('le bilan, les valeurs de référence et les résultats n’effacent pas inconnu en zéro', () => {
  const fixture = examples.capabilities.find(f => f.tool === 'journal_day_read');
  assert.equal(fixture.response.body.displayTotals.fatG, null);
  assert.equal(fixture.response.body.displayTotals.proteinG, '0');
  const missing = structuredClone(fixture.response.body); delete missing.displayTotals.fatG;
  accepts(components.JournalDay, missing, false);
  const empty = structuredClone(fixture.response.body);
  empty.meals.forEach(meal => { meal.entries = []; meal.displayTotals = { kcal: '0', proteinG: '0', fatG: '0', carbohydrateG: '0' }; });
  empty.displayTotals = { kcal: '0', proteinG: '0', fatG: '0', carbohydrateG: '0' }; empty.goals = null; empty.water.entries = []; empty.water.totalMl = '0'; empty.water.goalMl = null;
  accepts(components.JournalDay, empty);
});

test('fixture numérique L0 exacte : 200 kcal/100 g × 150 g = 300 kcal, sans calculateur métier livré', () => {
  const fixture = examples.capabilities.find(f => f.tool === 'portion_preview');
  const reference = fixture.input.body.source.snapshot.reference;
  const consumed = fixture.input.body;
  assert.equal(reference.unit, consumed.unit);
  assert.equal(reference.quantity, '100'); assert.equal(reference.nutrition.kcal, '200'); assert.equal(consumed.quantity, '150');
  const numerator = BigInt(reference.nutrition.kcal) * BigInt(consumed.quantity);
  assert.equal(numerator % BigInt(reference.quantity), 0n);
  assert.equal(String(numerator / BigInt(reference.quantity)), fixture.response.body.displayNutrition.kcal);
  assert.equal(fixture.response.body.displayNutrition.kcal, '300');
});

for (const fixture of errors) test(`erreur ${fixture.code} : HTTP et MCP distincts`, () => {
  assert.equal(source['x-error-http-status'][fixture.code], fixture.httpStatus);
  accepts(api.paths['/v1/journal/entries'].post.responses[String(fixture.httpStatus)].content['application/json'].schema, fixture.error);
  if (fixture.mcpTransport) {
    assert.ok([401, 403].includes(fixture.mcpTransport.status));
    assert.equal(Object.hasOwn(fixture, 'mcpResult'), false);
    accepts(resolvedTools.journal_entry_create_output, { ok: false, error: fixture.error }, false);
  } else {
    assert.equal(fixture.mcpResult.resultType, 'complete');
    assert.equal(fixture.mcpResult.isError, true);
    assert.deepEqual(JSON.parse(fixture.mcpResult.content[0].text), fixture.mcpResult.structuredContent);
    accepts(resolvedTools.journal_entry_create_output, fixture.mcpResult.structuredContent);
  }
});

test('g/ml sans équivalence : requête structurellement valide et exemple d’erreur métier explicite', () => {
  const fixture = errors.find(f => f.input);
  accepts(resolvedTools.portion_preview_input, fixture.input);
  assert.equal(fixture.input.body.source.snapshot.reference.unit, 'g');
  assert.equal(fixture.input.body.unit, 'ml');
  assert.deepEqual(fixture.error.fields, [{ path: '/body/unit', reason: 'incompatible_unit' }]);
  assert.equal(fixture.httpStatus, 422);
});

test('exemple de résultat final MCP : données structurées et texte identiques, aucune preuve d’interop', () => {
  assert.equal(resultExample.result.resultType, 'complete');
  assert.equal(resultExample.result.isError, false);
  assert.deepEqual(JSON.parse(resultExample.result.content[0].text), resultExample.result.structuredContent);
  accepts(resolvedTools[`${resultExample.tool}_output`], resultExample.result.structuredContent);
});

test('mutations : résultats discriminés, états cohérents et versions des tombstones/lot conservées', () => {
  for (const fixture of examples.capabilities.filter(f => !manifest.tools.find(t => t.name === f.tool).annotations.readOnlyHint)) {
    const schema = resolvedTools[`${fixture.tool}_output`];
    const bad = structuredClone(fixture.response.body); bad.status = 'pending';
    accepts(schema, { ok: true, data: bad }, false);
    const wrongKind = structuredClone(fixture.response.body); wrongKind.result = { kind: 'inconnu', value: {} };
    accepts(schema, { ok: true, data: wrongKind }, false);
    const pending = { ...fixture.response.body, status: 'pending', targets: [], undoState: 'not_supported', result: null };
    accepts(operation(fixture.tool).responses['202'].content['application/json'].schema, pending);
    accepts(operation(fixture.tool).responses['200'].content['application/json'].schema, pending, false);
    for (const target of fixture.response.body.targets) assert.ok(target.id && target.version >= 1);
  }
  const removed = examples.capabilities.find(f => f.tool === 'journal_entry_delete').response.body;
  assert.equal(removed.targets[0].deleted, true);
  assert.deepEqual(removed.result.value.targets, removed.targets);
  const photo = examples.capabilities.find(f => f.tool === 'photo_confirm').response.body;
  assert.equal(photo.result.kind, 'photo_batch');
  assert.ok(photo.targets.some(t => t.resource === 'journal_entry' && t.id === photo.result.value.entries[0].id));
});

test('REG-PHOTO-BASE64-01 : grandes chaînes sans RangeError, base64 canonique et octets bornés, MIME non vérifié', () => {
  assert.equal(source.components.schemas.PhotoImage.properties.base64.maxLength, 13981016);
  accepts(components.PhotoImage, { mediaType: 'image/png', base64: 'aGVsbG8=' });
  accepts(components.PhotoImage, { mediaType: 'image/svg+xml', base64: 'aGVsbG8=' }, false);
  accepts(components.PhotoImage, { mediaType: 'image/png', base64: 'AB==' }, false);
  accepts(components.PhotoImage, { mediaType: 'image/png', base64: 'AAAAA' }, false);
  accepts(components.PhotoImage, { mediaType: 'image/png', base64: 'A'.repeat(13981012) + 'AA==' });
  accepts(components.PhotoImage, { mediaType: 'image/png', base64: 'A'.repeat(13981016) }, false);
  const tooLarge = 'A'.repeat(13981020);
  accepts(components.PhotoImage, { mediaType: 'image/png', base64: tooLarge }, false);
  const fixture = examples.capabilities.find(f => f.tool === 'weights_list');
  accepts(resolvedTools.weights_list_input, { query: { ...fixture.input.query, from: '2026-02-29' } }, false);
});



test('les statuts HTTP rejettent un code contradictoire et la photo exige une identité/statut cohérent', () => {
  for (const fixture of errors) {
    const wrong = { ...fixture.error, code: fixture.httpStatus === 401 ? 'FORBIDDEN' : 'UNAUTHENTICATED' };
    accepts(api.components.responses[`Error${fixture.httpStatus}`].content['application/json'].schema, wrong, false);
  }
  const photo = examples.capabilities.find(f => f.tool === 'photo_read').response.body;
  accepts(components.PhotoProposal, { ...photo, status: 'failed' }, false);
  accepts(components.PhotoProposal, { ...photo, status: 'confirmed' }, false);
  accepts(components.PhotoItem, { ...photo.items[0], identity: { kind: 'library', itemId: null, itemVersion: null } }, false);
});


test('la provenance d’entrée est dérivée au serveur et ne peut être injectée pour contourner la confirmation photo', () => {
  const value = structuredClone(examples.capabilities.find(f => f.tool === 'journal_entry_create').input);
  value.body.data.source.provenance = { method: 'photo', sourceId: null, estimated: false };
  accepts(resolvedTools.journal_entry_create_input, value, false);
});


test('l’identité d’idempotence est authentifiée hors payload, sans userId ni client logique injectables', () => {
  for (const fixture of examples.capabilities) {
    const schema = resolvedTools[`${fixture.tool}_input`];
    accepts(schema, { ...fixture.input, userId: 'identité-injectée' }, false);
    accepts(schema, { ...fixture.input, clientId: 'client-logique-injecté' }, false);
    if (fixture.input.body) accepts(schema, { ...fixture.input, body: { ...fixture.input.body, clientId: 'injecté' } }, false);
  }
});


test('déclarations de sécurité cohérentes ADR-02 : session lecture, session+CSRF mutation ou Bearer API, sans auth réelle prétendue', () => {
  assert.equal(source.servers[0].url, '/api');
  assert.deepEqual(source.security, [{ ApiBearer: [] }, { WebSession: [] }]);
  assert.equal(source.components.securitySchemes.WebSession.name, '__Host-calovibe-session');
  for (const methods of Object.values(source.paths)) for (const op of Object.values(methods)) {
    if (op['x-required-scopes'].includes('calovibe:write')) {
      assert.deepEqual(op.security, [{ ApiBearer: [] }, { WebSession: [], WebCsrf: [] }]);
      assert.equal(op['x-web-session-requires-origin'], true);
    }
  }
});


test('REG-PHOTO-VERIFY-01 : une correction exige une intention de vérification et refuse un ancien statut true recopié', () => {
  const value = structuredClone(examples.capabilities.find(f => f.tool === 'photo_correct').input);
  delete value.body.data.items[0].verificationAction;
  value.body.data.items[0].nutritionVerified = true;
  accepts(resolvedTools.photo_correct_input, value, false);
  delete value.body.data.items[0].nutritionVerified;
  accepts(resolvedTools.photo_correct_input, value, false);
  value.body.data.items[0].verificationAction = 'verify';
  accepts(resolvedTools.photo_correct_input, value);
});

test('S-FUNC-OP-EXAMPLE-01 : la consultation retourne l’opération demandée par son ID', () => {
  const fixture = examples.capabilities.find(f => f.tool === 'operation_read');
  assert.ok(fixture);
  assert.equal(fixture.response.body.operationId, fixture.input.path.operationId);
});
