# L0-TOOLCHAIN — Amorçage technique des contrats

Statut : candidate à publier et revoir. Le mandat d'implémentation a été reçu après intégration MCP-REFERENCE. Aucun service métier, autorité réelle ni application de production livré ; L0/L1 restent ouverts.

## Isolation, dépendances et propriété

- Auteur : `/root/l0_architecture` ; modèle demandé GPT-6.1 Sol/high, effectif non attesté. Coordinateur distinct seul responsable de l'intégration.
- Branche `codex/l0-toolchain`, worktree `C:\Users\Leo14\.codex\worktrees\l0-architecture\Calovibe`. Ancienne branche ADR poussée préservée.
- Étude commencée propre depuis `1778c6aa96d43785fcdb0ecb8b6c16bd234c38a7`, avance rapide PR9 `5b0d7e0a5f7b066219bf338d3da9d1a4f429197a`, puis base d'implémentation PR10 `3b5b3134ef48a9df9669a6b3a3ab27325f0e0678`. Aucun rebase.
- Dépendance satisfaite : MCP-REFERENCE intégré et transfert exclusif explicite package/lock/.node-version/check/CI/configurations/assembleur/build/tests et consommateurs nécessaires. Aucun autre agent n'écrit ces fichiers.
- Documentation attribuée : README, cadre d'exécution (pas le Circuit), MCP-REFERENCE, ADR01 et cette fiche. Extensions accordées avant édition : suivi daté ADR02 sans règle auth changée ; DATA/API-MCP uniquement lancement runtime courant et note historique ; registre L0 uniquement constat AUTH-REF PR10 et correction factuelle de la ligne Docker.
- Hors périmètre : AGENTS/règles Git, formes et fixtures JSON gelées, calculs, services, auth, PostgreSQL, Docker/UAC, déploiement. Aucun achat, réglage global ou accès à Hermès.
- Sources lues : AGENTS, cahier/backlog, registre, ADR01/02, DATA/API-MCP, cadre/orchestration/modèles et tous les appelants de loadContract/base64. Ponytail appliqué.

## Critères explicités avant code et preuves

| ID | Critère | Nominal, erreur, limites et preuve |
|---|---|---|
| TC-01 | Préserver les contrôles et contrats | Les 248 tests antérieurs restent présents ; aucune assertion retirée. Seuls assemblages/imports sont partagés. Diff JSON/fixtures vide. Suite complète et navigateur à joindre au SHA final |
| TC-02 | Runtime exact sans installation globale locale | Node24.22.1 portable officiel vérifié SHA256 ; npm11.13.0 existant invoqué par ce Node. Test permanent de garde : simulation version26.2.0 refusée avant toute suite ; manifeste et .node-version concordants |
| TC-03 | Lint/types/build utiles | Loader partagé consommé par API-tests, référence MCP et build. ESLint recommended sur .cjs ; checkJs strict loader/build. Injection dans le vrai code : variable inconnue et appel loadContract(42) refusés |
| TC-04 | Transition cohérente | .node-version, engines/lock, garde, CI et docs convergent. CI Ubuntu fixe aussi npm exact sur runner éphémère. Aucun PATH global ni installation du PC modifiés ; succès Linux à vérifier dans CI |
| TC-05 | Verrouiller uniquement le consommé | TypeScript6.0.3, @types/node24.19.2, ESLint10.13.0, @eslint/js10.0.1, openapi-types12.1.3 (types importés, déjà pair du parser). Pins directs et lock transitif ; aucune dépendance React/Vite/Fastify/pg anticipée |
| TC-06 | Build effectivement consommé et refus utiles | Deux constructions identiques ; OpenAPI à refs internes, chaque schéma MCP autonome. Copie des seules sorties et suppression des copies sources du test, puis client officiel sur 31 outils et arguments invalides. Réf absente/HTTP/format inconnu : code1, aucune nouvelle sortie. Sortie absente/corrompue : refus sans repli sur sources |
| TC-07 | Actualiser ADR02 sans fausse preuve | Suivi daté PR10/SHA3b5b313, HTTP/SDK réels mais identités/réponses synthétiques ; règles et preuves historiques conservées, AUTH01+ aux lots prévus |
| TC-08 | Corriger diagnostic Docker borné | Rapports coordinateur du24octobre attribués : diagnostic puis remise en route et smoke hello-world réussis, sans présumer une intervention admin du seul service arrêté ; aucun Compose/service Calovibe revendiqué |

