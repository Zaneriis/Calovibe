import { readFileSync } from 'node:fs';
import pg from 'pg';
import { readDatabase, trustedUrl } from './config.js';
import { migrate } from './database.js';

let pool: pg.Pool | undefined;
try {
  pool = new pg.Pool({ ...readDatabase(process.env.MIGRATION_DATABASE_FILE ?? ''), query_timeout: 20000 });
  const value: unknown = JSON.parse(readFileSync(process.env.OWNER_CONFIG_FILE ?? '', 'utf8'));
  if (!value || typeof value !== 'object' || !('issuer' in value) || !('subject' in value) ||
      typeof value.issuer !== 'string' || typeof value.subject !== 'string' || !value.subject.trim()) {
    throw new Error('Association propriétaire requise.');
  }
  await migrate(pool, { issuer: trustedUrl(value.issuer), subject: value.subject });
  console.info('Migrations backend appliquées.');
} catch {
  console.error('Migration backend échouée ; aucune modification partielle.');
  process.exitCode = 1;
} finally { await pool?.end(); }
