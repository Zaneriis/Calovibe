const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const source = path.join(__dirname, '..', 'calovibe-photo.html');
const { createPreviewServer } = require('../../preview.cjs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1000 }, timezoneId: 'UTC' });
  const errors = [];
  await page.clock.install({ time: new Date('2026-10-22T10:00:00Z') });
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(6000);
  try {
    await page.setContent('<style>body{margin:0}[hidden]{display:none!important}</style>' + fs.readFileSync(source, 'utf8'));
    await page.addScriptTag({ path: require.resolve('lucide/dist/umd/lucide.js') });
    await page.evaluate(() => globalThis.lucide?.createIcons());
    const app = page.locator('[data-variant]').first();
    await app.locator('[data-photo-name="0"]').click();
    await app.locator('[data-photo-key="name"]').first().fill('Tofu');
    assert.equal(await app.locator('[data-photo-confirm]').isDisabled(), true);
    await app.locator('[data-photo-check-values="0"]').click();
    assert.equal(await app.locator('[data-photo-confirm]').isEnabled(), true);
    await app.locator('[data-photo-missing]').click();
    assert.equal(await app.locator('[data-photo-confirm]').isDisabled(), true);
    await app.locator('.cv-photo-remove[data-photo-remove="4"]').click();
    await app.locator('[data-photo-cancel]').click();
    await app.locator('[data-add="2"]').click();
    await app.locator('[data-flow-method="manual"]').click();
    await app.locator('[data-food-search]').fill('Pomme');
    await app.locator('[data-select-food="1"]').click();
    await app.locator('input[name="quantity"]').fill('123');
    await app.locator('[data-portion-form] button[type="submit"]').click();
    assert.match(await app.locator('.cv-meals>.cv-card').nth(2).innerText(), /Pomme/);
    assert.doesNotMatch(await app.locator('.cv-meals>.cv-card').nth(1).innerText(), /Pomme/);
    await app.locator('.cv-home-name').filter({ hasText: 'Pomme' }).click();
    await app.locator('[data-flow-back]').click();
    assert.equal(await app.locator('.cv-layout').isVisible(), true);
    await app.locator('[data-shift="1"]').click();
    assert.match(await app.locator('.cv-consumed').innerText(), /^0$/);
    assert.equal((await app.locator('.cv-water-value').innerText()).replace(/\s/g, ''), '0');
    await app.locator('[data-water="250"]').click();
    await app.locator('[data-today]').click();
    assert.equal((await app.locator('.cv-water-value').innerText()).replace(/\s/g, ''), '1250');
    assert.match(await app.locator('.cv-meals>.cv-card').nth(2).innerText(), /Pomme/);
    await app.locator('[data-add="2"]').click();
    await app.locator('[data-flow-method="manual"]').click();
    await app.locator('[data-custom-food]').click();
    await app.locator('[name="foodname"]').fill('Mon plat');
    for (const [key, value] of Object.entries({ k: '500', p: '20', l: '10', g: '50' })) await app.locator(`[name="${key}"]`).fill(value);
    await app.locator('[data-custom-form] button[type="submit"]').click();
    await app.locator('[data-flow-back]').click();
    assert.equal(await app.locator('[name="foodname"]').inputValue(), 'Mon plat');
    assert.equal(await app.locator('[name="k"]').inputValue(), '500');
    await app.locator('[data-custom-form] button[type="submit"]').click();
    await app.locator('[name="quantity"]').fill('1000');
    await app.locator('[data-portion-form] button[type="submit"]').click();
    assert.match(await app.locator('.cv-ring-core').innerText(), /Dépassement/);
    await app.locator('[data-undo-journal]').click();
    assert.doesNotMatch(await app.locator('.cv-meals>.cv-card').nth(2).innerText(), /Mon plat/);
    assert.match(await app.locator('.cv-meals>.cv-card').nth(2).innerText(), /Pomme/);
    for (const width of [1024, 768, 410, 360, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Débordement à ${width}px`);
    }
    assert.deepEqual(errors, []);
    const checkDir=path.join(__dirname,'..','..','..','artifacts','browser');fs.mkdirSync(checkDir,{recursive:true});
    await page.setViewportSize({width:1024,height:1000});
    await page.setContent('<style>body{margin:0}[hidden]{display:none!important}</style>'+fs.readFileSync(source,'utf8'));
    for(const [variant,label] of ['desktop-light','desktop-dark','phone-light','phone-dark'].entries()){
      await page.evaluate(i=>document.querySelectorAll('#cv-preview>[data-variant]').forEach((s,n)=>s.hidden=n!==i),variant);
      const surface=page.locator('[data-variant]').nth(variant);
      await surface.locator('[data-photo-name="0"]').press('Enter');
      assert.equal(await surface.locator('.cv-photo-editor').first().isVisible(),true);
      await surface.locator('[data-photo-name="0"]').press('Enter');
      assert.equal(await surface.locator('.cv-photo-editor').first().isHidden(),true);
      for(const width of [320,360,410,768,1024]){
        await page.setViewportSize({width,height:1000});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${label} déborde à ${width}px`);
      }
      await page.setViewportSize({width:variant<2?1024:410,height:1000});
      await surface.locator('.cv-app').screenshot({path:path.join(checkDir,label+'.png')});
    }
    assert.deepEqual(errors,[]);
    // Exercise the real local preview: no test-injected icon library or carousel host.
    const server = createPreviewServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    try {
      assert.equal((await fetch(url + '/missing')).status, 404);
      assert.equal((await fetch(url, { method: 'POST' })).status, 405);
      await page.clock.setFixedTime(new Date('2026-12-31T23:30:00Z'));
      await page.goto(url);
      const web = page.locator('[data-variant]').first();
      assert.equal(await page.locator('[data-variant]:visible').count(), 1);
      assert.equal(await page.locator('[role="tab"]').count(), 0);
      assert.equal(await web.locator('input[type="date"]').count(), 0);
      assert.match(await web.locator('.cv-date').innerText(), /1 janvier 2027/);
      assert.equal(await web.locator('[data-date="2027-01-01"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await web.locator('i[data-lucide]').count(), 0, 'Toutes les icônes doivent être rendues');
      assert.ok(await web.locator('svg[data-lucide]').count() > 20);
      await web.locator('[data-shift="-1"]').press('Enter');
      assert.match(await web.locator('.cv-date').innerText(), /25 décembre 2026/);
      assert.equal(await web.locator('[data-shift="-1"]').evaluate(el => el === el.ownerDocument.activeElement), true, 'Le focus reste sur la flèche après navigation');
      await web.locator('[data-date="2026-12-24"]').press('Enter');
      assert.equal(await web.locator('[data-date="2026-12-24"]').evaluate(el => el === el.ownerDocument.activeElement), true, 'Le focus reste sur le jour sélectionné');
      await web.locator('[data-today]').press('Enter');
      assert.match(await web.locator('.cv-date').innerText(), /1 janvier 2027/);
      await web.locator('[data-add="2"]').click();
      await web.locator('[data-flow-method="manual"]').click();
      await web.locator('[data-custom-food]').click();
      await web.locator('[name="foodname"]').fill('Brouillon conservé');
      const theme = web.locator('[data-toggle-theme]');
      await theme.focus();
      await page.keyboard.press('Enter');
      assert.equal(await web.getAttribute('data-theme'), 'dark');
      assert.equal(await theme.getAttribute('aria-pressed'), 'true');
      assert.equal(await web.locator('[name="foodname"]').inputValue(), 'Brouillon conservé');
      assert.match(await web.locator('.cv-flow-kicker').innerText(), /Dîner.*1 janvier 2027/);
      await web.locator('[data-flow-cancel]').click();
      for (const dark of [true, false]) {
        if (!dark) await theme.press('Space');
        for (const width of [320, 1024]) {
          await page.setViewportSize({ width, height: 1000 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          assert.equal(await web.locator('[data-shift="-1"]').isVisible(), true);
          await web.locator('.cv-app').screenshot({path:path.join(checkDir,`web-${dark?'dark':'light'}-${width}.png`)});
        }
      }
      await page.clock.setFixedTime(new Date('2027-01-01T23:30:00Z'));
      assert.match(await web.locator('.cv-date').innerText(), /1 janvier 2027/, 'La journée consultée reste sélectionnée au changement de jour');
      await web.locator('[data-today]').click();
      assert.match(await web.locator('.cv-date').innerText(), /2 janvier 2027/);
      assert.equal((await web.locator('.cv-water-value').innerText()).replace(/\s/g, ''), '0');
      assert.equal(await web.locator('i[data-lucide]').count(), 0);
      assert.deepEqual(errors, []);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
    console.log('Parcours navigateur : identité photo, données manquantes, dîner, retour, dates, eau, brouillon, dépassement, annulation et largeurs 320–1024 px : OK');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
