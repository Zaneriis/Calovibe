import { readFile } from 'node:fs/promises';

export interface Config {
  issuer: string; jwksUrl: string; tokenEndpoint: string;
  mcpResource: string; apiResource: string; apiBaseUrl: string;
  clientId: string; clientSecret: string; ownerSubject: string;
  version: string; host: string; port: number; timeoutMs: number;
}

function endpoint(value: string, privateHttp = false): URL {
  const url = new URL(value);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash ||
      !(url.protocol === 'https:' || (url.protocol === 'http:' && (loopback || privateHttp)))) {
    throw new Error('Configuration URL invalide.');
  }
  return url;
}

export function validateConfig(config: Config): Config {
  const issuer = endpoint(config.issuer);
  for (const target of [config.jwksUrl, config.tokenEndpoint]) {
    if (endpoint(target).origin !== issuer.origin) throw new Error('Autorité incohérente.');
  }
  const resource = endpoint(config.mcpResource);
  const apiResource = endpoint(config.apiResource);
  const api = endpoint(config.apiBaseUrl, true);
  if (resource.pathname !== '/mcp' || api.pathname !== '/' ||
      resource.href === apiResource.href || !config.clientId || !config.clientSecret || !config.ownerSubject ||
      !/^[a-f0-9]{40}$/.test(config.version) || !Number.isInteger(config.port) || config.port < 0 || config.port > 65535 ||
      !Number.isInteger(config.timeoutMs) || config.timeoutMs < 10 || config.timeoutMs > 30000) {
    throw new Error('Configuration MCP invalide.');
  }
  return Object.freeze({ ...config });
}

export async function loadConfig(env: NodeJS.ProcessEnv = process.env): Promise<Config> {
  function required(name: string): string {
    const value = env[name];
    if (!value) throw new Error('Configuration MCP incomplète.');
    return value;
  }
  async function secret(name: string): Promise<string> {
    const value = (await readFile(required(name), 'utf8')).trim();
    if (!value || value.length > 16384) throw new Error('Fichier de configuration invalide.');
    return value;
  }
  return validateConfig({
    issuer: required('MCP_ISSUER'), jwksUrl: required('MCP_JWKS_URL'), tokenEndpoint: required('MCP_TOKEN_ENDPOINT'),
    mcpResource: required('MCP_RESOURCE'), apiResource: required('MCP_API_RESOURCE'), apiBaseUrl: required('MCP_API_BASE_URL'),
    clientId: required('MCP_CLIENT_ID'), clientSecret: await secret('MCP_CLIENT_SECRET_FILE'),
    ownerSubject: await secret('MCP_OWNER_SUBJECT_FILE'), version: required('APP_VERSION'),
    host: env['MCP_HOST'] ?? '0.0.0.0', port: Number(env['MCP_PORT'] ?? '3002'), timeoutMs: Number(env['MCP_TIMEOUT_MS'] ?? '3000')
  });
}
