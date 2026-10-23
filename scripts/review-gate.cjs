const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

// shortcut: les identités locales sont déclaratives ; la plateforme devra authentifier les revues.
function validate(report, commit) {
  const fail = message => { throw new Error(message); };
  const text = value => typeof value === 'string' && value.trim().length > 0;
  if (!/^[a-f0-9]{40}$/.test(commit) || report.commit !== commit) fail('Commit absent ou périmé');
  if (!text(report.task) || !text(report.developer)) fail('Tâche et développeur requis');
  if (typeof report.uiAffected !== 'boolean') fail('Impact UI explicite requis');
  if (!Number.isInteger(report.failedCycles) || report.failedCycles < 0 || report.failedCycles >= 3)
    fail('Diagnostic et arrêt requis après trois cycles infructueux');
  if (!Array.isArray(report.checks) || !report.checks.length || report.checks.some(check =>
    check.commit !== commit || check.status !== 'passed' || !text(check.command) || !text(check.evidence)))
    fail('Contrôles réussis et preuves du commit requis');
  const reviewers = new Set([report.developer]);
  for (const role of ['functional', 'ui', 'tests']) {
    const review = report.reviews?.[role];
    if (!review || review.commit !== commit || !text(review.reviewer) || reviewers.has(review.reviewer))
      fail(`Revue indépendante du commit requise : ${role}`);
    reviewers.add(review.reviewer);
    if (!Array.isArray(review.blockers) || review.blockers.length || !text(review.evidence))
      fail(`Preuve et absence de blocage requises : ${role}`);
    if (role === 'ui' && !report.uiAffected && review.status === 'not-applicable') {
      if (!text(review.reason)) fail('Non-applicabilité UI à justifier');
    } else if (review.status !== 'approved') fail(`Approbation requise : ${role}`);
  }
  return true;
}

if (require.main === module) {
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
    if (dirty) throw new Error('Arbre de travail non propre : créer une nouvelle candidate');
    validate(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), commit);
    console.log(`Éligibilité locale vérifiée : ${commit}. Aucun déploiement effectué.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { validate };
