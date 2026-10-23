const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const file of ['calovibe-photo.html', 'calovibe-ajout.html']) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const definition = source.match(/^function previousStep\(s\).*$/m)?.[0];
  assert.ok(definition, `Navigation introuvable dans ${file}`);
  const previousStep = vm.runInNewContext(`(${definition})`);
  const shiftDate=vm.runInNewContext(`(${source.match(/^function shiftDate.*$/m)[0]})`);
  const photoItemReady=vm.runInNewContext(`(${source.match(/^function photoItemReady.*$/m)[0]})`);
  test(`${file}: le calendrier traverse correctement les mois et années`,()=>{
    assert.equal(shiftDate('2026-12-31',1),'2027-01-01');
    assert.equal(shiftDate('2026-11-01',-1),'2026-10-31');
    assert.equal(shiftDate('2028-02-28',1),'2028-02-29');
  });
  test(`${file}: les valeurs manquantes et les changements non validés bloquent la photo`,()=>{
    const entry={food:{name:'Tomate',k:18,p:.9,l:.2,g:2.7},quantity:100};
    assert.equal(photoItemReady(entry),true);
    assert.equal(photoItemReady({...entry,needsReview:true}),false);
    assert.equal(photoItemReady({...entry,food:{...entry.food,p:''}}),false);
    assert.equal(photoItemReady({...entry,quantity:0}),false);
  });

  test(`${file}: modifier une entrée depuis l’accueil revient à l’accueil`, () => {
    assert.equal(previousStep({ step: 'edit', editing: 0, returnTo: 'home' }), 'home');
  });
  test(`${file}: un ajout depuis la recherche revient à la recherche`, () => {
    assert.equal(previousStep({ step: 'edit', editing: null, returnTo: 'search' }), 'search');
  });
  test(`${file}: un aliment personnalisé revient à sa création`, () => {
    assert.equal(previousStep({ step: 'edit', editing: null, returnTo: 'custom' }), 'custom');
    assert.equal(previousStep({ step: 'custom', editing: null }), 'search');
  });
  test(`${file}: un ancien état de modification revient aussi à l’accueil`, () => {
    assert.equal(previousStep({ step: 'edit', editing: 0 }), 'home');
    assert.equal(previousStep({ step: 'edit', editing: null }), 'search');
  });
}
