// SYNTHÉTIQUE : serveur de contrat de test, sans OAuth, SQL ni logique alimentaire.
const http = require('node:http');
const { once } = require('node:events');
const { Client, StreamableHTTPClientTransport } = require('@modelcontextprotocol/client');
const { Server, createMcpHandler, requireBearerAuth, OAuthError, ProtocolError,
  bearerAuthChallengeResponse } = require('@modelcontextprotocol/server');
const { toNodeHandler, localhostHostValidation, localhostOriginValidation } = require('@modelcontextprotocol/node');
const fixtures = require('../../../shared/contracts/examples/api-mcp-valid.json').capabilities;
const invalid = require('../../../shared/contracts/examples/api-mcp-invalid.json');
const errorFixtures = require('../../../shared/contracts/examples/api-mcp-errors.json');
const TOKENS = { read: 'SYNTHETIC_MCP_READ', write: 'SYNTHETIC_MCP_WRITE', both: 'SYNTHETIC_MCP_READ_WRITE' };
const API_TOKENS = { 'calovibe:read': 'SYNTHETIC_API_READ', 'calovibe:write': 'SYNTHETIC_API_WRITE' };

function toolError(code) {
  return { schemaVersion: '0.1.0', code, message: 'Requête synthétique non exécutée.', fields: [], operationId: null };
}
function toolResult(value, isError) {
  const structuredContent = isError ? { ok: false, error: value } : { ok: true, data: value };
  return { resultType: 'complete', isError, structuredContent,
    content: [{ type: 'text', text: JSON.stringify(structuredContent) }] };
}
async function listen(server) {
  server.requestTimeout = 3000;
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}
async function closeServer(server) {
  if (!server?.listening) return;
  const closed = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  server.closeAllConnections();
  await closed;
}

