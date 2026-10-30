// Real backend image + PostgreSQL. Only the JWKS authority and identities are synthetic.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { randomBytes } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const artifacts = path.join(root, 'artifacts');
const project = 'calovibe-backend-' + randomBytes(6).toString('hex');
const directory = path.join(artifacts, project);
const version = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
assert.match(version, /^[a-f0-9]{40}$/);
const env = { ...process.env, BE_SECRET_DIR: directory.replaceAll('\\', '/'), BE_VERSION: version };
const args = ['compose', '--project-name', project, '--file', path.join(root, 'backend/compose.test.yml')];
const checks = [];
const issuer = 'https://identity.test/realms/calovibe';
const owner = 'SYNTHETIC_OWNER_' + randomBytes(16).toString('hex');
const secrets = [owner, randomBytes(24).toString('hex'), randomBytes(24).toString('hex'), randomBytes(24).toString('hex')];

function docker(arguments_, expected = 0) {
  const result = spawnSync('docker', arguments_, { cwd: root, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 360000 });
  if (result.error || result.status !== expected) {
    // Docker may echo container logs; redact before diagnostics.
    let output = (result.stderr ?? '') + (result.stdout ?? '');
    for (const secret of secrets) output = output.replaceAll(secret, '[REDACTED]');
    throw new Error(`Docker échoué (${result.status}) : ${output.slice(-6000)}`);
  }
  return result.stdout.trim();
}
function compose(arguments_, expected = 0) { return docker([...args, ...arguments_], expected); }
function migration() {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [...args, 'run', '--rm', '--no-deps', 'migrate'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve(output) : reject(new Error('Migration concurrente échouée.')));
  });
}
function write(name, value) {
  fs.writeFileSync(path.join(directory, name), typeof value === 'string' ? value : JSON.stringify(value), { mode: 0o600 });
}
async function waitReady(url, expected) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(2500) })).status === expected) return; } catch { /* bounded startup */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('État de disponibilité attendu absent.');
}
function psql(sql) { return compose(['exec', '-T', 'postgres', 'psql', '-U', 'bootstrap', '-d', 'calovibe_test', '-tAc', sql]); }
function record(label) { checks.push(label); console.info('OK : ' + label); }

