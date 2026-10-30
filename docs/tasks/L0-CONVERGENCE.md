# L0-CONVERGENCE — décision technique et passage au développement réel

Mandat humain du 30 octobre2026 : prioriser services réels et journal persistant,
conserver les maquettes comme références ; pipeline de questions vérificateur puis
humain avec remplacement par tâche indépendante. Auteur coordinateur, branche
codex/l0-convergence issue de develop92c1ebe, références UI/layout4dd827d conservées.
Fichier d’étude L1-SOCLE.md existant non suivi préservé hors commit.

Critères avant code documentaire :

- Attendre l’intégration qualifiée SDK-SECURITY et la revue du correctif consentement
  exact9e12d91 avant d’arrêter les choix ; ne pas transformer le succès d’un banc
  en livraison d’authentification applicative ou de services.
- Consigner dans ADR01/02/DECISIONS la pile TypeScript/React/Vite/Fastify/pg et
  Keycloak local préenregistré, contraintes d’audience et scopes incluses. Pas de
  fournisseur distant, dépense, accès Hermès ou exposition administrative nouvelle.
- Identifier accès Ubuntu/domaines/secrets de production manquants ; ne pas bloquer
  le développement local/CI dessus ni déclarer la production livrée.
- Figer le contrat technique minimal L1 : santé publique minimale, disponibilité
  interne, session web sécurisée et statut privé API ; outil MCP technique réel
  déléguant à l’API sans exposer de faux outils alimentaires.
- Reporter le workflow de clarification décidé par l’humain dans AGENTS et
  ORCHESTRATION, sans ajouter une approbation préalable à chaque petit choix ni
  modifier les trois revues exactes ou les contrôles requis.

Vérification : trois revues indépendantes sur SHA exact (auteur exclu), cohérence
références/preuves/état réel, aucun changement contrats métier JSON, suite requise
et CI vertes. Après FF et CI post-intégration, autoriser les tâches L1 prêtes.
