const { readFileSync } = require('node:fs');
const path = require('node:path');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { Ajv2020 } = require('ajv/dist/2020');
const { default: addFormats } = require('ajv-formats');

/** @typedef {import('ajv').AnySchemaObject} Schema */
/** @typedef {import('openapi-types').OpenAPIV3_1.Document} ApiDocument */
/** @typedef {{name: string, description: string, inputSchema: Schema, outputSchema: Schema,
 * annotations: Record<string, boolean>, 'x-api': {path: string, method: string, operationId: string},
 * 'x-required-scopes': string[]}} ContractTool */
/** @typedef {{contractVersion: string, protocolVersion: string, tools: ContractTool[]}} Manifest */

function createAjv() {
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
  addFormats(ajv, { mode: 'full', formats: ['date', 'date-time', 'uuid', 'json-pointer'] });
  ajv.addFormat('calovibe-base64', value => {
    if (value.length > 13981016) return false;
    const bytes = Buffer.from(value, 'base64');
    return bytes.length <= 10485760 && bytes.toString('base64') === value;
  });
  return ajv;
}

/** @param {string} [directory] */
async function loadContract(directory = __dirname) {
  const apiPath = path.resolve(directory, 'api.openapi.json');
  /** @type {Manifest} */
  const manifest = JSON.parse(readFileSync(path.join(directory, 'mcp-tools.json'), 'utf8'));
  const options = { resolve: { http: false } };
  const api = /** @type {ApiDocument} */ (await SwaggerParser.validate(apiPath, options));
  const schemas = Object.fromEntries(manifest.tools.flatMap(tool => [
    [tool.name + '_input', tool.inputSchema], [tool.name + '_output', tool.outputSchema]
  ]));
  const carrier = { openapi: api.openapi, info: api.info, paths: {}, components: { schemas } };
  const linked = /** @type {ApiDocument} */ (await SwaggerParser.validate(path.join(directory, 'mcp-tools.json'), carrier, options));
  const components = linked.components?.schemas;
  if (!components) throw new Error('Schémas MCP liés absents.');
  const tools = manifest.tools.map(tool => ({ ...tool,
    inputSchema: components[tool.name + '_input'], outputSchema: components[tool.name + '_output'] }));
  const wireTools = tools.map(({ name, description, inputSchema, outputSchema, annotations }) =>
    ({ name, description, inputSchema, outputSchema, annotations }));
  const ajv = createAjv();
  /** @type {Map<Schema, import('ajv').ValidateFunction<unknown>>} */
  const validators = new Map();
  /** @param {Schema} schema @param {unknown} value */
  function validate(schema, value) {
    const validator = validators.get(schema) ?? ajv.compile(schema);
    validators.set(schema, validator);
    return validator(value);
  }
  for (const tool of tools) {
    validate(tool.inputSchema, {});
    validate(tool.outputSchema, {});
  }
  return { api, manifest, tools, wireTools, validate };
}

module.exports = { loadContract, createAjv };