Les critères TC01–TC06 existaient dans la fiche d'étude avant l'extraction ; les extensions TC07/TC08 et DATA/API-MCP ont été consignées avant leurs éditions. Revues fonctionnelle/qualité des tests et non-applicabilité UI indépendantes requises sur le SHA exact. Aucun auto-verdict. Aucun blocage ni cycle infructueux de revue enregistré à ce stade.

## Résultat technique et contrat d'import

`contracts/loader.cjs` reprend le seul assemblage utile du support MCP : export `loadContract(directory = __dirname)`, lecture des sources, validation/résolution standard Swagger Parser avec HTTP désactivé, schémas MCP liés et compilation Ajv stricte. Le retour contient api/manifest/tools/wireTools/validate. `createAjv()` partage les formats full et l'assertion base64 existante avec les tests API. DATA conserve son validateur propre : pas de duplication supplémentaire ni refonte sans bénéfice.

Les types du loader/build sont des JSDoc et types Node/OpenAPI/Ajv des bibliothèques, sans any général, ts-nocheck ou skipLibCheck. La lecture des JSON du dépôt reste une frontière technique de contrats internes ; ce module n'est pas un endpoint d'import de schémas publics. Le serveur MCP, ses identités et sa projection de fixtures restent dans tests/support ; le build n'en dépend pas.

`npm run build` produit `artifacts/contracts/api.openapi.json` et `mcp-tools.json`. Le bundler standard garde seulement des refs internes dans OpenAPI ; les schémas MCP n'ont plus de $ref à résoudre. Chaque outil reste autonome, sans 31 définitions Zod recopiées. Les sorties sont publiées après validation ; un échec de build est bloquant, les consommateurs de test reconstruisent toujours dans un répertoire neuf. Le résultat OpenAPI mesuré passe de 19,9 Mo entièrement déréférencés à 166174 octets avec bundle ; le catalogue autonome fait 6430715 octets. Ce sont des artefacts ignorés, jamais des services ou images.

`npm run lint` appelle ESLint10 recommended sur les .cjs, --max-warnings0 ; seuls node_modules/artifacts exclus. Les globals document/innerWidth sont limités au test Playwright qui exécute des callbacks navigateur. `npm run types` contrôle uniquement loader et build réellement consommés avec allowJs/checkJs/strict/noEmit ; il ne prétend pas typer tous les scripts/tests historiques ou les futures apps. Aucun parseur TS/React inutile ajouté.

`check` garde syntaxe et toutes les suites, puis lint/types/build. Les nouveaux tests sont permanents dans test/check/CI. Le workflow conserve installation Chromium, correctif de miroir borné et captures ; ajoute npm exact sur le seul runner éphémère et npm audit. Aucun contrôle de Circuit/AGENTS ni protection Git changé.

## Commandes et preuves observées

Runtime local installé conservé : Node26.2.0, npm11.13.0 dans C:\Program Files\nodejs. Tous les essais d'implémentation sont invoqués via le binaire portable Node24 et le npm-cli.js11.13.0 existant ; PATH changé seulement dans le processus de commande.

