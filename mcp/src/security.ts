import { createRemoteJWKSet, customFetch, jwtVerify, type JWTPayload } from 'jose';
import { OAuthError, type OAuthTokenVerifier } from '@modelcontextprotocol/server';
import type { Config } from './config.js';

export const readScope = 'calovibe:read';
export const accessTokenType = 'urn:ietf:params:oauth:token-type:access_token';
export function scopes(payload: JWTPayload): string[] {
  return typeof payload.scope === 'string' ? payload.scope.split(' ').filter(Boolean) : [];
}

export async function boundedJson(response: Response): Promise<unknown> {
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    await response.body?.cancel();
    throw new Error('Dépendance indisponible.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Réponse invalide.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 65536) throw new Error('Réponse trop grande.');
      chunks.push(part.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } finally { await reader.cancel().catch(() => undefined); }
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Réponse invalide.');
  return value as Record<string, unknown>;
}

export function createSecurity(config: Config, stop: AbortSignal) {
  function request(url: string | URL, init: RequestInit = {}): Promise<Response> {
    return fetch(url, { ...init, redirect: 'error', signal: AbortSignal.any([stop, AbortSignal.timeout(config.timeoutMs)]) });
  }
  const jwks = createRemoteJWKSet(new URL(config.jwksUrl), {
    timeoutDuration: config.timeoutMs,
    [customFetch]: async (url, init) => Response.json(await boundedJson(await request(url, init)))
  });
  async function verify(token: string, audience: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, jwks, { issuer: config.issuer, audience,
      algorithms: ['RS256'], requiredClaims: ['sub', 'aud', 'exp', 'iat'] });
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (aud.length !== 1 || aud[0] !== audience || !payload.sub ||
        typeof payload.iat !== 'number' || payload.iat > Math.floor(Date.now() / 1000)) throw new Error('Jeton invalide.');
    return payload;
  }
  const verifier: OAuthTokenVerifier = { async verifyAccessToken(token) {
    let payload: JWTPayload;
    try { payload = await verify(token, config.mcpResource); }
    catch { throw new OAuthError('invalid_token', 'Authentification requise.'); }
    if (payload.sub !== config.ownerSubject) throw new OAuthError('insufficient_scope', 'Accès refusé.');
    return { token, clientId: typeof payload.azp === 'string' ? payload.azp : '',
      scopes: scopes(payload), expiresAt: payload.exp!, resource: new URL(config.mcpResource) };
  } };
  async function delegate(token: string): Promise<string> {
    const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      client_id: config.clientId, client_secret: config.clientSecret, subject_token: token,
      subject_token_type: accessTokenType, requested_token_type: accessTokenType,
      audience: config.apiResource, scope: readScope });
    const response = await request(config.tokenEndpoint, { method: 'POST', body });
    if (response.status !== 200) { await response.body?.cancel(); throw new Error('Échange refusé.'); }
    const result = record(await boundedJson(response));
    if (typeof result.token_type !== 'string' || result.token_type.toLowerCase() !== 'bearer' || result.issued_token_type !== accessTokenType ||
        typeof result.access_token !== 'string' || result.access_token === token) throw new Error('Échange refusé.');
    const payload = await verify(result.access_token, config.apiResource);
    const roles = payload.api_roles;
    if (payload.sub !== config.ownerSubject || payload.azp !== config.clientId ||
        scopes(payload).length !== 1 || scopes(payload)[0] !== readScope ||
        !Array.isArray(roles) || roles.length !== 1 || roles[0] !== 'read') throw new Error('Délégation refusée.');
    return result.access_token;
  }
  return { request, verifier, delegate };
}
