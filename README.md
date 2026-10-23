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
les décisions et contrats applicatifs L0, le socle L1 et les fonctionnalités restent à réaliser.
Le backend, le serveur MCP, la base et le déploiement de production ne sont pas implémentés.
Les choix encore ouverts sont identifiés dans les ADR du cahier des charges.

Références : [accueil](mockups/calovibe-accueil.html), [ajout manuel](mockups/calovibe-ajout.html), [photo](mockups/calovibe-photo.html). Les fragments sont destinés à l’aperçu conversationnel ; ils ne constituent pas des pages de production autonomes.

## Contrôles existants

Le [cadre de développement autonome](docs/DEVELOPPEMENT-AUTONOME.md) définit les rôles,
preuves et barrières locales. Le [registre L0](docs/DECISIONS-L0.md) sépare les décisions
validées, propositions techniques et accès manquants. Avec Node 26.2.0, installer d'abord
les dépendances verrouillées par `npm ci --ignore-scripts`, puis lancer `npm run check`.
Le contrôle utilise Ajv et ajv-formats pour vérifier la proposition de schémas L0 ;
il vérifie aussi la syntaxe des scripts et les suites du cadre, des prototypes et
du correctif de miroir CI.

```sh
npm ci --ignore-scripts
npm run check
npx playwright install chromium
npm run test:browser
```

GitHub Actions exécute ces contrôles à chaque push et pull request sur Ubuntu, avec
`npx playwright install --with-deps chromium`. Les captures sont générées dans
`artifacts/browser/` et conservées trois jours par run. Voir la [tâche CI](docs/tasks/L1-CI.md).
Ces tests portent sur le cadre, les maquettes, la proposition de schémas L0 et le miroir CI ;
ils ne prouvent pas une fonctionnalité de production. Les tests des futurs services restent à ajouter.

Hermès est un client externe du contrat MCP ; aucun accès à sa configuration n'est requis.
Le socle peut être développé sous Docker sur ce PC. Ubuntu intervient pour le déploiement réel.
