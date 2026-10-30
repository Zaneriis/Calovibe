# MCP Calovibe — socle L1

Serveur TypeScript strict, SDK officiel server2.4.0/adaptateur Node2.1.2, jose6.2.13,
Node24.22.1. HTTP Streamable2026-07-28 uniquement, sans repli legacy. Aucune base
applicative, aucun agent conversationnel. Hermès reste un client externe.

Un seul outil est exposé : `calovibe_service_status`, entrée `{}` stricte. Il échange
le jeton MCP auprès de l’autorité Keycloak configurée puis appelle réellement
`GET /api/_technical/status`. Son résultat structuré est la réponse backend validée :
`{schemaVersion:"0.1.0",status:"ready",version:"<SHA40>"}`. Les31 outils alimentaires
ne sont pas annoncés. Leur catalogue partagé et leur ancienne référence synthétique
restent conservés pour L2 ; le runtime n’importe ni tests ni exemples de contrats.

Après `npm ci --ignore-scripts` à la racine :

```sh
npm run types --workspace @calovibe/mcp
npm run build:mcp
npm test --workspace @calovibe/mcp
npm start --workspace @calovibe/mcp
```

Le build produit `mcp/dist/{main,server,config,security}.js` et le catalogue de référence
`mcp-tools.json`, sans construire web/backend. Les contrats viennent uniquement de
`shared/contracts/`. Le runtime utilise ses seuls JS et ses dépendances de production.

## Configuration à l’exécution

| Variable | Valeur attendue |
|---|---|
| `APP_VERSION` | SHA Git exact40 caractères hexadécimaux ; obligatoire |
| `MCP_ISSUER` | Issuer Keycloak exact, par exemple URI du realm, sans réécriture |
| `MCP_JWKS_URL` | Endpoint JWKS fixe de cette autorité |
| `MCP_TOKEN_ENDPOINT` | Endpoint fixe natif d’échange de cette autorité |
| `MCP_RESOURCE` | URI publique exacte de la ressource MCP, chemin `/mcp` |
| `MCP_API_RESOURCE` | Audience URI API, distincte de celle du MCP |
| `MCP_API_BASE_URL` | Origine privée du backend, sans chemin/query/identifiants |
| `MCP_CLIENT_ID` | Client confidentiel préenregistré et autorisé à échanger vers API |
| `MCP_CLIENT_SECRET_FILE` | Chemin du secret client monté à l’exécution |
| `MCP_OWNER_SUBJECT_FILE` | Chemin du sujet propriétaire autorisé pour cet issuer |
| `MCP_HOST`, `MCP_PORT` | Écoute, défaut `0.0.0.0:3002` |
| `MCP_TIMEOUT_MS` | Délai borné par dépendance, défaut3000, maximum30000 |

HTTPS exigé pour issuer/JWKS/token endpoint/audiences hors loopback. JWKS et échange
doivent partager l’origine de l’issuer. HTTP est permis pour l’origine privée fixe du
backend : le déploiement doit la garder sur le réseau Docker privé, sans proxy libre.
Les requêtes sortantes refusent les redirections ; les arguments de l’outil ne
définissent aucune URL. `NODE_EXTRA_CA_CERTS` permet une CA locale montée lors de
l’assemblage HTTPS ; aucune désactivation TLS ou modification du magasin du PC.

Les clients publics sont préenregistrés dans l’autorité ; ce service ne fournit ni
inscription dynamique ni serveur OAuth. Keycloak doit émettre des JWT RS256 avec
audience exclusive, `sub`, `iat`, `exp` et scopes applicatifs. Le gate valide chaque
requête, exige le propriétaire issuer/sub et `calovibe:read` ; write seul ne suffit
pas. Le client aval de l’échange doit être `MCP_CLIENT_ID` (`azp`), même sujet,
audience API exclusive, scope exactement `calovibe:read` et `api_roles:["read"]`.
Cette vérification protège l’intersection consentement/opération/API du banc
Keycloak qualifié ; elle ne remplace pas les contrôles de l’API sur ses clients
légitimes. Le jeton entrant ne va qu’au point d’échange, jamais à l’API.

Un jeton absent/invalide reçoit401, un propriétaire/droit refusé403, avant tout appel
aval. Les challenges sont ceux du SDK avec `resource_metadata` et scope. La découverte
RFC9728 est disponible à `/.well-known/oauth-protected-resource/mcp` et à son alias
racine ; elle annonce seulement l’issuer de confiance. Les401/403 API restent des
refus HTTP ; échange refusé, panne ou réponse invalide donnent une erreur d’outil
explicite sans succès synthétique, retry automatique ou compte de repli. Les réponses
JSON sont limitées à64Ko et les appels bornés. Aucun cache de jeton aval.

L’Origin navigateur présent doit être l’origine publique MCP exacte ; les clients
HTTP natifs sans Origin sont admis. Aucun cookie n’authentifie ce service ; une
requête MCP avec Cookie est rejetée. Les paramètres query, notamment tokens, sont
refusés. Les journaux ne contiennent que démarrage/arrêt et erreurs génériques.

`/health/live` dit seulement que le processus vit. `/health/ready` vérifie les
métadonnées issuer/endpoints, la disponibilité JWKS et la santé interne du backend,
avec503 si une dépendance manque. Réserver ces routes au réseau interne au proxy.
SIGTERM/SIGINT arrête HTTP, transports et appels sortants ; délai maximal10s.

## Image indépendante

Le Dockerfile et son dockerignore propre n’utilisent aucune source/sortie web ou
backend. Seuls leurs manifestes de workspace sont nécessaires à l’installation
verrouillée. L’image finale installe les dépendances de production du workspace MCP,
exécute `USER node`, porte le SHA et ne contient ni sources/tests ni secrets.

```sh
docker build --file mcp/Dockerfile --build-arg APP_VERSION="$GIT_SHA" --tag "calovibe-mcp:$GIT_SHA" .
node mcp/tests/image-smoke.cjs "calovibe-mcp:$GIT_SHA" "$GIT_SHA"
```

Le smoke Linux crée un conteneur et des fichiers aléatoires réservés au test puis
les supprime ; aucune suppression globale. Il vérifie installation prod, SHA,
absence de sources/fixtures/SQL/secrets, live401, ready503 en absence de dépendances
et SIGTERM réel. Il ne remplace pas le nominal MCP→Keycloak→backend→PostgreSQL.

## Portée des preuves

`tests/service.test.cjs` exerce le vrai point d’entrée HTTP avec le client officiel,
des JWT réellement signés et des endpoints JWKS/échange/API doubles, strictement
dans les tests. Il vérifie les refus avant non-appel, la délégation et son absence
d’élévation, les erreurs et la fermeture pendant une dépendance bloquée.
`tests/config.test.cjs` couvre configuration/fichiers et démarrage fermé.
`tests/mcp-reference.test.cjs` préserve les31 contrats synthétiques historiques.

Ces essais Windows ne prouvent ni le fournisseur réel, ni le parcours HTTPS complet,
ni le backend/PostgreSQL assemblés. Le moteur Docker local indisponible n’a pas été
contourné ; construction/smoke image et intégration Keycloak réels restent à exécuter
en CI/assemblage L1 avant de déclarer le socle global livré.
