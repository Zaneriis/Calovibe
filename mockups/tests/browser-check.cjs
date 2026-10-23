const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const runtime = createRequire('C:/Users/Leo14/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { chromium } = runtime('playwright');
const source = path.join(__dirname, '..', 'calovibe-photo.html');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(6000);
  try {
    await page.setContent('<style>body{margin:0}[hidden]{display:none!important}</style>' + fs.readFileSync(source, 'utf8'));
    const lucidePath = path.resolve(path.dirname(runtime.resolve('lucide')), '..', 'umd', 'lucide.js');
    if (fs.existsSync(lucidePath)) await page.addScriptTag({ path: lucidePath });
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
    await app.locator('.cv-date-controls input').fill('2026-10-23');
    assert.match(await app.locator('.cv-consumed').innerText(), /^0$/);
    assert.equal((await app.locator('.cv-water-value').innerText()).replace(/\s/g, ''), '0');
    await app.locator('[data-water="250"]').click();
    await app.locator('.cv-date-controls input').fill('2026-10-22');
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
    const checkDir=path.join(__dirname,'..','checks');fs.mkdirSync(checkDir,{recursive:true});
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
    console.log('Parcours navigateur : identité photo, données manquantes, dîner, retour, dates, eau, brouillon, dépassement, annulation et largeurs 320–1024 px : OK');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
