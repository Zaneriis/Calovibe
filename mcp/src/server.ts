import { createServer } from 'node:http';
import { once } from 'node:events';
import { Server, createMcpHandler, requireBearerAuth, OAuthError, ProtocolError,
  bearerAuthChallengeResponse, getOAuthProtectedResourceMetadataUrl, type Tool } from '@modelcontextprotocol/server';
import { toNodeHandler, hostHeaderValidation } from '@modelcontextprotocol/node';
import { validateConfig, type Config } from './config.js';
import { boundedJson, createSecurity, readScope, record } from './security.js';

const statusSchema = { type: 'object' as const, additionalProperties: false,
  required: ['schemaVersion', 'status', 'version'], properties: {
    schemaVersion: { const: '0.1.0' }, status: { const: 'ready' }, version: { type: 'string', pattern: '^[a-f0-9]{40}$' }
  } };
const tool: Tool = { name: 'calovibe_service_status', description: 'Consulter le statut technique de l’API privée Calovibe.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: statusSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } };

export async function startServer(input: Config) {
  const config = validateConfig(input);
  const stopping = new AbortController();
  const security = createSecurity(config, stopping.signal);
  const resource = new URL(config.mcpResource);
  const metadataUrl = getOAuthProtectedResourceMetadataUrl(resource);
  const authOptions = { verifier: security.verifier, requiredScopes: [readScope],
    expectedResource: resource, resourceMetadataUrl: metadataUrl };
  const authenticate = requireBearerAuth(authOptions);
  const handlers = new Set<ReturnType<typeof createMcpHandler>>();

  async function ready(): Promise<boolean> {
    try {
      const metadata = record(await boundedJson(await security.request(`${config.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`)));
      if (metadata.issuer !== config.issuer || metadata.jwks_uri !== config.jwksUrl ||
          metadata.token_endpoint !== config.tokenEndpoint) return false;
      const keys = record(await boundedJson(await security.request(config.jwksUrl)));
      if (!Array.isArray(keys.keys) || !keys.keys.length) return false;
      const response = await security.request(new URL('/health/ready', config.apiBaseUrl));
      await response.body?.cancel();
      return response.status === 200;
    } catch { return false; }
  }

  const nodeHandler = toNodeHandler({ async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    if (origin && origin !== resource.origin) return new Response(null, { status: 403 });
    if (url.search) return new Response(null, { status: 400 });
    if (url.pathname === '/health/live' && request.method === 'GET') return Response.json({ status: 'live' });
    if (url.pathname === '/health/ready' && request.method === 'GET') {
      const available = await ready();
      return Response.json({ status: available ? 'ready' : 'unavailable' }, { status: available ? 200 : 503 });
    }
    if ([new URL(metadataUrl).pathname, '/.well-known/oauth-protected-resource'].includes(url.pathname)) {
      if (request.method !== 'GET') return new Response(null, { status: 405, headers: { allow: 'GET' } });
      return Response.json({ resource: config.mcpResource, authorization_servers: [config.issuer],
        scopes_supported: [readScope], bearer_methods_supported: ['header'] }, { headers: { 'access-control-allow-origin': '*' } });
    }
    if (url.pathname !== '/mcp') return new Response(null, { status: 404 });
    if (request.headers.has('cookie')) return new Response(null, { status: 400 });
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    let upstreamRefusal: Response | undefined;
    const handler = createMcpHandler(() => {
      const server = new Server({ name: 'calovibe-mcp', version: config.version }, { capabilities: { tools: {} } });
      server.setRequestHandler('tools/list', () => ({ tools: [tool] }));
      server.setRequestHandler('tools/call', async call => {
        if (call.params.name !== tool.name) throw new ProtocolError(-32601, 'Outil inconnu.');
        const args = call.params.arguments;
        if (args !== undefined && (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).length)) {
          throw new ProtocolError(-32602, 'Un objet vide est requis.');
        }
        try {
          const token = await security.delegate(auth.token);
          const response = await security.request(new URL('/api/_technical/status', config.apiBaseUrl), {
            headers: { authorization: `Bearer ${token}`, accept: 'application/json' }
          });
          if (response.status === 401 || response.status === 403) {
            await response.body?.cancel();
            upstreamRefusal = bearerAuthChallengeResponse(new OAuthError(response.status === 401 ? 'invalid_token' : 'insufficient_scope',
              'Accès API refusé.'), authOptions);
            throw new Error('Accès refusé.');
          }
          if (response.status !== 200) { await response.body?.cancel(); throw new Error('Réponse invalide.'); }
          const value = record(await boundedJson(response));
          if (Object.keys(value).sort().join(',') !== 'schemaVersion,status,version' || value.schemaVersion !== '0.1.0' ||
              value.status !== 'ready' || typeof value.version !== 'string' || !/^[a-f0-9]{40}$/.test(value.version)) throw new Error('Réponse invalide.');
          return { resultType: 'complete', structuredContent: value,
            content: [{ type: 'text', text: JSON.stringify(value) }] };
        } catch {
          return { resultType: 'complete', isError: true, content: [{ type: 'text', text: 'API privée indisponible ou délégation refusée.' }] };
        }
      });
      return server;
    }, { legacy: 'reject', responseMode: 'auto', maxRequestBodySize: 65536 });
    handlers.add(handler);
    try {
      const response = await handler.fetch(request, { authInfo: auth });
      return upstreamRefusal ?? response;
    }
    finally { handlers.delete(handler); await handler.close(); }
  } }, { maxRequestBodySize: 65536 });
  const validateHost = hostHeaderValidation([resource.hostname, '127.0.0.1', 'localhost', '[::1]']);
  const http = createServer((req, res) => {
    if (!validateHost(req, res)) return;
    if (!req.method || !req.url) { res.writeHead(400).end(); return; }
    void nodeHandler(req as typeof req & { method: string; url: string }, res).catch(() => {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
      res.end('{"error":"server_error"}');
    });
  });
  http.requestTimeout = 10000;
  http.headersTimeout = 10000;
  http.keepAliveTimeout = 1000;
  http.listen(config.port, config.host);
  await once(http, 'listening');
  let closing: Promise<void> | undefined;
  return { http, address: http.address(), close(): Promise<void> {
    return closing ??= (async () => {
      stopping.abort();
      const closed = new Promise<void>((resolve, reject) => http.close(error => error ? reject(error) : resolve()));
      await Promise.all([...handlers].map(handler => handler.close()));
      http.closeAllConnections();
      await closed;
    })();
  } };
}
