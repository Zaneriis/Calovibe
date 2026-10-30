# Calovibe

Projet personnel de suivi alimentaire, hydratation, poids et objectifs, accessible
par le web, une API et un serveur MCP pour Hermès.

## Point d’entrée pour les agents

Lire [AGENTS.md](AGENTS.md), le [cahier des charges](docs/CAHIER-DES-CHARGES.md),
le [backlog](docs/BACKLOG.md) et [ORCHESTRATION](docs/ORCHESTRATION.md).
Le [registre L0](docs/DECISIONS-L0.md) consigne les décisions validées.
`master` reste figée ; aucune fusion ni push. Les PR ciblent `develop`, avec
suite complète et revues indépendantes sur le commit exact avant fast-forward.

## Organisation

```
backend/           API, runtime et documentation propres
web/               Application React réelle, serveur, build et tests propres
mcp/               Service MCP, runtime et documentation propres
shared/contracts/  Source unique des schémas communs
mockups/           Maquettes historiques, helpers et tests de prototypes
docs/             Spécification et documentation transversale
scripts/           Contrôles communs
tests/            Tests transversaux
```

Les dossiers de services contiennent le vrai développement applicatif.
Les maquettes ont leurs données d’exemple et restent séparées du produit.
Références : [accueil](mockups/calovibe-accueil.html),
[ajout manuel](mockups/calovibe-ajout.html), [photo](mockups/calovibe-photo.html).

## Installer, construire et vérifier

Node24.22.1/npm11.13.0. Les dépendances partagent un verrou racine ; chaque service
possède ensuite son build indépendant, sans sources ni sorties des deux autres :

```
npm ci --ignore-scripts
npm run build:backend
npm run build:web
npm run build:mcp
npm run check
```

Le front réel L1-WEB construit des actifs React/Vite et démarre un serveur Fastify
avec proxy fixe API/auth. Voir [web/README.md](web/README.md) pour configuration,
commandes et limites. `BACKEND_ORIGIN` est obligatoire ; la connexion dépend du
backend/session et de Keycloak. Les tests web avec API de contrat HTTP réservée
aux tests ne constituent pas une qualification de l’authentification complète.
Le socle L1 et le déploiement nécessitent toutes les preuves du backlog.
Les commandes et limites backend/MCP sont documentées dans leurs dossiers.

## Ouvrir le prototype historique

```
npm run prototype
```

Ouvrir http://127.0.0.1:4173 ; arrêter avec Ctrl+C. Ce serveur local utilise
`mockups/helpers/` et produit ses fichiers sous `artifacts/prototype-dist/`.
Les journées sont séparées et le thème conserve le parcours dans le prototype,
mais les données sont temporaires : aucun stockage applicatif durable.
Lucide est fourni localement, sans CDN. Ces fragments sont des références de
comportement/design, jamais du code de production à recopier.

```
node --test mockups/tests/navigation.test.cjs
node mockups/tests/browser-check.cjs
```

La seconde commande nécessite Chromium installé par Playwright. Les preuves du
prototype restent sous `artifacts/browser/` ; les captures du vrai front sont
sous `web/checks/`. Les suites sont distinctes et restent toutes requises.

Hermès demeure un client externe ; aucun accès à sa configuration n’est requis.
Le développement local n’exige pas l’accès au serveur Ubuntu de production.

