# L1-MCP — serveur réel et délégation vers l’API

Mandat L1 après convergence f5caa319 et CI post41130408855 verte. Branche codex/l1-mcp
depuis develop f5, worktree artifacts/mcp-service. Contrat L1-SERVICES revu et stable.
Backend/session/web restent en développement ; ne pas prétendre L1 global livré.

Propriété : mcp/ et cette fiche, sources TypeScript strict, build/runtime/tests et
Dockerfile propres. Ne pas importer les fixtures ou serveurs de tests dans le runtime.
Le catalogue31 reste contrat de référence, pas une liste d’outils fictifs exposés.
Fichiers racine package/lock/check/eslint/CI/tests-isolation : transfert explicite
du coordinateur requis (backend puis web propriétaires au démarrage). mcp/package
est propre ; installation temporaire sans écriture du verrou possible pour coder,
installation verrouillée et contrôles complets exigés avant candidature finale.

Critères avant code :

- Vrai SDK officiel client/server2.4.0/adaptateurNode2.1.2, jose6.2.13 ; vérifier
  versions/peers/audit. HTTP Streamable2026-07-28, santé minimale et arrêt propre.
- Exposer uniquement calovibe_service_status, entrée objet vide stricte, résultat
  structuré de la vraie API privée. Les31 capacités alimentaires restent absentes.
- JWT entrant vérifié par jose/JWKS sur issuer configuré et audience MCP exclusive,
  expiration/signature/scope ; découverte/challenge conformes au SDK. Aucun jeton
  API accepté au gate. Refus avant échange/appel API sur token/droit invalides.
- Délégation RFC8693 native vers l’autorité configurée, audience API distincte,
  scope read seulement pour cet outil, même sujet et droits en intersection.
  Vérifier la réponse aval (signature/issuer/audience/sujet/scopes), pas de token
  passthrough, repli sur compte puissant ou suppression de claims. Pas de cache
  de jetons inutile pour ce premier outil. Appeler réellement /api/_technical/status.
- Clients préenregistrés et secrets lus en fichiers ; URL cibles fixes de confiance,
  pas de SSRF depuis arguments de l’outil. Ni secret/JWT/PII dans URL, logs ou erreurs.
  Toute réponse API invalide/panne/401/403 donne un refus/erreur honnête sans succès
  synthétique. Aucune connexion à la base applicative.
- Build/image indépendants des sources/sorties web/backend, sans privilèges ni
  secrets dans l’image ; SHA exact. Préserver référence HTTP et tests existants.
- E2E HTTP du vrai serveur : seul outil listé, entrée invalide, nominal traversant
  échange→API, tous refus/erreurs avec compteurs de non-appel et fermeture. JWKS et
  échangeur/API HTTP synthétiques strictement de test autorisés pour cette couche ;
  ne pas les présenter comme preuve du parcours Keycloak/backend global, qui doit
  être ajouté lors de l’assemblage L1. Aucun serveur OAuth maison dans le produit.

Livraison : source/build/tests/README, PR exacte vers develop sans intégrer, suite
requise et trois revues. Docker local réservé au backend au démarrage : programmer
build/smoke image après transfert de créneau ; tests HTTP locaux à ports aléatoires
indépendants possibles. Adapter tests d’isolation du build seulement après transfert,
sans affaiblir les autres services ni les cas source manquante.

## Livraison candidate du 30 octobre 2026

Statut : runtime et tests livrés pour revue, image Linux à qualifier en CI ; L1
global reste ouvert. Profil demandé par le coordinateur : Sol/high ; aucun achat
ni changement de modèle effectué. L’outil ne permet pas au développeur d’attester
indépendamment le nom effectif de son modèle courant.

Transferts explicites reçus du coordinateur après stabilisation web : verrou npm
(ajouts MCP sans modifier les versions des autres composants), seule adaptation
MCP de `tests/service-layout.test.cjs`, et nouveau workflow autonome
`.github/workflows/mcp.yml`. `ci.yml`, package/scripts/configs racine restent
inchangés. Le coordinateur conservera les adaptations backend/web distinctes à
la convergence. Aucun accès Docker local tenté après signalement du moteur 500.

Le runtime `mcp/src/{main,config,security,server}.ts` expose réellement le SDK HTTP
et son unique outil. Le jeton aval signé est vérifié avant GET privé, avec `azp`
du client MCP, même propriétaire, audience API exclusive, scope read et rôle read
exacts. L’API garde sa propre vérification des clients légitimes ; aucune règle
d’audience de l’API n’est élargie. Les erreurs ne livrent jamais de donnée synthétique.

