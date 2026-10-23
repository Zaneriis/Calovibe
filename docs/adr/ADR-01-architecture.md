# ADR-01 — Architecture, runtime et commandes de validation

- Statut : **proposition à valider ; ouverte**.
- Date de vérification des sources et métadonnées : 23 octobre 2026.
- Tâche : [L0-ADR01](../tasks/L0-ADR01.md).
- Autorité : [cahier des charges](../CAHIER-DES-CHARGES.md), [backlog L0](../BACKLOG.md), décisions humaines ; cette recommandation ne vaut pas approbation du propriétaire.

Le mandat humain de développement autonome autorise le coordinateur à arrêter et
consigner les choix techniques d'architecture/runtime après qualification et revues
indépendantes, avec décision, date et SHA de référence. Il n'exige pas d'approbation
humaine routinière pour ces choix dans le périmètre autorisé. Ce mandat ne transforme
pas la présente proposition en décision déjà prise ; les décisions explicitement
réservées au propriétaire et les limites de dépense, de données et d'exposition
administrative restent applicables.

## Contexte et comparaison

Le serveur Ubuntu personnel héberge trois services applicatifs conteneurisés : web,
API métier commune et MCP. Le MCP appelle l'API ; seule l'API possède les accès aux
données. Hermès est un client externe. Il n'y a aucun agent conversationnel dans
Calovibe. Les maquettes HTML restent des références visuelles et comportementales.

| Option | Bénéfice pour Calovibe | Coût / limite | Avis proposé |
|---|---|---|---|
| A — TypeScript, React/Vite, API Fastify, MCP SDK officiel | Un langage pour les trois services, contrats partagés et API indépendante utilisable par un futur mobile ; web construit en fichiers statiques | État/brouillons et navigation à construire explicitement ; trois points d'entrée à vérifier | **Recommandée** : couvre le besoin sans rendu serveur ni framework métier supplémentaire |
| B — TypeScript, Next.js, API Fastify, MCP SDK officiel | Même langage ; rendu serveur, routage et conventions intégrées | L'API séparée reste requise ; le rendu serveur ajoute un runtime et une frontière d'auth/cache sans besoin actuel de référencement public | Alternative viable si un besoin de rendu serveur est établi ; pas de gain démontré ici |