(async () => {
  fs.mkdirSync(directory, { recursive: true });
  const { generateKeyPair, exportJWK, SignJWT } = await import('jose');
  const key = await generateKeyPair('RS256');
  const other = await generateKeyPair('RS256');
  const publicKey = { ...await exportJWK(key.publicKey), kid: 'synthetic-test', alg: 'RS256', use: 'sig' };
  write('jwks.json', { keys: [publicKey] });
  const openssl = process.env.OPENSSL ?? (process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe' : 'openssl');
  const cert = spawnSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=jwks',
    '-addext', 'subjectAltName=DNS:jwks', '-addext', 'basicConstraints=critical,CA:TRUE',
    '-keyout', path.join(directory, 'tls.key'), '-out', path.join(directory, 'tls.crt')], { encoding: 'utf8' });
  assert.equal(cert.status, 0, 'Génération de CA propre au banc nécessaire.');
  const database = { host: 'postgres', port: 5432, database: 'calovibe_test' };
  write('runtime.json', { ...database, user: 'calovibe_runtime', password: secrets[1] });
  write('migration.json', { ...database, user: 'calovibe_migrator', password: secrets[2] });
  write('bootstrap-password', secrets[3]);
  write('owner.json', { issuer, subject: owner });
  write('bootstrap.sql', `CREATE ROLE calovibe_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${secrets[1]}';
CREATE ROLE calovibe_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${secrets[2]}';
ALTER DATABASE calovibe_test OWNER TO calovibe_migrator;
REVOKE ALL ON DATABASE calovibe_test FROM PUBLIC;
GRANT CONNECT ON DATABASE calovibe_test TO calovibe_runtime;
`);
  // Mount permissions for the non-root image; these are generated fixture files only.
  for (const name of fs.readdirSync(directory)) fs.chmodSync(path.join(directory, name), 0o644);
  const report = { version, dirty: Boolean(spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).stdout.trim()), checks, success: false };
  let started = false, originalFailure;
  try {
    console.info('Construction des images backend isolées.');
    compose(['build', 'backend', 'jwks']);
    compose(['up', '--detach', '--wait', 'postgres', 'jwks', 'backend']);
    started = true;
    const address = compose(['port', 'backend', '3000']);
    assert.match(address, /^127\.0\.0\.1:\d+$/);
    const base = 'http://' + address;
    const request = async (token, status, headers = {}) => {
      const response = await fetch(base + '/api/_technical/status', { headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers }, signal: AbortSignal.timeout(5000) });
      const body = await response.json();
      assert.equal(response.status, status);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      for (const secret of secrets) assert.equal(JSON.stringify(body).includes(secret), false);
      return body;
    };
    await waitReady(base + '/health/ready', 503);
    assert.equal((await fetch(base + '/health/live')).status, 200);
    await request(null, 401);
    record('démarrage réel fermé avant migration ; live200 et ready503');
    const results = await Promise.all([migration(), migration()]);
    assert.equal(results.length, 2);
    assert.equal(psql('SELECT count(*) FROM calovibe.schema_migrations'), '1');
    assert.equal(psql('SELECT count(*) FROM calovibe.owner'), '1');
    await waitReady(base + '/health/ready', 200);
    record('deux migrations concurrentes, une application et un propriétaire');

    const token = async (claims = {}, signingKey = key.privateKey) => new SignJWT({ scope: 'calovibe:read', azp: 'web-client', ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'synthetic-test', typ: 'JWT' })
      .setIssuer(claims.iss ?? issuer).setSubject(claims.sub ?? owner).setAudience(claims.aud ?? 'https://api.test')
      .setIssuedAt(claims.iat ?? Math.floor(Date.now() / 1000)).setExpirationTime(claims.exp ?? '5m').sign(signingKey);
    const valid = await token();
    secrets.push(valid);
    assert.deepEqual(await request(valid, 200), { schemaVersion: '0.1.0', status: 'ready', version });
    await request(await token({ azp: 'mcp-client' }), 200);
    record('JWT API propriétaire : clients web/MCP légitimes, SHA exact');
    for (const claims of [{ iss: 'https://wrong.test' }, { aud: 'https://mcp.test' }, { aud: ['https://api.test', 'https://mcp.test'] },
      { exp: Math.floor(Date.now() / 1000) - 1 }, { nbf: Math.floor(Date.now() / 1000) + 600 }, { iat: Math.floor(Date.now() / 1000) + 600 }]) {
      await request(await token(claims), 401);
    }
    await request(await token({}, other.privateKey), 401);
    await request('not.a.jwt', 401);
    await request(valid, 401, { cookie: '__Host-calovibe-session=SYNTHETIC' });
    await request(null, 401, { authorization: 'Basic SYNTHETIC' });
    await request(await token({ scope: 'calovibe:write' }), 403);
    await request(await token({ sub: 'SYNTHETIC_NON_OWNER' }), 403);
    assert.equal((await fetch(base + '/api/_technical/status?access_token=' + valid)).status, 401);
    assert.equal((await fetch(base + '/api/journal')).status, 404);
    assert.equal(psql('SELECT count(*) FROM calovibe.owner'), '1');
    record('refus issuer/audience exclusive/signature/temps/identité/scope/cookie, sans effet');

    const privileges = compose(['exec', '-T', 'backend', 'node', '--input-type=module', '-e', `
import pg from 'pg'; import {readFileSync,existsSync} from 'node:fs';
const config=JSON.parse(readFileSync('/run/secrets/database.json','utf8'));const p=new pg.Pool(config);
try {const r=await p.query('SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user');
if(Object.values(r.rows[0]).some(Boolean)||existsSync('/run/secrets/migration.json'))process.exitCode=1;
for(const sql of ['CREATE TABLE calovibe.forbidden(id int)','CREATE TABLE public.forbidden(id int)','CREATE SCHEMA forbidden','DELETE FROM calovibe.owner']){
try {await p.query(sql);process.exitCode=1;}catch(e){if(e.code!=='42501')process.exitCode=1;}}
}finally{await p.end();}`]);
    assert.equal(privileges, '');
    record('rôle runtime sans DDL, suppression propriétaire ni secret migrateur');
    write('owner.json', { issuer, subject: 'SYNTHETIC_DIFFERENT' });
    compose(['run', '--rm', '--no-deps', 'migrate'], 1);
    write('owner.json', { issuer, subject: owner });
    fs.mkdirSync(path.join(directory, 'broken'));
    fs.copyFileSync(path.join(root, 'backend/migrations/001_owner.sql'), path.join(directory, 'broken/001_owner.sql'));
    fs.writeFileSync(path.join(directory, 'broken/002_failure.sql'), 'CREATE TABLE calovibe.must_rollback(id int); SELECT missing_failure;');
    compose(['run', '--rm', '--no-deps', '--volume', env.BE_SECRET_DIR + '/broken:/app/backend/migrations:ro', 'migrate'], 1);
    assert.equal(psql("SELECT to_regclass('calovibe.must_rollback') IS NULL"), 't');
    assert.equal(psql('SELECT count(*) FROM calovibe.schema_migrations'), '1');
    await request(valid, 200);
    record('échec SQL atomique et propriétaire existant conservé');
    psql("UPDATE calovibe.schema_migrations SET checksum=repeat('0',64)");
    await waitReady(base + '/health/ready', 503);
    await request(valid, 503);
    const { createHash } = require('node:crypto');
    const checksum = createHash('sha256').update(fs.readFileSync(path.join(root, 'backend/migrations/001_owner.sql'))).digest('hex');
    psql(`UPDATE calovibe.schema_migrations SET checksum='${checksum}'`);
    await waitReady(base + '/health/ready', 200);
    record('version/empreinte de migration incorrecte refuse la disponibilité');

    compose(['stop', 'postgres']);
    await waitReady(base + '/health/ready', 503);
    await request(valid, 503);
    await request(null, 401);
    assert.equal((await fetch(base + '/health/live')).status, 200);
    compose(['up', '--detach', '--wait', 'postgres']);
    await waitReady(base + '/health/ready', 200);
    compose(['restart', 'backend']);
    await waitReady(base + '/health/ready', 200);
    await request(valid, 200);
    assert.equal(psql('SELECT count(*) FROM calovibe.schema_migrations'), '1');
    assert.equal(psql('SELECT count(*) FROM calovibe.owner'), '1');
    record('base réellement arrêtée503 ; redémarrage conserve association et migrations');

    const container = compose(['ps', '--quiet', 'backend']);
    assert.equal(docker(['inspect', '--format', '{{.Config.User}}', container]), '1000:1000');
    const image = 'calovibe-backend:' + version;
    assert.equal(docker(['image', 'inspect', '--format', '{{index .Config.Labels "org.opencontainers.image.revision"}}', image]), version);
    const logs = compose(['logs', '--no-color', 'backend', 'migrate', 'jwks']);
    const history = docker(['history', '--no-trunc', image]);
    for (const secret of secrets) { assert.equal(logs.includes(secret), false); assert.equal(history.includes(secret), false); }
    await new Promise((resolve, reject) => {
      const save = spawn('docker', ['image', 'save', image], { cwd: root, env, stdio: ['ignore', 'pipe', 'ignore'] });
      let tail = Buffer.alloc(0), found = false;
      save.stdout.on('data', chunk => {
        const bytes = Buffer.concat([tail, chunk]);
        if (secrets.some(secret => bytes.includes(Buffer.from(secret)))) found = true;
        tail = bytes.subarray(Math.max(0, bytes.length - 4096));
      });
      save.once('error', reject);
      save.once('close', code => code === 0 && !found ? resolve() : reject(new Error('Inspection des couches image échouée.')));
    });
    report.imageId = docker(['image', 'inspect', '--format', '{{.Id}}', image]);
    record('image SHA non-root ; secrets absents des couches, historique et journaux');
    compose(['stop', 'backend']);
    assert.equal(docker(['inspect', '--format', '{{.State.ExitCode}}', container]), '0');
    assert.equal(psql("SELECT count(*) FROM pg_stat_activity WHERE usename='calovibe_runtime'"), '0');
    await new Promise((resolve, reject) => {
      const socket = net.connect(Number(address.split(':')[1]), '127.0.0.1');
      socket.setTimeout(2000, () => socket.destroy(new Error('Port non fermé.')));
      socket.once('connect', () => { socket.destroy(); reject(new Error('Port encore ouvert.')); });
      socket.once('error', error => error.code === 'ECONNREFUSED' ? resolve() : reject(error));
    });
    record('SIGTERM : code0, port fermé et aucune connexion runtime restante');
    report.success = true;
  } catch (error) {
    originalFailure = error;
    throw error;
  } finally {
    try {
      compose(['down', '--volumes', '--remove-orphans']);
      assert.equal(docker(['ps', '--all', '--quiet', '--filter', 'label=com.docker.compose.project=' + project]), '');
      assert.equal(docker(['volume', 'ls', '--quiet', '--filter', 'label=com.docker.compose.project=' + project]), '');
      report.cleaned = true;
    } catch (cleanupError) {
      report.cleaned = false;
      if (!originalFailure) throw cleanupError;
      console.error('Nettoyage Docker non confirmé ; projet isolé : ' + project);
    } finally {
      assert.equal(path.dirname(path.resolve(directory)), artifacts);
      if (started || fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
      fs.writeFileSync(path.join(artifacts, 'backend-report.json'), JSON.stringify(report, null, 2));
    }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