- Étude : téléchargement officiel https://nodejs.org/dist/v24.22.1/win-x64/node.exe dans artifacts/toolchain/node-v24.22.1-win-x64 ; SHA256 concordant avec SHASUMS256.txt : `d702daa815eabbff763c7d3808e235cf031cf2ca70211b56847bc72f51e240e5`. --version v24.22.1, x64/win32. Signature PGP non vérifiée. La garde historique refusait bien Node24 avant transition.
- Métadonnées primaires npm lues pour les versions et engines/peers ; Node24.22.1 satisfait les plages déclarées des outils retenus. Aucun achat ni mise à jour automatique à latest.
- `npm ci --ignore-scripts` sous Node24/npm11.13 : réussi, 109 paquets, audit de l'installation 0 vulnérabilité détectée. Manifeste et verrou root exigent24.22.1.
- `node node_modules/typescript/bin/tsc --project tsconfig.toolchain.json` : réussi sans skipLibCheck.
- `node node_modules/eslint/bin/eslint.js . --max-warnings 0` : réussi. Premier diagnostic no-undef sur document/innerWidth résolu par globals limités au contexte Playwright, sans désactiver la règle.
- `node scripts/build-contracts.cjs contracts artifacts/contracts` : réussi, sorties mesurées ci-dessus.
- `node --test tests/toolchain.test.cjs` : 8/8 réussis ; tous les cas négatifs et consommation SDK inclus.
- Deux `node scripts/check.cjs` complets sous Node24 ont réussi : 256/256 (248 conservés +8 nouveaux), aucun échec/ignoré, lint/types/build réussis. Logs pré-candidate dans artifacts/toolchain/current-check.log et ci-install.log.

Une première suite exacte sur02958622c4fda624188b4ba958eb409199803d38 a réussi npm ci/lint/types/build/test256/check256/browser/audit0 et diff--check. Le dernier constat Docker communiqué ensuite ajoute seulement un suivi documentaire ; après ce nouveau commit, réexécuter sur son SHA exact npm ci/lint/types/build/test/check/browser/audit/diff--check et publier les commandes/résultats, CI Linux et verdicts dans la PR, sans réinsérer une approbation dans un nouveau commit. Les preuves exactes postérieures au commit ne sont pas présumées par cette fiche.

## Limites, décisions et livraison

Adoption technique locale proposée au coordinateur sous mandat après CI Linux et revues exactes ; aucune validation humaine inventée. ADR01 distingue cet amorçage des versions candidates de services L1. Aucun build des trois apps, image, authentification réelle, autorité Logto, SQL ou garantie métier de production qualifiés. La référence reste synthétique et n'utilise aucun compte Hermès. Aucun nouvel écran ; le navigateur protège les prototypes existants.

Le diagnostic Docker est celui communiqué par le coordinateur, pas une commande relancée ici. Après erreur dockerInference ERROR_CANT_ACCESS_FILE, il a sauvegardé/recréé le seul répertoire run contenant deux sockets/reparse points0octet, sans effacer images/volumes ; Desktop relancé, moteur28.1.1 et Compose2.35.1-desktop.1 répondent. Son smoke hello-world Linux est réussi code0 par digest sha256:5e22040d441e5fb3aed38368acbe8486b575d7018df38dbdfbc7311fbb2ef3a9, conteneur jetable sans réseau, lecture seule, capabilities retirées et no-new-privileges. Aucun Compose ni service Calovibe n’est livré/testé par ce smoke ; aucune intervention administrative de service n’était nécessaire. Ces preuves sont attribuées au coordinateur, avec historique dans son suivi.

PR attendue vers develop uniquement ; candidat SHA, CI et trois revues à recueillir. Aucun push develop/master, rebase ou intégration par cet auteur. Les résultats de qualification futurs restent ouverts tant qu'ils ne sont pas exécutés et revus.

## Sources primaires consultées

- [Node24.22.1 LTS](https://nodejs.org/en/blog/release/v24.22.1), [sommes officielles](https://nodejs.org/dist/v24.22.1/SHASUMS256.txt).
- [TypeScript checkJs](https://www.typescriptlang.org/tsconfig/checkJs.html), [allowJs](https://www.typescriptlang.org/tsconfig/allowJs.html).
- [Swagger Parser bundle/dereference](https://apidevtools.com/swagger-parser/swagger-parser.html), API/types des paquets installés exacts et tests3.1.2 intégrés.
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface#--max-warnings), [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/), versions exactes interrogées au registre npm primaire.
- [Docker Windows permissions](https://docs.docker.com/desktop/setup/install/windows-permission-requirements/) : en WSL2 Linux, service privilégié non nécessaire sauf fonctionnalités concernées, dont maintien du fichier hosts ; service arrêté seul ne diagnostique pas la cause.
