const path = require('node:path');
const Fastify = require('fastify');
const staticFiles = require('@fastify/static');
const proxy = require('@fastify/http-proxy');
const allowed = new Map([['/api/session', 'GET'], ['/api/_technical/status', 'GET'], ['/auth/login', 'GET'], ['/auth/callback', 'GET'], ['/auth/logout', 'POST']]);
function upstreamOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('BACKEND_ORIGIN doit être une origine HTTP(S) fixe.');
  return url.origin;
}
async function createWebServer({ backendOrigin, directory = path.join(__dirname, 'dist') } = {}) {
  const upstream = upstreamOrigin(backendOrigin);
  const app = Fastify({ logger: false, trustProxy: false });
  app.addHook('onRequest', async (request, reply) => {
    const pathname = request.raw.url.split('?')[0];
    if ((pathname.startsWith('/api') || pathname.startsWith('/auth')) && allowed.get(pathname) !== request.method) return reply.code(404).send({ error: 'not_found' });
  });
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cache-Control', 'no-store');
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  });
  app.get('/health/live', async () => ({ status: 'alive' }));
  for (const prefix of ['/api', '/auth']) await app.register(proxy, { upstream, prefix, rewritePrefix: prefix, httpMethods: ['GET', 'POST'], replyOptions: { retryDelay: () => null, onError: reply => reply.code(502).send({ error: 'dependency_unavailable' }) } });
  await app.register(staticFiles, { root: directory, wildcard: false, index: 'index.html' });
  app.setErrorHandler((_error, _request, reply) => reply.code(502).send({ error: 'dependency_unavailable' }));
  return app;
}
if (require.main === module) {
  createWebServer({ backendOrigin: process.env.BACKEND_ORIGIN }).then(async app => {
    const stop = () => { app.close().catch(() => { process.exitCode = 1; }); };
    process.once('SIGTERM', stop); process.once('SIGINT', stop);
    await app.listen({ port: Number(process.env.PORT || 4173), host: process.env.HOST || '127.0.0.1' });
  }).catch(() => { console.error('Démarrage web impossible : vérifier la configuration et les actifs.'); process.exitCode = 1; });
}
module.exports = { createWebServer, upstreamOrigin };


