# L0 — Suivi de coordination

Constat vérifié le 23 octobre 2026, avant réalisation. Ce registre ne clôt aucun lot.
Les preuves postérieures aux commits restent dans les PR, liées au SHA exact.

## État de départ

- Dépôt GitHub privé `Zaneriis/Calovibe`, branche par défaut `develop`.
- `origin/develop` : `5a11d51812ad447023cdbdc4bb51e1e30a9cffaa`.
- `master` figée : `45e938bd4082880ea7670462d1a7b8351028026b`, inchangée au contrôle distant.
- PR 1 et 2 intégrées ; aucune PR ouverte au démarrage.
- CI du SHA de départ réussie : https://github.com/Zaneriis/Calovibe/actions/runs/39962467065.
- Un seul worktree initial, propre. Aucun service métier, contrat applicatif ou déploiement livré.
- Node local `26.2.0`, npm `11.13.0`, Docker CLI `28.1.1`, Compose `2.35.1`.
- Moteur Docker Linux inaccessible au premier contrôle ; démarrage non destructif demandé.
- `npm run check` : 29 tests réussis. Premier `npm run test:browser` bloqué par le binaire Chromium absent dans le sandbox ; relance hors sandbox réussie (parcours, deux thèmes, largeurs 320–1024 px).
- Aucun accès Ubuntu, domaine, secret ou fournisseur photo fourni/vérifié. Hermès reste externe.

## Capacité et responsabilités

Autorisation humaine explicite de développer, déléguer, ouvrir des PR et intégrer selon
les règles du dépôt. Quatre agents simultanés au total : coordinateur et trois sous-agents.
Les premières études sont indépendantes ; dès leur candidature, libérer les créneaux pour
les revues distinctes fonctionnelle, qualité des tests et UI/UX (non-applicabilité motivée).
Les auteurs ne s'auto-approuvent pas ; seul le coordinateur intègre, séquentiellement.

Sous-agents demandés : `gpt-6.1-sol`, raisonnement `high`, via paramètres explicites.
Les outils exposent ce choix, sans attestation indépendante du moteur effectif.
Le modèle du coordinateur n'est pas changé par instruction ; aucun réglage global,
achat, dépassement payant ou API payante ajouté.

## Tâches et frontières

Toutes les branches partent du SHA de `develop` ci-dessus. Les chemins ci-dessous sont
les worktrees créés et attachés par l'application, pas des répertoires partagés par défaut.

| ID | Dépendances | Auteur / branche | Worktree absolu | Propriété et résultat |
|---|---|---|---|---|
| L0-ADR01 | Aucune ; étude seulement | `/root/l0_architecture`, `codex/l0-architecture` | `C:\Users\Leo14\.codex\worktrees\l0-architecture\Calovibe` | `docs/adr/ADR-01-architecture.md`, `docs/tasks/L0-ADR01.md` ; comparaison, versions officielles et commandes proposées/vérifiées |
| L0-ADR02 | Aucune ; étude seulement | `/root/l0_auth`, `codex/l0-auth-mcp` | `C:\Users\Leo14\.codex\worktrees\l0-auth-mcp\Calovibe` | `docs/adr/ADR-02-auth-mcp.md`, `docs/tasks/L0-ADR02.md` ; recommandation auth et MCP, choix humains explicites |
| L0-DATA | Conventions proposées du registre ; aucun consommateur autorisé avant convergence | `/root/l0_data_contract`, `codex/l0-data-contract` | `C:\Users\Leo14\.codex\worktrees\l0-data-contract\Calovibe` | `contracts/data.schema.json`, `contracts/examples/`, `tests/contracts-data.test.cjs`, `docs/contracts/DATA.md`, `docs/tasks/L0-DATA.md` ; schémas et exemples validables proposés |
| L0-COORDINATION | Constats et orchestration | `/root`, `codex/l0-coordination` | `C:\Users\Leo14\Documents\ChatGPT\Calovibe` | Ce registre uniquement ; suivi durable, pas d'auto-approbation |

Extension attribuée exclusivement à L0-DATA après inventaire : `package.json`, le verrou
et `scripts/check.cjs`, pour installer Ajv et les formats standards à versions exactes,
et intégrer les tests de schémas dans la suite permanente. Aucun validateur maison.
La CI et le registre commun restent hors de son périmètre. Tout autre besoin sur les
fichiers partagés ou un contrat transversal remonte au coordinateur.
Les études ADR ne sont pas des implémentations d'authentification ni des validations humaines.

## Critères et vérification avant réalisation

1. Chaque tâche possède sa fiche avant contenu/code : critères, nominal, erreurs, limites,
   commandes et non-applicabilités proposées à la revue.
2. ADR01 : options proportionnées, versions exactes sourcées officiellement, dépendances et
   commandes vérifiables ; distinguer commandes futures et résultats réellement exécutés.
3. ADR02 : session web et CSRF, découverte/PKCE/audience/droits MCP, API sans transfert abusif
   de jetons ; cas accès autorisé, refus, erreur et expiration. Aucune interopérabilité déclarée
   sur un simple document. Autorité d'identité encore à choisir explicitement si nécessaire.
4. DATA : inconnu distinct de zéro, quantités décimales bornées, dates réelles, UUID et versions ;
   exemples valides/invalides testés ; calcul 200 kcal/100 g × 150 g = 300 kcal documenté,
   conversion g/ml sans équivalence refusée, limites inter-champs et transactionnelles explicites.
5. Chaque PR cible `develop`, expose SHA et preuves reproductibles. Suite existante complète,
   plus nouveaux tests applicables ; CI verte et revues indépendantes sur le SHA exact.
6. Si `develop` avance : fusion dans la branche de tâche, nouveaux tests et nouvelles revues.
   Intégration en fast-forward uniquement après vérification ; contrôle distant et CI après.

Ordre suivant : convergence technique et décisions nécessaires → contrats API/MCP complets,
client MCP de référence et commandes permanentes → clôture vérifiée L0 → L1 → L2 et suite.
ADR03 distingue accès production manquants et développement local possible. Aucun lot métier
ne démarre sur les seules propositions. ADR04–07 restent aux échéances du backlog.

## Reprise et limites

Les PR portent les SHA candidats, verdicts originaux, commandes, CI, blocages stables et
compteurs de corrections ; ne pas réinsérer une approbation dans un nouveau commit.
Après trois corrections infructueuses du même blocage : diagnostic et arrêt de cette
intégration sans assouplir les exigences. Continuer les tâches réellement indépendantes.
Ni les maquettes, ni les études, ni les tests du cadre ne prouvent une application livrée.
