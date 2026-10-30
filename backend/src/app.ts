import Fastify from 'fastify';
import { createRemoteJWKSet, jwtVerify, errors } from 'jose';
import pg from 'pg';
import type { Config } from './config.js';
import { schemaReady } from './database.js';

function failure(code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'DEPENDENCY_UNAVAILABLE') {
  return { schemaVersion: '0.1.0', code, message: 'Requête non exécutée.', fields: [], operationId: null };
}

export function createApp(config: Config) {
  // No request logger: credentials, subjects and database details never enter logs.
  const app = Fastify({ logger: false, bodyLimit: 65536, requestTimeout: 5000 });
  const pool = new pg.Pool(config.database);
  pool.on('error', () => { /* A lost idle connection is handled by subsequent readiness/query checks. */ });
  const jwks = createRemoteJWKSet(new URL(config.jwksUrl), { timeoutDuration: 2000, cooldownDuration: 1000 });
  app.addHook('onClose', async () => { await pool.end(); });
  app.addHook('onSend', async (_request, reply) => { reply.header('cache-control', 'no-store'); });
  app.setErrorHandler((_error, _request, reply) => reply.code(500).send({ message: 'Erreur interne.' }));
  app.get('/health/live', async () => ({ status: 'alive' }));
  app.get('/health/ready', async (_request, reply) => {
    try {
      if (await schemaReady(pool)) return { status: 'ready' };
    } catch { /* Readiness intentionally reveals no dependency configuration. */ }
    return reply.code(503).send({ status: 'unavailable' });
  });
  app.get('/api/_technical/status', async (request, reply) => {
    const authorization = request.headers.authorization;
    const reject = (status: 401 | 403 | 503) => {
      if (status === 401) reply.header('www-authenticate', 'Bearer');
      if (status === 403) reply.header('www-authenticate', 'Bearer error="insufficient_scope", scope="calovibe:read"');
      return reply.code(status).send(failure(status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : 'DEPENDENCY_UNAVAILABLE'));
    };
    const authHeaders = request.raw.rawHeaders.filter((_value, index, headers) => index % 2 === 0 && headers[index]?.toLowerCase() === 'authorization').length;
    if (authHeaders !== 1 || request.headers.cookie || !authorization || !/^Bearer [^\s,]+$/i.test(authorization)) return reject(401);
    let subject: string;
    try {
      const { payload } = await jwtVerify(authorization.slice(7), jwks, {
        issuer: config.issuer, audience: config.audience, algorithms: ['RS256'],
        requiredClaims: ['iss', 'sub', 'aud', 'exp', 'iat'], clockTolerance: 0
      });
      if (payload.aud !== config.audience && !(Array.isArray(payload.aud) && payload.aud.length === 1 && payload.aud[0] === config.audience)) return reject(401);
      if (!payload.sub || (payload.iat ?? Infinity) > Math.floor(Date.now() / 1000)) return reject(401);
      if (typeof payload.scope !== 'string' || !payload.scope.split(' ').includes('calovibe:read')) return reject(403);
      subject = payload.sub;
    } catch (error) {
      // Availability failures are not converted to authentication successes.
      if (error instanceof errors.JWKSTimeout || (error instanceof TypeError && error.message === 'fetch failed')) return reject(503);
      return reject(401);
    }
    try {
      const owner = await pool.query<{ issuer: string; subject: string }>('SELECT issuer, subject FROM calovibe.owner WHERE singleton = true');
      if (owner.rows.length !== 1 || owner.rows[0]?.issuer !== config.issuer || owner.rows[0]?.subject !== subject) return reject(403);
      if (!await schemaReady(pool)) return reject(503);
      return { schemaVersion: '0.1.0', status: 'ready', version: config.version };
    } catch { return reject(503); }
  });
  return app;
}
