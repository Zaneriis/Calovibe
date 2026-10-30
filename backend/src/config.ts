import { readFileSync } from 'node:fs';
import type { PoolConfig } from 'pg';

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value?.trim()) throw new Error(`Configuration requise : ${name}.`);
  return value;
}

export function trustedUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) {
    throw new Error('URL de confiance HTTPS requise.');
  }
  return value;
}

export function readDatabase(file: string): PoolConfig {
  const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!value || typeof value !== 'object') throw new Error('Configuration base invalide.');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some(key => !['host', 'port', 'database', 'user', 'password'].includes(key)) ||
      !['host', 'database', 'user', 'password'].every(key => typeof data[key] === 'string' && data[key]) ||
      !Number.isInteger(data.port) || Number(data.port) < 1 || Number(data.port) > 65535) {
    throw new Error('Configuration base invalide.');
  }
  return { host: String(data.host), port: Number(data.port), database: String(data.database),
    user: String(data.user), password: String(data.password), max: 5,
    connectionTimeoutMillis: 1500, query_timeout: 2000, statement_timeout: 2000,
    application_name: 'calovibe-backend' };
}

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const version = required(env, 'APP_VERSION');
  if (!/^[a-f0-9]{40}$/.test(version)) throw new Error('APP_VERSION doit être un SHA Git complet.');
  const issuer = trustedUrl(required(env, 'OIDC_ISSUER'));
  const jwksUrl = trustedUrl(required(env, 'OIDC_JWKS_URL'));
  const audience = trustedUrl(required(env, 'API_AUDIENCE'));
  if (issuer === audience || jwksUrl === audience) throw new Error('Ressource API distincte requise.');
  const port = Number(env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT invalide.');
  return { version, issuer, jwksUrl, audience, port, host: env.HOST ?? '0.0.0.0',
    database: readDatabase(required(env, 'DATABASE_CONFIG_FILE')) };
}

export type Config = ReturnType<typeof readConfig>;
