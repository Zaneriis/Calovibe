# L1-WEB — front React connecté au contrat de session

Mandat : vrai front web L1, après convergence f5caa319 et CI post41130408855 verte.
Branche codex/l1-web depuis develop f5, worktree artifacts/web-service isolé.
Le contrat docs/contracts/L1-SERVICES.md est revu et stable. Backend/session évoluent
en tâches séparées ; cette tâche ne prétend pas livrer le système L1 complet.

Propriété : web/ (sources React/TS/CSS, build/runtime web, tests, documentation),
sa fiche. Aucun code de maquette repris comme application ; conserver mockups et
leurs parcours sous une commande prototype explicite. Aucun chiffre alimentaire
ou résultat de connexion simulé dans le produit. Aucun agent conversationnel.

Fichiers partagés package/lock/scripts/check/CI : réservés à L1-BACKEND au démarrage.
Ne pas les modifier sans transfert explicite du coordinateur. web/package.json est
propre à ce périmètre ; installation temporaire sans écriture du verrou autorisée
dans ce seul worktree pour coder. Avant publication finale, transférer la capacité
de mise à jour du verrou, obtenir installation verrouillée et contrôles complets.
Les installations communes et images restent à verrouiller, pas de faux succès npmci.

Critères avant code :

- Vrai build React19.3.1/ReactDOM19.3.1, TypeScript strict et Vite8.3.5/pluginReact6.1.2,
  versions/peers/audit à vérifier. Sorties runtime réelles, pas le prototype renommé.
- UI sobre Calovibe : chargement session, connexion, état connecté et déconnexion,
  erreurs récupérables, clair/sombre, responsive320–1024 et clavier. Pas de journal
  factice. GET /api/session puis statut privé ;401 revient à connexion, erreurs réseau
  restent compréhensibles avec réessai, aucune écriture rejouée automatiquement.
- Connexion via navigation fixe /auth/login ; pas de collecte mot de passe dans le
  front. Logout POST /auth/logout avec CSRF lié à la session dans X-CSRF-Token et
  credentials same-origin ; pas de token OIDC/session dans JS, localStorage ou URL.
  Le token CSRF reste mémoire. Pas d’identité propriétaire inventée dans le front.
- Serveur web réel servant les actifs construits et proxy à destinations fixes vers
  backend, uniquement chemins API/auth nécessaires, jamais proxy admin générique.
  /health/live minimal ; dépendance indisponible signalée honnêtement. Utiliser les
  bibliothèques compatibles retenues ; pas de destination proxy contrôlée par client.
- Build web indépendant, même sans sources/sorties backend/MCP. Préserver les tests
  d’isolation et du prototype ; nouveaux E2E du vrai web avec serveur API de contrat
  HTTP strictement réservé aux tests : nominal,401,403, panne/réessai, déconnexion,
  CSRF, double clic, clavier, thèmes/tailles. Distinguer ces tests de l’intégration
  complète Keycloak/backend encore dépendante de la tâche de session.

Livraison : code et tests, captures réelles, README commandes et limites ; commit
exact/PR vers develop, aucune intégration. Trois revues indépendantes et CI complètes
requises. Si la session backend n’est pas livrée, garder l’intégration L1 globale
explicitement en attente ; jamais qualifier le mock API de test de backend produit.
Image web/TLS et E2E complet seront coordonnés avec le socle et l’authentification.