async function startReference(contract) {
  const clients = [];
  const ref = { apiCalls: [], wire: [], responses: [], wireResults: [], fixture: fixtures[0], reply: fixtures[0].response, disconnect: false };
  let apiServer, mcpServer, stopping;
  ref.close = () => stopping ??= (async () => {
    const outcomes = await Promise.allSettled(clients.map(client => client.close()));
    outcomes.push(...await Promise.allSettled([closeServer(mcpServer), closeServer(apiServer)]));
    const failures = outcomes.filter(result => result.status === 'rejected').map(result => result.reason);
    if (failures.length) throw new AggregateError(failures, 'Arrêt de la référence synthétique échoué.');
  })();
  ref.setFixture = fixture => { ref.fixture = fixture; ref.reply = fixture.response; ref.disconnect = false; };
  try {
    apiServer = http.createServer(async (req, res) => {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const text = Buffer.concat(chunks).toString();
        const tool = contract.tools.find(candidate => candidate.name === ref.fixture.tool);
        const apiCredentialAccepted = req.headers.authorization === `Bearer ${API_TOKENS[tool['x-required-scopes'][0]]}`;
        ref.apiCalls.push({ method: req.method, url: req.url, body: text ? JSON.parse(text) : undefined, apiCredentialAccepted });
        if (!apiCredentialAccepted) { res.writeHead(401).end(); return; }
        if (ref.disconnect) { req.socket.destroy(); return; }
        if (ref.reply === null) return; // Réponse pendante de fixture pour vérifier le délai de l'adaptateur.
        res.writeHead(ref.reply.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(ref.reply.body));
      } catch { res.writeHead(500).end(); }
    });
    ref.apiUrl = await listen(apiServer);
    const validateHost = localhostHostValidation();
    const validateOrigin = localhostOriginValidation();
    const verifier = { async verifyAccessToken(token) {
      const scopes = token === TOKENS.read ? ['calovibe:read'] : token === TOKENS.write ? ['calovibe:write']
        : token === TOKENS.both ? ['calovibe:read', 'calovibe:write'] : null;
      if (!scopes) throw new OAuthError('invalid_token', 'Identité SYNTHÉTIQUE absente.');
      return { token, clientId: 'synthetic-reference', scopes, expiresAt: Math.floor(Date.now() / 1000) + 60,
        resource: ref.mcpUrl };
    } };
    const nodeHandler = toNodeHandler({ async fetch(request) {
      const auth = await requireBearerAuth({ verifier, expectedResource: new URL(ref.mcpUrl) })(request);
      if (auth instanceof Response) { ref.responses.push(auth.status); return auth; }
      // Le clone est borné par l'adaptateur ; parsedBody évite un second décodage par le SDK.
      let parsedBody;
      try { parsedBody = await request.clone().json(); } catch { /* Le SDK conserve l'erreur protocolaire. */ }
      const tool = parsedBody?.method === 'tools/call' && contract.tools.find(candidate => candidate.name === parsedBody.params?.name);
      if (tool) {
        const allowed = await requireBearerAuth({ verifier, requiredScopes: tool['x-required-scopes'],
          expectedResource: new URL(ref.mcpUrl) })(request);
        if (allowed instanceof Response) { ref.responses.push(allowed.status); return allowed; }
      }
      ref.wire.push({ method: parsedBody?.method, name: parsedBody?.params?.name,
        version: request.headers.get('mcp-protocol-version'), meta: parsedBody?.params?._meta });
      let upstreamRefusal;
      const handler = createMcpHandler(() => {
        const server = new Server({ name: 'calovibe-SYNTHETIC-reference', version: '0.1.0' }, { capabilities: { tools: {} } });
        server.setRequestHandler('tools/list', () => ({ tools: contract.wireTools }));
        server.setRequestHandler('tools/call', async call => {
          const selected = contract.tools.find(candidate => candidate.name === call.params.name);
          if (!selected) throw new ProtocolError(-32601, 'Outil synthétique inconnu.');
          const args = call.params.arguments ?? {};
          if (!contract.validate(selected.inputSchema, args)) return toolResult(toolError('VALIDATION'), true);
          const operation = selected['x-api'];
          const route = operation.path.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(args.path[key]));
          const url = new URL(`/api${route}`, ref.apiUrl);
          for (const [key, value] of Object.entries(args.query ?? {})) url.searchParams.set(key, String(value));
          let result;
          try {
            const response = await fetch(url, { method: operation.method.toUpperCase(),
              headers: { 'content-type': 'application/json', authorization: `Bearer ${API_TOKENS[selected['x-required-scopes'][0]]}` },
              body: args.body === undefined ? undefined : JSON.stringify(args.body), signal: AbortSignal.timeout(2000) });
            if (response.status === 401 || response.status === 403) {
              upstreamRefusal = bearerAuthChallengeResponse(new OAuthError(response.status === 401 ? 'invalid_token' : 'insufficient_scope',
                'Refus API SYNTHÉTIQUE.'), { requiredScopes: selected['x-required-scopes'] });
              return toolResult(toolError('DEPENDENCY_UNAVAILABLE'), true);
            }
            const value = await response.json();
            const schema = contract.api.paths[operation.path][operation.method].responses[String(response.status)]?.content?.['application/json']?.schema;
            result = schema && contract.validate(schema, value) ? toolResult(value, !response.ok)
              : toolResult(toolError('DEPENDENCY_UNAVAILABLE'), true);
          } catch { result = toolResult(toolError('DEPENDENCY_UNAVAILABLE'), true); }
          if (!contract.validate(selected.outputSchema, result.structuredContent)) throw new Error('Sortie synthétique hors contrat.');
          return server.projectCallToolResult(result, selected.outputSchema);
        });
        return server;
      }, { legacy: 'reject', responseMode: 'auto', maxRequestBodySize: 65536 });
      try {
        const response = await handler.fetch(request, { authInfo: auth, parsedBody });
        const output = upstreamRefusal ?? response;
        if (output.headers.get('content-type')?.includes('application/json')) {
          ref.wireResults.push({ method: parsedBody?.method, body: await output.clone().json() });
        }
        ref.responses.push(output.status);
        return output;
      } finally { await handler.close(); }
    } }, { maxRequestBodySize: 65536 });
    mcpServer = http.createServer((req, res) => {
      if (!validateHost(req, res) || !validateOrigin(req, res)) return;
      if (req.url !== '/mcp') { res.writeHead(404).end(); return; }
      void nodeHandler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
    });
    ref.mcpUrl = `${await listen(mcpServer)}/mcp`;
    ref.connect = async (token = TOKENS.both) => {
      const client = new Client({ name: 'calovibe-SYNTHETIC-client', version: '0.1.0' }, {
        versionNegotiation: { mode: { pin: contract.manifest.protocolVersion } }, jsonSchemaValidator: { getValidator(schema) {
          return value => contract.validate(schema, value)
            ? { valid: true, data: value, errorMessage: undefined }
            : { valid: false, data: undefined, errorMessage: 'Réponse synthétique hors contrat.' };
        } } });
      const transport = new StreamableHTTPClientTransport(new URL(ref.mcpUrl), {
        requestInit: { headers: token ? { authorization: `Bearer ${token}` } : {} }, onInsufficientScope: 'throw' });
      clients.push(client);
      await client.connect(transport, { timeout: 3000 });
      return client;
    };
    return ref;
  } catch (error) { await ref.close(); throw error; }
}

module.exports = { startReference, fixtures, invalid, errorFixtures, TOKENS };
