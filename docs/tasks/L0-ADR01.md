# L0-ADR01 — Proposition architecture et outillage

Statut : proposition livrée pour revue, ADR-01 ouverte. Aucun service applicatif livré.

## Périmètre, dépendances et isolation

- Résultat : recommandation comparée pour trois services conteneurisés (web, API, MCP), PostgreSQL, versions exactes et commandes de validation.
- Dépendances : aucune pour proposer ; ADR-02, contrats API/MCP et inventaire ADR-03 nécessaires avant validation du socle L1.
- Auteur : agent développeur L0-ADR01 ; coordinateur distinct responsable des revues et de toute intégration.
- Propriété exclusive : `docs/adr/ADR-01-architecture.md`, `docs/tasks/L0-ADR01.md`. Aucun fichier package, CI, code métier, contrat partagé ou registre L0 modifié.
- Branche : `codex/l0-architecture` ; worktree : `C:\Users\Leo14\.codex\worktrees\l0-architecture\Calovibe`.
- Base vérifiée : `origin/develop`, SHA `5a11d51812ad447023cdbdc4bb51e1e30a9cffaa`, arbre initial propre.
- Profil demandé : GPT-6.1 Sol, développement courant medium selon MODELES-AGENTS.md. Modèle/niveau effectifs : non exposés de façon vérifiable à cet agent ; aucune affirmation de sélection effective.
- Canaux : documentation architecture/outillage. Aucun écran ou comportement applicatif changé ; non-applicabilité UI à confirmer indépendamment.

## Critères et stratégie avant contenu

| ID | Critère | Nominal / erreur / limites et preuve attendue |
|---|---|---|
| A1 | Comparer au moins deux options proportionnées et recommander une architecture commune | Trois services applicatifs + PostgreSQL, MCP via API, photo isolée dans API, sans agent conversationnel ; lecture croisée cahier/backlog/ADR |
| A2 | Proposer des versions exactes et supportées, avec sources officielles actuelles | Versions vérifiées avec pages officielles/registre ; absence de version ou incompatibilité signalée, aucun intervalle présenté comme verrou |
| A3 | Définir lint/types/tests/build stables | Distinguer commandes existantes exécutées et commandes L1 proposées ; ne pas déclarer exécuté un build absent |
| A4 | Préserver les décisions ouvertes et le périmètre | Auth, fournisseurs et production restent conditionnés à leurs ADR ; aucun L0/L1 déclaré terminé |
| A5 | Vérifier le cadre existant et publier une candidate isolée | Installer le lock existant, exécuter `npm run check` et `npm run test:browser` ; consigner échecs/limites exacts et revue indépendante sur SHA |

Sources à lire : AGENTS.md, CAHIER-DES-CHARGES.md, BACKLOG.md, DECISIONS-L0.md, DEVELOPPEMENT-AUTONOME.md, ORCHESTRATION.md et MODELES-AGENTS.md ; lus avant rédaction. Skill Ponytail lu et appliqué.

## Livraison et vérification

Résultat : ADR comparant React/Vite et Next.js, recommandation React/Vite + Fastify + PostgreSQL + SDK MCP v2. Versions directes exactes vérifiées auprès du registre npm et sources officielles. Les scripts applicatifs sont proposés ; aucun build absent déclaré exécuté. La PR cible uniquement `develop`. Aucune intégration par le développeur. Le SHA et l'URL de PR sont conservés dans le compte rendu de PR, sans nouveau commit après revue.

Commandes réellement exécutées le 23 octobre 2026 dans ce worktree :

| Commande | Résultat |
|---|---|
| `git status --short`, `git rev-parse HEAD`, `git rev-parse origin/develop` | Arbre initial propre, deux SHA `5a11d51812ad447023cdbdc4bb51e1e30a9cffaa` ; Git revérifié avec permission étendue car le sandbox ne reconnaissait pas correctement le worktree |
| `git switch -c codex/l0-architecture origin/develop` | Branche créée et suivi origin/develop ; aucune écriture sur develop/master |
| `node --version`, `npm --version` | v26.2.0 et 11.13.0 |
| `npm view <paquet> version`, `engines`, `peerDependencies`, `dependencies` | Versions/compatibilités du tableau ADR interrogées directement ; aucune installation applicative ni modification du manifeste/lock du projet |
| `npm ci --ignore-scripts` | Succès, 3 paquets ajoutés, audit npm : 0 vulnérabilité détectée sur ces dépendances existantes |
| `npm run check` | Succès, 29 tests réussis, 0 échoué, 0 ignoré ; contrôle du runtime et de la syntaxe existants |
| `npm run test:browser` | Succès Chromium : parcours photo, dîner, dates/eau, brouillon, retour, dépassement, annulation ; largeurs 320–1024 px et variantes clair/sombre existantes |
| `docker version --format '{{.Server.Version}}'` | Échec code 1 : pipe dockerDesktopLinuxEngine absent ; aucun conteneur lancé ni build revendiqué |

Critères A1/A2/A3/A4 couverts par les sections comparaison, versions, commandes et statut ouvert de l'ADR. A5 couvert par la suite existante ; commandes de la candidate exacte à relancer après commit et à joindre à la PR. Aucun comportement produit nouveau ne demande de nouveau test fonctionnel ; impact documentaire, non-applicabilité UI soumise au réviseur indépendant.

Limites : les métadonnées prouvent publication et plages déclarées, pas compilation ni interopérabilité de l'ensemble. Aucun lock applicatif, digest de base, build de service, typecheck/lint applicatif, test PostgreSQL ou client MCP réel livré. L'authentification/autorité reste ADR-02 et décision humaine ; ADR-03 reste nécessaire pour le serveur/domaine/exploitation. La transition Node 26.2.0 du cadre vers Node 24.22.1 proposé doit être revue et testée ensemble avec la CI. Les futurs scripts ne sont pas exécutables dans ce dépôt à ce stade. La décision d'architecture et la clôture de L0 restent ouvertes.

## Revues et corrections

Revues fonctionnelle, qualité des tests et non-applicabilité UI à demander au coordinateur sur le SHA exact. Aucune auto-approbation. Aucun blocage ni cycle de correction recensé à ce stade.


Correction coordinateur avant revue : distinguer clôture ADR-01 (choix explicite, versions verrouillées et commandes qualifiées par amorçage technique L0 sans métier) et réalisation L1 (services construits/démarrés, santé, droits, digests). Aucun prérequis L1 ajouté à L0. Ce retour de cadrage n'est pas une revue indépendante.
