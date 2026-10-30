const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createWebServer } = require('../server.cjs');
const { contractApi } = require('./contract-api.cjs');
(async () => {
  const api = await contractApi();
  const app = await createWebServer({ backendOrigin: api.origin });
  const origin = await app.listen({ port: 0, host: '127.0.0.1' });
  api.state.origin = origin;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  page.setDefaultTimeout(6000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const wait = text => page.getByRole('heading', { name: text, exact: true }).waitFor();
  const checks = path.join(__dirname, '../checks'); fs.mkdirSync(checks, { recursive: true });
  try {
    api.state.session = 401;
    await page.goto(origin); await wait('Connectez-vous à votre espace');
    assert.equal(await page.getByRole('link', { name: 'Se connecter' }).getAttribute('href'), '/auth/login');
    assert.equal(await page.locator('input').count(), 0);
    for (const width of [320, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: theme }); await page.reload(); await wait('Connectez-vous à votre espace');
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.keyboard.press('Tab'); assert.equal(await page.locator(':focus').getAttribute('aria-label'), 'Calovibe, accueil');
        await page.keyboard.press('Tab'); assert.match(await page.locator(':focus').textContent(), /Thème/);
        await page.keyboard.press('Enter'); assert.notEqual(await page.locator('html').getAttribute('data-theme'), theme);
        await page.keyboard.press('Enter');
        await page.screenshot({ path: path.join(checks, `${width}-${theme}.png`), fullPage: true });
      }
    }
    api.state.session = 503; await page.reload(); await wait('Connexion au service impossible');
    api.state.session = 200; api.state.status = 200;
    await page.getByRole('button', { name: 'Vérifier à nouveau' }).click(); await wait('Vous êtes connecté');
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    assert.equal(await page.locator('body').textContent().then(text => text.includes('test-csrf-session')), false);
    api.state.logout = 403;
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await page.getByRole('alert').waitFor(); assert.equal(api.state.writes, 0);
    api.state.logout = 503;
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await page.getByRole('alert').filter({ hasText: 'n’a pas pu être confirmée' }).waitFor();
    assert.equal(api.state.writes, 0);
    api.state.logout = 204; api.state.delay = 150;
    await page.getByRole('button', { name: 'Se déconnecter' }).evaluate(button => { button.click(); button.click(); });
    await wait('Connectez-vous à votre espace'); assert.equal(api.state.writes, 1);
    assert.equal(api.state.calls.filter(call => call.url === '/auth/logout').length, 3);
    assert.equal(api.state.calls.at(-1).csrf, 'test-csrf-session');
    api.state.delay = 0; api.state.session = 200; api.state.status = 401;
    await page.reload(); await wait('Connectez-vous à votre espace');
    api.state.status = 403; await page.reload(); await wait('Accès non autorisé');
    assert.equal(await page.getByRole('button', { name: 'Se déconnecter' }).isVisible(), true);
    api.state.malformed = true; await page.reload(); await wait('Connexion au service impossible');
    api.state.malformed = false; api.state.status = 200;
    await page.route('**/api/session', route => route.abort());
    await page.reload(); await wait('Connexion au service impossible');
    await page.unroute('**/api/session');
    await page.getByRole('button', { name: 'Vérifier à nouveau' }).click(); await wait('Vous êtes connecté');
    assert.deepEqual(errors, []);
    console.log('WEB E2E contrat HTTP : nominal, refus401/403, panne/réessai, réponse invalide, CSRF, logout/doubleclic, clavier, 320/1024 clair/sombre : OK. Ce banc ne qualifie pas Keycloak/session backend.');
  } finally { await browser.close(); await app.close(); await api.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
