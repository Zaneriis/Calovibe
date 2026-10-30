const assert = require('node:assert/strict');
const { test } = require('node:test');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const schema = require('../shared/contracts/data.schema.json');
const validExamples = require('../shared/contracts/examples/valid.json');
const invalidExamples = require('../shared/contracts/examples/invalid.json');
const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
addFormats(ajv, { mode: 'full', formats: ['date', 'date-time', 'uuid', 'json-pointer'] });
ajv.addSchema(schema);
const validators = Object.fromEntries(Object.keys(schema.$defs).map(name =>
  [name, ajv.getSchema(`${schema.$id}#/$defs/${name}`)]));
function accepts(definition, value, expected) {
  const validate = validators[definition];
  assert.equal(typeof validate, 'function', `definition ${definition}`);
  assert.equal(validate(value), expected,
    `${definition}: ${JSON.stringify(value)} ${JSON.stringify(validate.errors)}`);
}

test('schema et toutes ses definitions compilent en mode strict Draft 2020-12', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(ajv.validateSchema(schema), true);
  for (const validate of Object.values(validators)) assert.equal(typeof validate, 'function');
});

for (const [label, fixtures, expected] of [
  ['valide', validExamples, true], ['invalide', invalidExamples, false]
]) {
  fixtures.forEach(({ definition, value }, index) => test(`exemple ${label} ${index + 1}: ${definition}`, () => {
    accepts(definition, value, expected);
    if (expected) assert.equal(ajv.validate(schema.$id, value), true);
  }));
}

test('quantites exactes : bornes, precision et syntaxe JSON', () => {
  for (const value of ['0.001', '1', '1.0', '1.001', '999999.999', '1000000', '1000000.000']) accepts('quantity', value, true);
  for (const value of ['0', '0.0', '0.00', '0.000', '-0.001', '1000001', '1000000.001', '01', '.5', '1.', '1e3', '1,5', ' 1', '1\n', 'NaN', 'Infinity', null, 1]) accepts('quantity', value, false);
});

test('nutrition : null et zero explicite restent distincts, absence refusee', () => {
  const values = structuredClone(validExamples[0].value.snapshot.reference.nutrition);
  accepts('nutrition', values, true);
  assert.equal(values.proteinG, '0');
  assert.equal(values.fatG, null);
  for (const value of [-1, 0, '', '-1', '0.0001']) accepts('nutrition', { ...values, kcal: value }, false);
  for (const key of Object.keys(values)) {
    const incomplete = { ...values }; delete incomplete[key];
    accepts('nutrition', incomplete, false);
  }
});

test('dates reelles : siecles, mois, annees bissextiles et contexte UTC', () => {
  for (const value of ['2000-02-29', '2028-02-29', '2026-10-25', '2026-03-29']) accepts('localDate', value, true);
  for (const value of ['1900-02-29', '2100-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026-1-01', '0000-01-01']) accepts('localDate', value, false);
  for (const value of ['2026-03-28T23:00:00Z', '2026-03-29T01:00:00Z', '2026-10-25T01:00:00.123Z']) accepts('utcTimestamp', value, true);
  for (const value of ['2026-02-29T01:00:00Z', '2026-10-23T24:00:00Z', '2026-10-23T12:00:00', '2026-10-23T12:00:00+00:00']) accepts('utcTimestamp', value, false);
});

test('versions positives representables exactement et UUID sans coercition', () => {
  for (const value of [1, 9007199254740991]) accepts('version', value, true);
  for (const value of [0, -1, 1.1, '1', 9007199254740992]) accepts('version', value, false);
  accepts('uuid', '11111111-1111-4111-8111-111111111111', true);
  accepts('uuid', '11111111-1111-4111-8111-11111111111z', false);
});

test('entree : quantite consommee et base originale sont deux donnees requises', () => {
  const entry = structuredClone(validExamples[0].value);
  assert.equal(entry.quantity, '150');
  assert.equal(entry.snapshot.reference.quantity, '100');
  assert.equal(entry.snapshot.reference.nutrition.kcal, '200');
  for (const key of Object.keys(entry)) {
    const incomplete = { ...entry }; delete incomplete[key];
    accepts('journalEntry', incomplete, false);
  }
  accepts('journalEntry', { ...entry, localDate: '2026-02-29' }, false);
  accepts('journalEntry', { ...entry, meal: 'today' }, false);
  accepts('journalEntry', { ...entry, schemaVersion: '1.0.0' }, false);
  accepts('journalEntry', { ...entry, unexpected: 'refuse' }, false);
  const noReference = structuredClone(entry); delete noReference.snapshot.reference;
  accepts('journalEntry', noReference, false);
});

test('objectifs : date effet, origine et formule explicites', () => {
  const goals = structuredClone(validExamples[1].value);
  accepts('goals', goals, true);
  accepts('goals', { ...goals, effectiveDate: '2026-02-29' }, false);
  accepts('goals', { ...goals, origin: 'calculated', formulaVersion: 'proposal-unimplemented-v1' }, true);
  accepts('goals', { ...goals, origin: 'calculated', formulaVersion: null }, false);
  accepts('goals', { ...goals, formulaVersion: 'formula-for-manual' }, false);
});

test('creation sans version et modification/annulation avec chaque cible versionnee', () => {
  const change = structuredClone(validExamples[3].value);
  const undo = structuredClone(validExamples[4].value);
  accepts('mutation', { ...change, action: 'delete' }, true);
  for (const definition of ['mutation', 'undo']) {
    const value = definition === 'mutation' ? change : undo;
    accepts(definition, { ...value, targets: [] }, false);
    accepts(definition, { ...value, targets: [{ id: value.operationId }] }, false);
    accepts(definition, { ...value, targets: [{ id: value.operationId, expectedVersion: 0 }] }, false);
  }
  accepts('mutation', { ...validExamples[2].value, expectedVersion: 1 }, false);
  const noTargetOperation = { ...undo }; delete noTargetOperation.targetOperationId;
  accepts('undo', noTargetOperation, false);
});

test('erreurs : categorie connue et ambiguite structuree sans echo des valeurs', () => {
  const error = structuredClone(validExamples.at(-1).value);
  accepts('error', { ...error, code: 'OTHER' }, false);
  accepts('error', { ...error, fields: [] }, false);
  accepts('error', { ...error, fields: [{ path: '/quantity', reason: 'ambiguous' }] }, true);
  accepts('error', { ...error, fields: [{ path: 'quantity', reason: 'required' }] }, false);
  accepts('error', { ...error, fields: [{ path: '/quantity', reason: 'invalid', value: 'echo interdit' }] }, false);
});
