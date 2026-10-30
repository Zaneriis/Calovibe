import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const migrationDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));
export function migrations(directory = migrationDirectory) {
  return readdirSync(directory).filter(name => /^\d{3}_[a-z_]+\.sql$/.test(name)).sort().map(name => {
    const sql = readFileSync(`${directory}/${name}`, 'utf8');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  });
}

export async function schemaReady(pool: pg.Pool): Promise<boolean> {
  const expected = migrations();
  const result = await pool.query<{ name: string; checksum: string }>(
    'SELECT name, checksum FROM calovibe.schema_migrations ORDER BY name');
  return expected.length > 0 && result.rows.length === expected.length &&
    result.rows.every((row, index) => row.name === expected[index]?.name && row.checksum === expected[index]?.checksum);
}

export async function migrate(pool: pg.Pool, owner: { issuer: string; subject: string }, directory = migrationDirectory) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 15000');
    await client.query('SELECT pg_advisory_xact_lock(738120446661::bigint)');
    await client.query('CREATE SCHEMA IF NOT EXISTS calovibe');
    await client.query(`CREATE TABLE IF NOT EXISTS calovibe.schema_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const applied = await client.query<{ name: string; checksum: string }>(
      'SELECT name, checksum FROM calovibe.schema_migrations ORDER BY name');
    const available = migrations(directory);
    if (applied.rows.some((row, index) => row.name !== available[index]?.name || row.checksum !== available[index]?.checksum)) {
      throw new Error('Historique des migrations incompatible.');
    }
    for (const item of available.slice(applied.rows.length)) {
      await client.query(item.sql);
      await client.query('INSERT INTO calovibe.schema_migrations(name, checksum) VALUES ($1, $2)', [item.name, item.checksum]);
    }
    await client.query(`INSERT INTO calovibe.owner(singleton, issuer, subject) VALUES (true, $1, $2)
      ON CONFLICT (singleton) DO NOTHING`, [owner.issuer, owner.subject]);
    const existing = await client.query<{ issuer: string; subject: string }>('SELECT issuer, subject FROM calovibe.owner');
    if (existing.rows.length !== 1 || existing.rows[0]?.issuer !== owner.issuer || existing.rows[0]?.subject !== owner.subject) {
      throw new Error('Association propriétaire existante différente ; migration annulée.');
    }
    await client.query('GRANT USAGE ON SCHEMA calovibe TO calovibe_runtime');
    await client.query('GRANT SELECT ON ALL TABLES IN SCHEMA calovibe TO calovibe_runtime');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
