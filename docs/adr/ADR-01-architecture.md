# ADR-01 — Architecture, runtime et commandes de validation

- Statut : **choix technique arrêté pour le développement le30 octobre2026 ; convergence soumise aux revues/CI sur commit exact. Services L1 non livrés.**
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

### Décision de développement du30 octobre2026

Le coordinateur retient l’option A sous mandat : TypeScript6.0.3, React/ReactDOM19.3.1
avec Vite8.3.5/pluginReact6.1.2, API Fastify5.12.7, pilote SQLpg8.23.1 et PostgreSQL18.6.
Les packages applicatifs seront installés/verrouillés et leurs runtimes qualifiés
dans les tâches L1 qui les consomment ; leurs seules métadonnées ne prouvent pas
des services opérationnels. Pas d’ORM, bus, worker ou service par domaine ajouté.

Runtime/outillage qualifiés : Node24.22.1/npm11.13.0 ; contrats partagés uniques,
SDK client/server/core2.4.0 et adaptateur Node2.1.2, Hono2.1.3, selon
[SDK-SECURITY](../tasks/SDK-SECURITY.md), commita197c0ff463a5dce94eb5f2a5f99ccbcc82276cd
intégré sur develop après deux CI et trois revues exactes. Audit0,259 tests,
lint/types/builds et navigateur réels. Le MCP utilisera cet adaptateur Node officiel
déjà qualifié ; l’adaptateur Fastify de l’étude historique n’est pas requis.

Services dans backend/, web/, mcp/, contrats dans shared/contracts/, docs générales
dans docs/. Chaque service a son build/image propre ; installation npm commune.
Les builds actuels backend/MCP produisent seulement les contrats ; le build web
produit un aperçu. Les vrais points d’entrée, images, SQL, santé et accès L1 sont
à implémenter suivant [L1-SERVICES](../contracts/L1-SERVICES.md), sans recopier les
fragments de maquette en code de production. Cette décision fixe un choix technique,
pas un résultat fictif de qualification applicative.

La comparaison et les versions proposées ci-dessous conservent l’étude historique
du23 octobre ; la présente décision et les manifestes verrouillés font foi pour
le périmètre effectivement consommé.

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
  et n'expose pas de secret. Le [schéma de données L0-DATA](../../shared/contracts/data.schema.json)
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

Le tableau initial ci-dessous conserve les **candidats de services L1** datés. Les outils
réellement consommés/verrouillés par l’amorçage L0 sont distingués dans le suivi du
24 octobre ; React/Vite/Fastify/pg ne sont pas installés et leurs services ne sont pas construits.
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

## Qualification technique L0 — 24 octobre 2026

L0-TOOLCHAIN utilise Node **24.22.1** exact et npm **11.13.0**, sans modifier les
installations globales du PC. .node-version, engines, garde du check et CI convergent ;
le runtime précédent26.2.0 est refusé. Le runner Linux fixe npm sur sa propre instance
éphémère ; la qualification Windows locale ne vaut pas à elle seule succès Linux.

Dépendances ajoutées uniquement parce que consommées : TypeScript6.0.3,
@types/node24.19.2, ESLint10.13.0, @eslint/js10.0.1, openapi-types12.1.3 (types utilisés,
déjà pair du parser). Les SDK MCP officiels client/server2.3.1/node2.1.1, Swagger Parser,
Ajv/formats et les prototypes restent verrouillés ; aucun framework de service ajouté.

| Commande livrée | Portée réelle |
|---|---|
| npm run lint | ESLint recommended sur .cjs Node scripts/tests/loader/configs ; globals DOM uniquement pour le test Playwright |
| npm run types | TypeScript checkJs strict sur contracts/loader.cjs et scripts/build-contracts.cjs ; types Node/OpenAPI/Ajv, pas toute la base historique ni les futures apps |
| npm run build | OpenAPI autoportant à références internes et schémas MCP autonomes dans artifacts/contracts ; aucune compilation des trois services |
| npm test / npm run check | Toutes les 248 vérifications antérieures conservées, plus 8 tests de qualification ; check inclut aussi lint/types/build |
| npm run test:browser | Parcours des prototypes, deux thèmes, clavier et largeurs existantes ; aucune nouvelle UI |

Le loader extrait le seul assemblage utile du banc MCP et partage l'assertion base64
avec les tests API. Le serveur et ses identités synthétiques restent dans tests/support.
Le build utilise le bundler standard, jamais un résolveur maison. Son test compare deux
constructions, consomme les seuls artefacts après suppression de ses copies de sources,
et exerce les 31 outils/arguments invalides via les SDK officiels en HTTP loopback.
Les autres tests prouvent les refus lint/type/runtime/ref locale/HTTP/format et de sortie
absente/corrompue. Les JSON sources et fixtures sont conservés.

Décision technique **proposée au coordinateur sous mandat** : retenir cet outillage
pour la qualification L0 après CI Linux et revues indépendantes sur le SHA exact.
Aucune validation du propriétaire n'est inventée. Le compte rendu actuel est dans
[L0-TOOLCHAIN](../tasks/L0-TOOLCHAIN.md) ; les preuves post-commit restent dans la PR.
L'adoption locale de ces outils ne qualifie pas OAuth/Logto ni les futures apps.

## Extensions de commandes proposées pour les services L1

Les commandes livrées ci-dessus ne sont pas des contrôles de services applicatifs.
Le tableau suivant décrit leur extension ou les futures suites en L1 : ces portées
ne sont ni exécutées ni annoncées vertes. Elles seront ajoutées avec leurs composants
et configurations, sans --if-present qui masquerait un workspace incomplet.

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

## Preuves historiques et conditions initiales de clôture

Le [compte rendu de l’étude initiale](../tasks/L0-ADR01.md) conserve les preuves historiques sous Node26 :
`npm ci --ignore-scripts`, `npm test`, `npm run check` (75/75 après fusion de develop),
`npm run test:browser` (succès). Les 29 tests initiaux restent un constat historique ;
les 75 de cette étape incluaient les contrats de données et les contrôles du miroir CI intégrés.
Ces preuves historiques portaient sur le cadre, les prototypes et les schémas L0 alors existants, sous Node
26.2.0. Le suivi ci-dessus les complète sous Node24 sans prétendre construire les services.
Aucun build, lint sémantique, contrôle TS, test PostgreSQL ni interopérabilité MCP
applicatifs n'a été exécuté : les composants correspondants n'existent pas encore.
Au dernier contrôle Docker de cette étude, la CLI répondait mais le moteur Linux
n'était pas joignable ; ce constat ne prouve pas son état courant.

Lors de l’étude initiale, ADR01 restait ouverte jusqu’au choix d’architecture/runtime arrêté et consigné par
le coordinateur dans son mandat après qualification et revues indépendantes ;
convergence avec ADR-02 et contrat API/MCP ; versions directes/transitives verrouillées pour le périmètre consommé L0 ;
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
Ces preuves historiques seules ne clôturaient ni L0 ni L1. La décision du30 octobre
ci-dessus fixe désormais le choix de développement, après qualification du périmètre
L0 consommé ; sa candidate exige toujours revues et CI avant intégration. Aucun
achat, déploiement ou changement de visibilité n’est engagé.
