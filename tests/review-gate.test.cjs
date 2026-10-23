const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../scripts/review-gate.cjs');
const commit = 'a'.repeat(40);
function candidate() {
  return { task: 'L0-PILOT', commit, developer: 'developer', uiAffected: false, failedCycles: 0,
    checks: [{ commit, command: 'npm run check', status: 'passed', evidence: 'test-output' }],
    reviews: Object.fromEntries(['functional', 'ui', 'tests'].map(role => [role, {
      commit, reviewer: role, status: role === 'ui' ? 'not-applicable' : 'approved',
      reason: 'Aucune interface modifiée', evidence: 'rapport indépendant', blockers: [] }])) };
}
test('candidate complète et UI explicitement non applicable', () => assert.equal(validate(candidate(), commit), true));
for (const [name, mutate] of [
  ['commit périmé', r => { r.commit = 'b'.repeat(40); }],
  ['auto-approbation', r => { r.reviews.tests.reviewer = r.developer; }],
  ['même réviseur sur deux rôles', r => { r.reviews.ui.reviewer = r.reviews.tests.reviewer; }],
  ['revue absente', r => { delete r.reviews.functional; }],
  ['approbation périmée', r => { r.reviews.tests.commit = 'b'.repeat(40); }],
  ['blocage ouvert', r => { r.reviews.functional.blockers = ['perte de données']; }],
  ['preuve absente', r => { r.reviews.tests.evidence = ''; }],
  ['échec de contrôle', r => { r.checks[0].status = 'failed'; }],
  ['contrôle périmé', r => { r.checks[0].commit = 'b'.repeat(40); }],
  ['aucun contrôle', r => { r.checks = []; }],
  ['UI omise', r => { delete r.uiAffected; }],
  ['UI modifiée sans approbation', r => { r.uiAffected = true; }],
  ['non-applicabilité sans motif', r => { r.reviews.ui.reason = ''; }],
  ['troisième cycle infructueux', r => { r.failedCycles = 3; }],
  ['compteur invalide', r => { r.failedCycles = -1; }]
]) test(`refuse : ${name}`, () => { const report = candidate(); mutate(report); assert.throws(() => validate(report, commit)); });
test('UI modifiée approuvée indépendamment', () => {
  const report = candidate(); report.uiAffected = true; report.reviews.ui.status = 'approved';
  assert.equal(validate(report, commit), true);
});
