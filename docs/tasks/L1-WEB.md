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

## Livraison du 30 octobre2026

WIP initial sauvegardé en33bcb22 avant séparation des prototypes. Le commit candidat
final figure dans la PR ; aucune intégration autonome. Profil hérité du coordinateur,
aucun changement de modèle ou achat.

Propriété étendue explicitement par coordination : manifestes/verrou puis capacité
libérée pour MCP ; mockups/ et helpers hors web/, liens CAHIER/README ; partie web
isolation, contrôles/check/ESLint et CI. Les nouvelles assertions backend/MCP sont
conservées dans leurs branches et seront réunies par la convergence, sans être
supprimées ni prétendues exécutées dans cette branche issue de f5.

Critères couverts : build React réel indépendant, TS strict, lint React Hooks,
chargement/connexion/statut/logout, refus401/403, pannes/réessai, schéma invalide,
CSRF en mémoire, aucun stockage client, doubleclic, destinations proxy fixes,
refus chemins/méthodes non autorisés, santé live minimale, actifs manquants refusés,
clair/sombre320/1024, clavier et captures sous web/checks/. Le prototype a été déplacé
vers mockups/ racine avec ses tests et helpers, sous commande `npm run prototype`.
Pas de code alimentaire ou d’identités simulées dans les actifs du produit.

Dépendances réellement installées : React/DOM19.3.1 (peer ReactDOM^19.3.1),
Vite8.3.5/pluginReact6.1.2 (peer Vite^8, Node^20.19 ou>=22.12), Fastify5.12.7,
static10.1.7/proxy11.6.5 (documentation installée : Fastify5), typesReact/DOM19.3.0,
typescript-eslint8.72.0 et hooks7.1.1. `npm ls` ne signale aucun peer invalide ;
installation et runtime/build réels complètent la lecture des métadonnées.

Commandes réellement exécutées sous Node24.22.1/npm11.13.0 :

- `npm ci --ignore-scripts` : succès, audit261 paquets, zéro vulnérabilité signalée.
- `npm run check` :263/263, aucun skip, puis lint incluant TS/Hooks, types contrats
  et web strict, build contrats : succès. Les trois builds isolés sont couverts.
- `npm run test:browser` : build Vite réel, ancien prototype déplacé et vrai web
  via proxy/serveur HTTP de contrat test : succès, deux thèmes320/1024 et clavier.
- `npm run lint --workspace @calovibe/web` et `npm run types --workspace
  @calovibe/web` : succès après correction des erreurs initiales, sans désactiver
  de règle. Les captures320 sombre et1024 clair ont été inspectées visuellement.
- `docker version --format '{{.Server.Version}}'` après escalade : moteur retourne
  HTTP500 sur la socket Docker Desktop ; aucune image construite/démarrée localement.

Limites : ces tests E2E utilisent uniquement le serveur HTTP de contrat sous
web/tests, jamais un backend de production. Ils ne qualifient pas Keycloak, TLS,
cookie Secure en navigateur, stockage PostgreSQL ou session L1 complète. Le Dockerfile
web est fourni, construction/digest/image et Compose restent à qualifier dans L1.
Date/repas/brouillons/annulation alimentaire non applicables à cet écran d’accès ;
ils restent obligatoires avec les premiers parcours métier. Revues indépendantes,
CI du commit exact et intégration L1 restent nécessaires.
