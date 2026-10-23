# L1-CI — CI du cadre existant

Périmètre : organisation des contrôles L1, sans service applicatif ni fonctionnalité métier.
Préparation indépendante de l'implémentation du socle, qui reste dépendante de L0.
Entrées : sources de vérité, scripts existants, dépôt privé GitHub Zaneriis/Calovibe.

## Acceptation et vérification prévues avant code

- Push et pull request exécutent la même suite complète actuelle, sans filtre de chemins.
- Node fixé par `.node-version`, dépendances de test exactes et lockfile, `npm ci`.
- Syntaxe et tests existants passent ; parcours navigateur portable Windows/Linux avec
  Chromium Playwright, sans chemin du poste personnel et sans retirer d'assertion.
- Captures générées dans `artifacts/browser/`, conservées par GitHub Actions avec durée limitée.
- Jeton du workflow en lecture, aucun secret applicatif ou déploiement.
- Essai en échec sur branche dédiée, puis retour au vert ; preuves liées au SHA/run.
- Revues fonctionnelle, UI/UX (non-applicabilité à examiner) et qualité des tests indépendantes
  sur le commit candidat ; toute correction invalide les revues de l'ancien commit.

Commandes : `npm ci`, `npm run check`, `npx playwright install chromium`,
`npm run test:browser`. CI Linux : installation navigateur avec `--with-deps`.
Le workflow échoue au premier contrôle échoué ; aucune compilation/type fictive.

## Décisions humaines de session

Hermès est un client utilisateur externe, comme un navigateur vis-à-vis d'une API.
Aucun accès ni changement à Hermès. Tester le contrat MCP avec un client de référence.
Le développement et les essais conteneurisés peuvent s'effectuer sur le PC actuel ;
l'accès Ubuntu sert au raccordement et à la validation de la production, pas à cette CI.

## Limites connues avant réalisation

Le 23 octobre 2026, Actions est activé mais l'API de protection de `master` retourne
403 : GitHub demande Pro ou un dépôt public. Le dépôt reste privé ; aucun achat autorisé.
Cette CI ne rend donc pas la branche protégée et n'authentifie pas les revues d'agents.
Décision humaine ultérieure du même jour : abandon de l'exigence de protection payante,
`master` figée sans fusion ni push, `develop` comme branche par défaut et d'intégration.
La tâche [L1-GIT](L1-GIT.md) formalise et fait revoir ce changement de règle ; les tests et
revues restent obligatoires avant intégration. Le refus 403 ne bloque plus ce fonctionnement.
Le moteur Docker Linux local ne répond pas ; aucun essai conteneur n'est revendiqué.
Le résultat exécuté sera consigné dans le compte rendu du run et le rapport de tâche.
