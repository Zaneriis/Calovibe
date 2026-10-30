# SDK-SECURITY — débloquer l’audit sans forcer les dépendances

## Mandat, dépendances et isolation

Mandat du 30 octobre 2026 : corriger le prérequis de sécurité bloquant la CI.
Branche `codex/sdk-security`, créée depuis `develop` à `92c1ebe`, puis avancée
en fast-forward vers la candidate de réorganisation `4dd827d`.
Worktree isolé : `C:\Users\Leo14\.codex\worktrees\ci-apt-mirror\Calovibe\artifacts\sdk-security`.
Le delta propre SDK se mesure depuis `4dd827d` ; les commits ancêtres des PR de
toolchain et de réorganisation restent visibles tant qu'ils ne sont pas intégrés.

Propriété développeur : `package.json`, `package-lock.json`, cette fiche,
adaptations indispensables de la référence MCP et documentation de sa version.
Contrats JSON, exigences, contrôles, logique métier, maquettes et ADR sont exclus.
Canal concerné : référence de test MCP HTTP ; aucun nouveau service de production.
Profil demandé : Sol/high ; l'outil de cette session ne fournit pas d'attestation
du modèle ou du niveau effectifs. Aucun réglage global ou achat effectué.

## Critères fixés avant code et stratégie

| Critère | Preuve attendue |
|---|---|
| Retirer GHSA-rmxm-3fg6-px4f du verrou | Audit initial en échec, puis `npm audit` à zéro |
| Ensemble minimal officiellement compatible, versions exactes | Métadonnées npm et diff limité aux paquets MCP/Hono nécessaires |
| Aucun peer invalide, force, legacy-peer-deps ou override | `npm ci --ignore-scripts`, `npm ls --all`, inspection manifeste/verrou |
| Préserver le contrat et le wire des 31 outils | Suite permanente `mcp/tests/mcp-reference.test.cjs` et consommation des artefacts dans `tests/toolchain.test.cjs` |
| Préserver refus, erreurs et nettoyage | Cas invalides, identités/scopes, Host/Origin, JSON/taille, legacy, erreurs API et fermeture des ports de la même suite HTTP réelle |
| Préserver tous les contrôles existants | `npm run check` : au moins 259 tests, syntaxe/lint/types/build ; `npm run test:browser` ; trois builds indépendants ; CI sur le SHA candidat exact |

Tous les contrôles restent requis. Les revues fonctionnelle, tests et UI/UX
restent indépendantes ; la non-applicabilité UI est proposée, à confirmer par
le réviseur, car aucun écran, style ou parcours n'est modifié.

## Implémentation bornée

Versions directes exactes : `@modelcontextprotocol/client` et
`@modelcontextprotocol/server` **2.4.0**, `@modelcontextprotocol/node` **2.1.2**.
Client et serveur exigent le même `@modelcontextprotocol/core` **2.4.0**.
Node 2.1.2 exige le peer server `^2.4.0` et autorise Hono
`^1.19.9 || ^2.1.3` ; l'ancien node 2.1.1 n'autorisait que `^1.19.9`.
Le verrou transitif fixe **@hono/node-server 2.1.3**, première version corrigée
compatible ; le paquet `hono` lui-même reste inchangé à 4.13.13.

Commandes de résolution exécutées via npm 11.13.0 : installation exacte des
trois SDK avec `install --save-dev --save-exact --ignore-scripts`, puis résolution
ciblée `update @hono/node-server --ignore-scripts`. npm conservait initialement
Hono 1.19.17 ; la résolution ciblée sélectionnait 2.1.5. Pour respecter le minimum,
seule l'entrée transitive du verrou a ensuite été fixée à 2.1.3 avec le tarball,
l'intégrité et les peers retournés par `npm view @hono/node-server@2.1.3`.
L'installation propre et les peers vérifient ce verrou. Aucun paquet Hono direct,
override, force ou legacy-peer-deps ; aucune mise à jour générale.
Le support de référence n'a nécessité aucune adaptation de code ni de test.

Le contrôle permanent `npm audit` en CI est la non-régression au niveau du verrou :
il reproduit l'échec initial et passe après correction. La suite HTTP permanente
protège les comportements consommés du SDK. `serveStatic`, fonction fournisseur
concernée par l'avis, n'est pas utilisée dans Calovibe ; aucun banc qui recopierait
ce code fournisseur n'est ajouté. Cette limite et l'adéquation de la preuve au
défaut sont à examiner par le réviseur indépendant des tests.

## Premières preuves, puis qualification du commit

Runtime des commandes : Node portable **24.22.1**, npm CLI **11.13.0** installé
dans `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js`.
Le PATH est changé uniquement dans chaque processus pour ses scripts enfants.
Métadonnées officielles interrogées avec `npm view` pour les trois SDK et Hono.

Avant commit :

- `npm audit --package-lock-only --json` sur le verrou initial : code 1,
  **1 vulnérabilité moderate**, GHSA-rmxm-3fg6-px4f sur Hono 1.19.17.
- `npm ci --ignore-scripts` sur le verrou corrigé : code 0, 112 paquets installés.
- `npm ls --all` : code 0, aucun peer invalide ; `jiti` est un peer optionnel
  d'ESLint non installé, sans erreur de résolution.
- `npm audit --json` : code 0, **0 vulnérabilité**.
- `npm run check` : code 0, **259/259 tests**, aucun ignoré/annulé ; syntaxe,
  ESLint, types stricts et build des contrats réussis, HTTP MCP compris.
- Comparaison automatisée du verrou : seuls les SDK client/server/core/node et
  `@hono/node-server` changent, avec les trois pins directs correspondants.
- `git diff --check` : code 0.

Sur le commit candidat exact, relancer installation/audit/peers/check et exécuter
`npm run build`, puis `npm run build:backend`, `npm run build:web`,
`npm run build:mcp`, et `npm run test:browser`. Le test permanent d'isolation des
builds retire aussi les sources/sorties des autres services. Les résultats exacts,
SHA, lien PR, CI et verdicts sont conservés dans la PR sans nouveau commit
documentaire après approbation. Ils ne sont pas présumés par les premières preuves.

## Limites et livraison

PR vers `develop` uniquement ; aucune intégration par le développeur, aucun push
`develop` ou `master`. La candidate requiert les contrôles et revues indépendantes
sur son SHA exact. L'authentification et les réponses de la référence restent
synthétiques ; aucun OAuth, service métier, SQL, conteneur, fournisseur photo ou
configuration Hermès n'est qualifié par cette migration. Les ADR sont maintenues
par le coordinateur après convergence et revue.

Sources primaires : métadonnées du registre npm officiel des versions exactes,
[avis GHSA-rmxm-3fg6-px4f](https://github.com/advisories/GHSA-rmxm-3fg6-px4f),
[référence MCP et limites](../contracts/MCP-REFERENCE.md).
