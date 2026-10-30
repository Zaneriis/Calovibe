import { loadConfig } from './config.js';
import { startServer } from './server.js';

try {
  const server = await startServer(await loadConfig());
  console.info('MCP démarré.');
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    void server.close().then(() => { clearTimeout(deadline); console.info('MCP arrêté.'); }, () => { process.exitCode = 1; });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
} catch {
  console.error('Démarrage MCP impossible : vérifier la configuration et les fichiers montés.');
  process.exitCode = 1;
}
