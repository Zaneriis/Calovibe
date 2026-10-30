import { createApp } from './app.js';
import { readConfig } from './config.js';

try {
  const config = readConfig();
  const app = createApp(config);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 5000);
    deadline.unref();
    try { await app.close(); clearTimeout(deadline); }
    catch { process.exitCode = 1; }
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  await app.listen({ host: config.host, port: config.port });
  console.info('Backend démarré.');
} catch {
  console.error('Démarrage backend refusé ; vérifier la configuration et les secrets montés.');
  process.exitCode = 1;
}
