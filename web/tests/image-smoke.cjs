const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const image = process.env.WEB_IMAGE;
const version = process.env.WEB_VERSION;
assert.match(version || '', /^[a-f0-9]{40}$/, 'WEB_VERSION must identify the exact source commit');
assert.equal(image, `calovibe-web:${version}`, 'Image tag must identify that same commit');
const name = `calovibe-web-smoke-${randomUUID()}`;
const canary = `synthetic-web-secret-${randomUUID()}`;
const context = fs.mkdtempSync(path.join(os.tmpdir(), 'calovibe-web-image-'));
const canaryFile = path.join(context, '.env.synthetic-secret');
function docker(args, { tolerateFailure = false } = {}) {
  const result = spawnSync('docker', args, { cwd: root, encoding: 'utf8', timeout: 480000, maxBuffer: 8 * 1024 * 1024 });
  if (!tolerateFailure && (result.error || result.status !== 0)) throw new Error(`Docker ${args[0]} failed (status ${result.status}); ` + String(result.stderr || result.stdout || result.error?.message || '').replaceAll(canary, '[redacted synthetic canary]').slice(-6000));
  return result.stdout?.trim() || '';
}
async function response(origin, pathname) {
  return fetch(origin + pathname, { signal: AbortSignal.timeout(3000), redirect: 'manual' });
}
async function smoke() {
  let started = false;
  try {
  for (const file of ['package.json', 'package-lock.json', 'backend/package.json', 'mcp/package.json', 'web/package.json', 'web/Dockerfile', 'web/build.cjs', 'web/server.cjs', 'web/index.html']) {
    const destination = path.join(context, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, file), destination);
  }
  fs.cpSync(path.join(root, 'web/src'), path.join(context, 'web/src'), { recursive: true });
  // No other service source, prototype, host dist or test fixture is in the build context.
  fs.writeFileSync(canaryFile, canary, { flag: 'wx' });
    docker(['build', '--build-arg', `APP_VERSION=${version}`, '--label', `org.opencontainers.image.revision=${version}`, '-t', image, '-f', path.join(context, 'web/Dockerfile'), context]);
    const metadata = JSON.parse(docker(['image', 'inspect', image]))[0];
    assert.equal(metadata.Config.User, 'node', 'Runtime image must select the unprivileged user');
    assert.equal(metadata.Config.Labels['org.opencontainers.image.revision'], version);
    assert(metadata.Config.Env.includes(`APP_VERSION=${version}`));
    assert(!JSON.stringify(metadata).includes(canary), 'Image metadata must not contain the synthetic secret');
    assert(!docker(['history', '--no-trunc', image]).includes(canary), 'Image history must not contain the synthetic secret');
    docker(['run', '-d', '--name', name, '-p', '127.0.0.1::4173', '-e', 'BACKEND_ORIGIN=http://127.0.0.1:9', '-e', `SMOKE_RUNTIME_SECRET=${canary}`, image]);
    started = true;
    const binding = docker(['port', name, '4173/tcp']);
    assert.match(binding, /^127\.0\.0\.1:\d+$/, 'Publish a random port only on loopback');
    const origin = `http://${binding}`;
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { if ((await response(origin, '/health/live')).status === 200) { ready = true; break; } } catch { /* Process may still be starting. */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert(ready, 'Web entry point must become live within 10 seconds');
    const live = await response(origin, '/health/live');
    assert.deepEqual(await live.json(), { status: 'alive' });
    const home = await response(origin, '/'); assert.equal(home.status, 200);
    const html = await home.text(); assert.match(html, /Calovibe/);
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
    assert(assets.some(asset => asset.endsWith('.js')), 'Serve the real React bundle');
    assert(assets.some(asset => asset.endsWith('.css')), 'Serve the real CSS');
    for (const asset of assets) { const result = await response(origin, asset); assert.equal(result.status, 200); assert((await result.text()).length > 0); }
    for (const route of ['/api/admin', '/auth/admin', '/auth/logout', '/api/session/extra', '/api/%73ession']) assert.equal((await response(origin, route)).status, 404, 'Reject proxy routes outside the contract');
    const unavailable = await response(origin, '/api/session');
    assert.equal(unavailable.status, 502, 'Unavailable backend must be visible as failure');
    assert.deepEqual(await unavailable.json(), { error: 'dependency_unavailable' });
    assert.notEqual(docker(['exec', name, 'node', '-e', 'process.stdout.write(String(process.getuid()))']), '0', 'Running process must not be root');
    // Inspect only application files; no secret content is printed, even on failure.
    const scan = `const fs=require('fs'),p=require('path');function walk(dir){for(const n of fs.readdirSync(dir)){const f=p.join(dir,n),s=fs.lstatSync(f);if(s.isDirectory())walk(f);else if(s.isFile()&&fs.readFileSync(f).includes(process.env.SMOKE_RUNTIME_SECRET))process.exit(7)}}walk('/app');for(const f of ['/app/web/src','/app/web/tests','/app/mockups','/app/.env'])if(fs.existsSync(f))process.exit(8);`;
    docker(['exec', name, 'node', '-e', scan]);
    assert(!docker(['logs', name]).includes(canary), 'Runtime logs must not expose the synthetic secret');
    docker(['stop', '--time', '5', name]);
    const stopped = JSON.parse(docker(['inspect', name]))[0].State;
    assert.equal(stopped.Running, false); assert.equal(stopped.ExitCode, 0, 'SIGTERM must stop the real entry point cleanly');
    assert.equal(stopped.OOMKilled, false);
    console.log(`WEB IMAGE ${version} (${metadata.Id}): build independent, nonroot entry point, real assets/live, proxy refusals/outage502, secret canary and SIGTERM: OK. No TLS/Keycloak/session qualification.`);
  } finally {
    if (started) docker(['rm', '-f', name], { tolerateFailure: true });
    assert.equal(path.dirname(context), os.tmpdir());
    fs.rmSync(context, { recursive: true, force: true });
  }
}
smoke().catch(error => { console.error(error.message); process.exitCode = 1; });



