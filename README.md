# Calovibe

Projet personnel de suivi alimentaire, hydratation, poids et objectifs, accessible par le web, une API et un serveur MCP pour Hermès.

## Point d’entrée pour les agents

1. Lire [AGENTS.md](AGENTS.md).
2. Lire le [cahier des charges](docs/CAHIER-DES-CHARGES.md).
3. Suivre le [backlog et les critères d’acceptation](docs/BACKLOG.md).

## État actuel

Spécification version 1.0 et prototypes interactifs. Le backend, le serveur MCP, la base et le déploiement de production restent à implémenter. Les choix encore ouverts sont identifiés dans les ADR du cahier des charges.

Références : [accueil](mockups/calovibe-accueil.html), [ajout manuel](mockups/calovibe-ajout.html), [photo](mockups/calovibe-photo.html). Les fragments sont destinés à l’aperçu conversationnel ; ils ne constituent pas des pages de production autonomes.

## Contrôles existants des prototypes

Le [cadre de développement autonome](docs/DEVELOPPEMENT-AUTONOME.md) définit les rôles,
preuves et barrières locales. Le [registre L0](docs/DECISIONS-L0.md) sépare les décisions
validées, propositions techniques et accès manquants. Démarrer par `npm run check`
avec Node 26.2.0 ; aucun paquet n'est nécessaire pour ce contrôle local.

```sh
node --test mockups/tests/navigation.test.cjs
node mockups/tests/browser-check.cjs
```

Le second script utilise le runtime Playwright et Chrome de l’environnement Windows dans lequel les maquettes ont été créées. Le lot L0 doit définir les dépendances et commandes portables du futur projet ; ce script n’est pas une configuration CI de production.
