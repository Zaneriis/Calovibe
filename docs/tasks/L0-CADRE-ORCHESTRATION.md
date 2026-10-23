# L0-CADRE-ORCHESTRATION — finalisation et transmission

Demande humaine : finaliser le cadre avant démarrage du développement dans un autre contexte ;
fournir un prompt autonome. Nombre de développeurs variable : autant que de tâches indépendantes,
sous réserve des capacités réelles. Ne pas lancer le développement métier dans cette tâche.

Périmètre : AGENTS.md, README, DEVELOPPEMENT-AUTONOME.md, ORCHESTRATION.md et PROMPT-DEMARRAGE.md.
Dépendances : CI et règles Git existantes. Aucun changement de runtime, workflow ou code produit.

## Critères et vérification avant rédaction

- Rôles, capacité variable, créneaux de revue et indépendance de l'auteur explicites : revue fonctionnelle/tests.
- Branche/worktree/PR propres à chaque tâche, propriété des fichiers et contrats, ressources de test isolées : revue du protocole.
- PR en parallèle, intégrations séquentielles, actualisation puis nouvelle CI et nouvelles revues au SHA exact : revue des règles.
- Prompt complet sans historique de conversation, état L0/L1 honnête et limites connues : revue de la transmission.
- master inchangée, develop seule cible, aucun achat/secret/accès Hermès ajouté : diff et refs Git.
- Sources reliées depuis README/AGENTS ; suite existante inchangée : npm run check, CI complète, revues indépendantes.

UI non applicable à confirmer indépendamment : documentation et consignes seulement.
Pas de nouveau test de code pour ce changement documentaire ; aucune logique exécutable ajoutée.
Le déploiement d'une équipe de développeurs et les worktrees applicatifs démarreront dans le
nouveau contexte : les consignes documentées ne sont pas une preuve d'exécution de cette équipe.
