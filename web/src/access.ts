export type View = 'loading' | 'anonymous' | 'connected' | 'forbidden' | 'error';
export type Access = { view: View; csrf: string | null };
export async function readAccess(): Promise<Access> {
  let csrf: string | null = null;
  try {
    const session = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (session.status === 401) return { view: 'anonymous', csrf };
    if (session.status === 403) return { view: 'forbidden', csrf };
    if (!session.ok) throw new Error();
    const data: unknown = await session.json();
    if (!data || typeof data !== 'object' || !('authenticated' in data) || data.authenticated !== true || !('csrfToken' in data) || typeof data.csrfToken !== 'string' || !data.csrfToken) throw new Error();
    csrf = data.csrfToken;
    const status = await fetch('/api/_technical/status', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (status.status === 401) return { view: 'anonymous', csrf: null };
    if (status.status === 403) return { view: 'forbidden', csrf };
    if (!status.ok) throw new Error();
    const result: unknown = await status.json();
    if (!result || typeof result !== 'object' || !('schemaVersion' in result) || result.schemaVersion !== '0.1.0' || !('status' in result) || result.status !== 'ready' || !('version' in result) || typeof result.version !== 'string' || !result.version) throw new Error();
    return { view: 'connected', csrf };
  } catch { return { view: 'error', csrf }; }
}
