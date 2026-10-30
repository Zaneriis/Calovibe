# Calovibe

Projet personnel de suivi alimentaire, hydratation, poids et objectifs, accessible par le web, une API et un serveur MCP pour Hermès.

## Point d’entrée pour les agents

1. Lire [AGENTS.md](AGENTS.md).
2. Lire le [cahier des charges](docs/CAHIER-DES-CHARGES.md).
3. Suivre le [backlog et les critères d’acceptation](docs/BACKLOG.md).
4. Pour coordonner le développement parallèle, suivre [ORCHESTRATION.md](docs/ORCHESTRATION.md).
   Le [prompt de démarrage](docs/PROMPT-DEMARRAGE.md) est prêt à copier dans un nouveau contexte.
   Le [profil de modèles Équilibré](docs/MODELES-AGENTS.md) est validé pour cette organisation.

## État actuel

Règle Git : `master` est figée, **jamais de fusion ni de push vers `master`**.
`develop` est la branche par défaut et d'intégration ; les pull requests la ciblent et
exigent CI verte et revues indépendantes sur le commit exact. Le dépôt reste privé,
sans protection GitHub payante : cette discipline est formalisée dans [AGENTS.md](AGENTS.md).

Spécification version 1.1 et prototypes interactifs. Le cadre de travail et la CI sont en place ;
des propositions de [données](docs/contracts/DATA.md) et de [contrats API/MCP](docs/contracts/API-MCP.md) sont vérifiables localement. L0 reste à qualifier, puis le socle L1 et les fonctionnalités restent à réaliser.
Le backend, le serveur MCP, la base et le déploiement de production ne sont pas implémentés.
Les choix encore ouverts sont identifiés dans les ADR du cahier des charges.

Références : [accueil](mockups/calovibe-accueil.html), [ajout manuel](mockups/calovibe-ajout.html), [photo](mockups/calovibe-photo.html). Les fragments sont destinés à l’aperçu conversationnel ; ils ne constituent pas des pages de production autonomes.

## Ouvrir uniquement l’aperçu web

Avec les dépendances installées (`npm ci --ignore-scripts`), lancer :

```sh
npm run preview
```

Ouvrir http://127.0.0.1:4173 dans le navigateur ; arrêter avec Ctrl+C.
Cet aperçu n’affiche qu’une interface web responsive, avec un bouton « Mode sombre »
qui conserve le parcours en cours. Les quatre variantes des fragments restent des
références de comparaison, pas quatre applications ni une application mobile native.
Lucide est chargé localement, sans CDN ; ouvrir directement un fragment HTML ne charge
pas cette bibliothèque et peut laisser ses pictos vides.

La frise remplace le champ date séparé. Au démarrage et via « Aujourd’hui », le jour
courant est calculé dans Europe/Paris. Les journées consultées restent distinctes.
Il s’agit toujours d’un prototype avec données d’exemple et état temporaire : aucun
backend ou stockage durable. Le serveur d’aperçu écoute uniquement sur ce PC.

## Contrôles existants

Le [cadre de développement autonome](docs/DEVELOPPEMENT-AUTONOME.md) définit les rôles,
preuves et barrières locales. Le [registre L0](docs/DECISIONS-L0.md) sépare les décisions
validées, propositions techniques et accès manquants. Avec Node 24.22.1 et npm 11.13.0, installer d'abord
les dépendances verrouillées par `npm ci --ignore-scripts`, puis lancer `npm run check`.
Le contrôle utilise les versions exactes verrouillées de Swagger Parser pour OpenAPI 3.1.2,
Ajv et ajv-formats pour les schémas DATA et DTO API/MCP (strict, formats complets) ;
il vérifie aussi la syntaxe, le lint Node, les types de l’assembleur partagé et du build,
les suites du cadre/prototypes/miroir CI, puis construit les contrats autoportants.

```sh
npm ci --ignore-scripts
npm run lint
npm run types
npm run build
npm run check
npx playwright install chromium
npm run test:browser
```

GitHub Actions exécute ces contrôles à chaque push et pull request sur Ubuntu, avec
`npx playwright install --with-deps chromium`. Le runner éphémère fixe npm 11.13.0 ;
aucune installation globale locale n’est effectuée par le projet. Les captures sont générées dans
`artifacts/browser/` et conservées trois jours par run. Voir la [tâche CI](docs/tasks/L1-CI.md).
Ces tests portent sur le cadre, les maquettes, les schémas DATA/API/MCP et le miroir CI.
La référence HTTP utilise les vrais SDK MCP avec 31 outils et des identités/réponses
synthétiques ; elle ne prouve pas une authentification ni une fonctionnalité de production.
Le build produit dans `artifacts/contracts/` un OpenAPI à références internes et un
catalogue dont chaque schéma MCP est autonome. Un test consomme ces seuls artefacts
avec le client officiel, sans les schémas sources. Les types couvrent uniquement
`contracts/loader.cjs` et `scripts/build-contracts.cjs` (checkJs strict), pas les futures apps. Les tests des futurs services restent à ajouter. Le format base64
photo proposé exige une assertion canonique bornée, documentée dans le contrat API/MCP ;
la détection du média et la conservation attendent ADR-05.

Hermès est un client externe du contrat MCP ; aucun accès à sa configuration n'est requis.
Le socle peut être développé sous Docker sur ce PC. Ubuntu intervient pour le déploiement réel.