| Critères | Preuves exécutées / limites |
|---|---|
| HTTP moderne, seul outil, arguments/outil inconnus, discovery/challenge | `mcp/tests/service.test.cjs`, client officiel ; HTTP réel du serveur produit |
| JWT issuer/signature/audience/temps/sujet/droits ; refus avant aval | Tests signés RS256 avec JWKS HTTP, compteurs d’échange/API inchangés |
| Échange natif, autre jeton API, read seulement, sub/azp/rôles | Test nominal HTTP et refus de scopes/rôles/sujet/client/signature/audience aval |
| Pannes, timeouts, redirections, corps trop grands/invalides, statuts inattendus | Tests du wrapper et des dépendances avec erreurs honnêtes et non-appels |
| Secrets fichiers/configuration fermée, démarrage sans fuite | `mcp/tests/config.test.cjs` ; image/logs réels encore à qualifier en CI |
| Ready/liveness et fermeture pendant appel bloqué | Dépendances de santé vérifiées,503 injectés ; abort/HTTP close idempotent |
| Build indépendant et sources manquantes | `tests/service-layout.test.cjs`, seule partie MCP modifiée ; cas backend/web historiques conservés |
| Référence alimentaire préservée | `mcp/tests/mcp-reference.test.cjs` inchangé ; toujours synthétique et hors runtime |
| Image SHA, prod workspace, utilisateur non privilégié, secrets et SIGTERM | Dockerfile avec digest Node officiel reçu du coordinateur ; `mcp/tests/image-smoke.cjs` à exécuter par nouveau job CI |
| UI/UX | Aucune interface ni maquette modifiée ; N/A à confirmer par revue indépendante |

Commandes réellement exécutées sous Node 24.22.1 portable, npm 11.13.0 :

- `npm ci --ignore-scripts --offline --no-audit --no-fund` : réussi après
  escalade nécessaire aux liens workspaces Windows ; première tentative sandbox
  refusée EPERM. Ajout ultérieur du lint TS propre par `npm install --ignore-scripts
  --offline --no-audit --no-fund`, versions verrouillées ; audit complet0.
- `npm run check` :259/259, lint/types/builds historiques réussis. Ce check racine
  ne prétend pas encore inclure les nouveaux tests MCP.
- `npm run types --workspace @calovibe/mcp` : réussi ; compilation TS strict réussie.
- `npm run lint --workspace @calovibe/mcp` : réussi, incluant lint TS avec types
  et scripts/tests CJS ; aucun contrôle racine assoupli.
- `node --test mcp/tests/config.test.cjs mcp/tests/service.test.cjs` :51/51 réussis.
  HTTP loopback nécessite escalade réseau Windows (sandbox EACCES), pas de faux vert.
- `npm test --workspace @calovibe/mcp` :130/130 à l’étape précédente, incluant
  build, référence préservée et47 premiers nouveaux tests ; quatre cas additionnels
  couverts par les51/51 ci-dessus (wrapper/JWKS/échange délai/corps).
- `node --test mcp/tests/config.test.cjs mcp/tests/service.test.cjs
  mcp/tests/mcp-reference.test.cjs tests/service-layout.test.cjs` :131/131 à
  l’étape initiale, avant six ajouts de cas ; l’isolation et la référence sont inchangées.
- `npm audit --audit-level=low` :0 vulnérabilité ; `npm ls --workspace
  @calovibe/mcp --omit=dev --all` confirme server2.4.0/node2.1.2/jose6.2.13 et peers.
- `git diff --check` : réussi.

Le nouveau workflow tourne à chaque push/PR, checkout le SHA head exact de la PR,
installe par npm ci, audit/lint/types/build/tests MCP, construit et smoke l’image
étiquetée par `git rev-parse HEAD`. Résultats après commit, URL de PR, CI et avis
indépendants doivent être consignés dans la PR sur le SHA exact sans réécrire cette
fiche pour s’auto-approuver.

Limites restantes : image Linux/smoke non exécutés localement ; vrai parcours
MCP→Keycloak→backend→PostgreSQL, HTTPS local avec CA et déploiement restent à
l’assemblage L1. Les doubles HTTP de tests ne qualifient pas ces intégrations.
Les trois revues indépendantes et tous contrôles CI doivent être verts avant
intégration par le coordinateur. Le développeur ne fusionne pas sa PR.