La documentation [Vite](https://vite.dev/guide/) décrit la production d'actifs statiques.
[Next.js](https://nextjs.org/support-policy) possède une politique LTS ; son rejet ici
est une appréciation du périmètre, pas un défaut de maintenance. Aucun framework ne
prouve à lui seul les règles métier ni l'accessibilité.

## Architecture recommandée

```text
Navigateur ── HTTPS / ────────> web (React construit par Vite, service statique)
           └─ HTTPS /api ────> API Fastify ──> PostgreSQL + volume persistant
Client MCP ── HTTPS /mcp ────> MCP Fastify/SDK ── HTTP interne ──> API
                                   reverse proxy HTTPS en amont (ADR-03)
```

- Monorepo npm workspaces : `apps/web`, `apps/api`, `apps/mcp`, `packages/contracts`.
  Ce sont des chemins proposés, pas des composants déjà présents.
- `web` sert le résultat Vite avec Fastify et `@fastify/static`, dans son conteneur.
  Aucun calcul métier autoritaire ni secret serveur dans les actifs. Navigation SPA
  et appels API de même origine via le proxy ; sessions/CSRF selon ADR-02.
  [`vite preview`](https://vite.dev/guide/static-deploy.html) reste réservé aux essais locaux.
- `api` regroupe journal, bibliothèque, eau, poids/objectifs, opérations et photo en
  modules du même processus. Les règles et transactions y sont uniques. Les clients
  peuvent prévisualiser sans imposer leurs totaux au serveur.
- `mcp` adapte les outils au contrat API, sans accès SQL ni calcul métier dupliqué.
  SDK v2 et transport HTTP proposé à qualifier dans ADR-02 ; aucune configuration
  d'Hermès à lire ou modifier. L'identité et les audiences restent propres à chaque
  ressource : ce schéma n'autorise pas de transmettre tel quel un jeton MCP à l'API.
- `contracts` porte les schémas et exemples approuvés du contrat, partagés par les
  validateurs/adaptateurs et vérifiés automatiquement. Il n'importe pas l'accès SQL
  et n'expose pas de secret. Le [schéma de données L0-DATA](../../contracts/data.schema.json)
  et sa [documentation](../contracts/DATA.md), désormais intégrés à develop, sont à
  réutiliser ; le regroupement éventuel ne doit pas créer de copie divergente.
  Format OpenAPI/JSON Schema et noms API/MCP restent à définir par L0-CONTRACTS.
- PostgreSQL : accès `pg`, SQL paramétré, migrations SQL versionnées ; pas d'ORM proposé
  sans besoin démontré. Les transactions atomiques utilisent un même client du pool,
  conformément à [node-postgres](https://node-postgres.com/features/transactions).
  Contraintes d'idempotence, versions et annulation ciblée seront celles du contrat
  approuvé ; les décimaux persistés ne passent pas implicitement par des flottants JS.
- L'analyse photo commence comme module API distinct avec fournisseur interchangeable
  à la frontière d'intégration ; propositions séparées du journal, confirmation
  transactionnelle. Aucun worker, bus, cache Redis ou service par domaine ajouté.
- API seule reliée au réseau de données ; base sans port public. Images applicatives
  distinctes, utilisateur sans privilèges, secrets injectés à l'exécution, santé et
  arrêt propre. Réseau/proxy, stockage photo, sauvegardes et exécutant LAN : ADR-03/05.
  Les migrations sont une commande ponctuelle contrôlée, pas un quatrième service
  applicatif permanent. Aucun volume personnel réutilisé pour les tests.

## Versions exactes proposées

Ces valeurs sont des **candidates verrouillables**, pas un lock applicatif livré.
Elles ont été interrogées via `npm view` sans modifier les dépendances du projet.
Les versions transitives et images par digest restent à verrouiller et tester avant
qualification du socle ; un tag de conteneur exact reste mutable.

| Usage | Version proposée | Vérification / justification |
|---|---|---|
| Runtime production / développement applicatif | Node **24.22.1** | [Release officielle LTS du 21 octobre](https://nodejs.org/en/blog/release/v24.22.1), correctifs de sécurité ; [politique Node](https://nodejs.org/en/about/previous-releases) |
| Gestionnaire | npm **11.13.0** | Observé localement ; `npm view npm@11.13.0 engines` : Node `^20.17.0` ou `>=22.9.0`, donc compatible avec 24.22.1 |
| Langage | TypeScript **6.0.3** | `npm view typescript@6.0 version` ; [notes 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) ; version 7.0.2 latest écartée pour la compatibilité lint ci-dessous |
| Web | React / React DOM **19.3.1** | `npm view react version`, `react-dom version` ; [ligne React actuelle 19.3](https://react.dev/versions) |
| Construction web | Vite **8.3.5**, `@vitejs/plugin-react` **6.1.2** | Métadonnées Node `^20.19.0` ou `>=22.12.0`, plugin compatible Vite 8 ; [8.3 maintenue](https://vite.dev/releases) |
| Serveurs HTTP | Fastify **5.12.7**, `@fastify/static` **10.1.7** (web), `@fastify/swagger` **9.9.2** (API) | Métadonnées npm ; [support Fastify](https://fastify.dev/docs/latest/Reference/LTS/) et [compatibilité static/Fastify 5](https://github.com/fastify/fastify-static) |
| MCP serveur / client de référence de test | `@modelcontextprotocol/server` / `@modelcontextprotocol/client` **2.3.1** | Node `>=20` ; [SDK officiel v2](https://ts.sdk.modelcontextprotocol.io/v2/) pour la spécification 2026-07-28 ; choix/auth à qualifier avec ADR-02 |
| Adaptateur MCP HTTP | `@modelcontextprotocol/fastify` **2.0.1** | `peerDependencies` : Fastify `^5.2.0`, server `^2.3.0` ; aucune preuve d'interopérabilité par ces seuls intervalles |
| Validation SDK MCP | Zod **4.6.7** | `npm view zod version` ; server 2.3.1 déclare `zod ^4.2.0` ; ne remplace pas le contrat commun |
| Accès PostgreSQL | `pg` **8.23.1** | Métadonnées Node `>=16` ; pilote sans ORM supplémentaire |
| Base | PostgreSQL **18.6** | [Version supportée jusqu'en novembre 2030](https://www.postgresql.org/support/versioning/) ; aucune migration des données existantes proposée par cet ADR |
| Lint | ESLint **10.13.0**, `@eslint/js` **10.0.1**, `typescript-eslint` **8.72.0**, `eslint-plugin-react-hooks` **7.1.1** | Métadonnées npm ; [typescript-eslint](https://typescript-eslint.io/users/dependency-versions/) prend en charge ESLint 10 et TS `>=4.8.4 <6.1.0` ; ne pas adopter TS 7 silencieusement |
| Déclarations TS | `@types/node` **24.19.2**, `@types/react` / `@types/react-dom` **19.3.0**, `@types/pg` **8.23.1** | Métadonnées npm ; fixer explicitement `types` et `rootDir` pour TS 6 |
| E2E existant à conserver | Playwright **1.64.1**, Lucide **1.61.0** | Déjà verrouillés dans `package-lock.json` ; aucune nouvelle bibliothèque de tests proposée |
| Bases d'images | `node:24.22.1-bookworm-slim`, `postgres:18.6-bookworm` | Tags présents dans les images officielles [Node](https://hub.docker.com/_/node) / [Postgres](https://hub.docker.com/_/postgres) ; digests et architecture CPU à vérifier en L1/ADR-03 |

Les paquets ci-dessus sont publiés par leurs projets ; leurs métadonnées primaires
sont accessibles par exemple à [Fastify npm](https://www.npmjs.com/package/fastify),
[TypeScript npm](https://www.npmjs.com/package/typescript) et
[MCP server npm](https://www.npmjs.com/package/@modelcontextprotocol/server).
Les pages web peuvent être indexées avant le dernier correctif : les patchs du tableau
proviennent des interrogations directes du registre du 23 octobre.

À l'amorçage autorisé du socle : versions directes sans `^`/`~`, lock unique commité,
`packageManager: npm@11.13.0`, Node exact dans CI/images/outils locaux. Utiliser
[`npm ci`](https://docs.npmjs.com/cli/v11/commands/npm-ci/) : un désaccord manifeste/lock
échoue, sans réécriture du lock. Les mises à jour de sécurité sont des changements
revus et testés ; verrouiller ne signifie pas garder ces versions indéfiniment.

**Transition à traiter séparément :** le cadre actuel exige Node **26.2.0** dans
`.node-version`, `package.json` et `scripts/check.cjs`. Il a été testé ainsi, pas sous
Node 24. Le présent changement ne modifie aucun de ces fichiers. L1 devra faire
converger ces contrôles, CI et documentation vers la version applicative retenue,
avec revue indépendante des règles de validation et suite complète sur ce runtime.
Il ne suffit pas de changer l'image ou une seule valeur.

## Commandes proposées : qualification L0 et suites L1

Les scripts suivants **n'existent pas encore**. Ils ne sont ni lancés ni annoncés verts.
Le responsable de l'amorçage technique L0 les qualifiera, avec leurs configurations et tests,
avant tout code métier qui dépend de cet ADR. Les noms sont proposés comme interface
stable de la CI, sans `--if-present` qui masquerait un workspace incomplet.

| Commande racine proposée | Contenu attendu et échec utile |
|---|---|
| `npm run lint` | ESLint sur sources/scripts/tests, avertissements bloquants ; parseur TS et règles Hooks ; exclure seulement sorties générées |
| `npm run types` | `npm run types --workspaces` ; chaque workspace a un `tsc --noEmit -p tsconfig.json` avec son environnement (web bundler ; API/MCP NodeNext) |
| `npm run test:contracts` | Exemples valides/invalides et réponses API/MCP validés contre les schémas livrés ; refus des conversions et champs incohérents |
| `npm run test:unit` | `node:test`/assert déjà standards du dépôt, après compilation TS de test ; calculs, dates, erreurs, conflits et annulation |
| `npm run test:integration` | API + PostgreSQL réelle jetable, migrations, transactions et redémarrage ; jamais remplacer ces essais par un mock de base |
| `npm run test:e2e` | Suites web Playwright + HTTP API + client MCP v2 de référence contre les conteneurs ; tout canal exposé a des assertions nominales et de refus |
| `npm run build` | Compilation `contracts` puis API/MCP et serveur web avec `tsc`, web React avec `vite build` ; ordre explicite, sorties séparées |
| `npm run build:images` | `docker compose build web api mcp`, fichiers Compose/Dockerfiles versionnés et images étiquetées par SHA ; ne prouve pas à lui seul le démarrage |
| `npm run verify` | Conserver les tests du cadre/prototypes, puis lint, types, contrats, unités, intégration, build, images et E2E ; arrêt au premier échec |

Utiliser le [test runner Node](https://nodejs.org/docs/latest-v24.x/api/test.html) pour
éviter une deuxième bibliothèque de tests tant que les besoins sont couverts.
En CI candidate, les suites sont permanentes et complètes ; les tests de services
utilisent un projet Compose, des ports et volumes isolés. Tester refus d'accès,
absence de secret, doublons, écritures concurrentes, annulation d'une opération et
confirmation atomique photo dès que ces capacités existent. Échecs de dépendance et
réponse invalide ne produisent aucune écriture partielle. Les E2E web couvrent thèmes,
tailles, clavier, contexte date/repas, brouillons, erreurs et annulation. Le taux de
couverture indicatif 70 % ne remplace aucun scénario critique. Statuts/revues Git et
déploiement restent ceux d'AGENTS.md ; cet ADR ne les assouplit pas.

## Preuves de cette proposition et conditions de clôture

Le [compte rendu de tâche](../tasks/L0-ADR01.md) consigne les commandes exécutées :
`npm ci --ignore-scripts`, `npm test`, `npm run check` (75/75 après fusion de develop),
`npm run test:browser` (succès). Les 29 tests initiaux restent un constat historique ;
les 75 actuels incluent les contrats de données et les contrôles du miroir CI intégrés.
Ces preuves portent sur le cadre, les prototypes et les schémas L0 existants, sous Node
26.2.0 ; elles ne prouvent pas les commandes et composants applicatifs proposés.
Aucun build, lint sémantique, contrôle TS, test PostgreSQL ni interopérabilité MCP
applicatifs n'a été exécuté : les composants correspondants n'existent pas encore.
Au dernier contrôle Docker de cette étude, la CLI répondait mais le moteur Linux
n'était pas joignable ; ce constat ne prouve pas son état courant.

ADR-01 reste ouverte jusqu'à : choix d'architecture/runtime arrêté et consigné par
le coordinateur dans son mandat après qualification et revues indépendantes ;
convergence avec ADR-02 et contrat API/MCP ; versions directes/transitives verrouillées ;
commandes lint/types/tests/build qualifiées dans un amorçage technique L0 sans métier
sur le runtime retenu ; revues indépendantes applicables sur le commit exact.
Les suites de services futurs restent décrites avec leur portée, sans résultat fictif.

La construction/démarrage des trois services, santé, accès sans accès client direct
à la base, digests d'images et refus d'accès sont des preuves de réalisation **L1**,
conformément au backlog. Elles ne deviennent pas des prérequis circulaires à clôturer
ADR-01/L0. Les scripts d'intégration et E2E applicatifs seront activés avec les services
qu'ils vérifient ; un script vide ou ignoré ne vaut pas qualification.
Le fournisseur/authentification ne sont pas choisis ici. Domaine, accès production et
inventaire matériel restent ADR-03 ; absence de serveur n'empêche pas la proposition L0.
L0 et L1 ne sont pas clos par ce document. Aucun achat, déploiement ou changement de
visibilité n'est engagé.
