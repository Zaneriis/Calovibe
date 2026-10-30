# Backend — tranche L1-BACKEND

API Fastify 5.12.7 / TypeScript strict / PostgreSQL 18.6, Node 24.22.1 exact.
Cette première tranche livre un processus et son accès technique privé. Elle ne
livre pas de journal, endpoint alimentaire, session navigateur, OIDC Code/PKCE,
CSRF, logout, délégation MCP ou déploiement de production. Les contrats alimentaires
restent la source unique des futurs parcours ; aucune fixture n'est servie ici.

## Construire et vérifier

Depuis la racine, sous Node 24.22.1 et npm 11.13.0 :

```sh
npm ci --ignore-scripts
npm run build:backend
npm run types --workspace @calovibe/backend
npm test --workspace @calovibe/backend
npm run check
npm run test:e2e --workspace @calovibe/backend
```

`npm run build` dans `backend/` compile `src/` vers `dist/*.js` et conserve
`dist/api.openapi.json`, construit depuis `shared/contracts/`. Il ne construit ni
ne lit les sources web/MCP. Le build utilise les dépendances de l'installation
commune et le bundler de contrats partagé. `check` conserve les suites existantes,
ajoute la compilation et les unités backend, et applique ESLint aux sources TS.
Les types backend sont stricts, sans `any` général ou `skipLibCheck`.

Le test E2E exige Docker Linux, Docker Compose et OpenSSL (`openssl` sous Linux,
Git for Windows par défaut sous Windows ; variable `OPENSSL` pour un chemin explicite).
Il construit les images, démarre un projet Compose au nom aléatoire, crée uniquement
des identités/clés/mots de passe synthétiques et une CA locale au banc. La CA n'est
jamais installée globalement. Le backend valide réellement le TLS du JWKS.
PostgreSQL et JWKS n'ont aucun port hôte ; le seul port API est éphémère et lié à
127.0.0.1. Le volume et les fichiers temporaires de ce projet sont retirés en fin
de test, succès ou échec, sans prune global. `artifacts/backend-report.json`
conserve seulement SHA, image ID, assertions réussies et résultat de nettoyage.
Un arbre modifié est signalé `dirty:true` ; une preuve finale exige `dirty:false`.

## Exécution et configuration

`npm start --workspace @calovibe/backend` lance `dist/main.js` ; `npm run migrate
--workspace @calovibe/backend` exécute la commande ponctuelle de migrations.
Le runtime n'exécute aucun DDL. Il reste vivant si la base tombe, mais la
disponibilité et le statut privé passent à 503. Les erreurs publiques et journaux
ne contiennent ni credentials, sujet, JWT, requête ni détails PostgreSQL.

| Configuration runtime | Valeur requise |
|---|---|
| `APP_VERSION` | SHA Git complet, 40 caractères hexadécimaux ; fixé dans l'image |
| `DATABASE_CONFIG_FILE` | Chemin du fichier JSON secret monté, jamais une URL avec mot de passe dans l'environnement |
| `OIDC_ISSUER` | Issuer exact HTTPS Keycloak, sans réécriture entre clients/serveur |
| `OIDC_JWKS_URL` | Endpoint JWKS HTTPS de confiance configuré par l'opérateur, jamais par le demandeur |
| `API_AUDIENCE` | Ressource API HTTPS exacte et distincte de l'issuer/JWKS et de la ressource MCP configurée par l'intégration |
| `PORT`, `HOST` | Défauts internes `3000`, `0.0.0.0` ; le proxy/LAN détermine l'exposition |

Le fichier PostgreSQL contient exclusivement `host`, `port` entier, `database`,
`user`, `password`. Le runtime utilise le rôle `calovibe_runtime` sans
superutilisateur, création de base/rôle ou DDL. Il a seulement CONNECT, USAGE du
schéma et SELECT des deux tables techniques livrées. Aucun compte web/MCP ne doit
recevoir ce fichier ou l'accès au réseau des données.

La migration utilise **d'autres fichiers** : `MIGRATION_DATABASE_FILE` pour le
rôle `calovibe_migrator`, propriétaire de la base dédiée sans superutilisateur,
et `OWNER_CONFIG_FILE` pour `{ "issuer": "<issuer HTTPS exact>", "subject":
"<sub propriétaire>" }`. Ces rôles sont provisionnés au déploiement ; le Compose
de test les crée dans sa propre base jetable uniquement. Ne pas réutiliser son
bootstrap pour modifier une base personnelle existante.

Les migrations SQL sont triées et versionnées, appliquées dans une transaction
avec verrou PostgreSQL `pg_advisory_xact_lock`. La table `schema_migrations`
enregistre noms/empreintes SHA256. Une empreinte divergente ou un historique
incompatible bloque la migration ; aucune réparation silencieuse. L'association
propriétaire existante est conservée ; un autre issuer/sub fait échouer la
transaction entière. Un ajout de migration concurrent ne peut pas s'appliquer
deux fois. L'image identique exécute runtime ou migration selon sa commande.

## Routes et accès

| Route | Comportement |
|---|---|
| `GET /health/live` | 200 `{status:"alive"}`, vie du processus uniquement |
| `GET /health/ready` | Interne, 200 si PostgreSQL répond et si noms/empreintes des migrations correspondent à l'image ; 503 sinon |
| `GET /api/_technical/status` | Bearer API valide : 200 `{schemaVersion:"0.1.0",status:"ready",version:"<SHA>"}` ; 401 jeton absent/invalide ; 403 propriétaire/scope refusé ; 503 dépendance indisponible |

Le proxy d'intégration doit garder `/health/ready` interne et terminer HTTPS ;
ce backend n'est pas directement exposé en production par cette tranche.
`jose` vérifie RS256/JWKS, signature, issuer, audience API **exclusive**, `sub`,
`exp`, `iat` et `nbf` si présent. Une audience multiple incluant API et MCP est
refusée. Le sujet doit correspondre au propriétaire stocké et le scope contenir
`calovibe:read`. Les jetons légitimes API issus des clients web/MCP restent
acceptés ; aucun client `azp` unique ajouté. Bearer mélangé à un cookie, plusieurs
headers Authorization, token en URL et authentification Basic ne sont pas admis.
La session web sera ajoutée dans sa tâche dédiée, sans interprétation de cookie
non validé ici. Le résultat privé et les erreurs utilisent `Cache-Control: no-store`.

## Image

Exemple shell depuis la racine, sur un commit propre :

```sh
SHA=$(git rev-parse HEAD)
docker build -f backend/Dockerfile --target runtime --build-arg GIT_SHA="$SHA" -t "calovibe-backend:$SHA" .
```

L'image officielle Node 24.22.1 bookworm-slim est fixée par digest dans le Dockerfile,
avec dépendances runtime installées par verrou. Le contexte est limité par
`Dockerfile.dockerignore` aux manifestes, sources backend et contrats/build partagés ;
il exclut secrets, données, artifacts, maquettes et autres services. L'image finale
contient le runtime compilé, les migrations et le contrat ; pas de clé de test ni
de dépendances de développement. UID/GID 1000, label OCI revision et APP_VERSION
portent le SHA réel. La commande de migration est `node dist/migrate.js` avec ses
montages propres ; la commande runtime `node dist/main.js` reçoit seulement son
fichier de base. SIGTERM ferme Fastify et le pool, avec échéance de 5 secondes.
Le Compose de test ajoute système de fichiers en lecture seule, capabilities
retirées et `no-new-privileges` ; il n'est pas un déploiement de production complet.

Les tests démontrent la validation API contre un JWKS HTTPS synthétique, pas
l'autorité Keycloak réelle, sa révocation, la session web ou AUTH01–10. Ces
intégrations suivent dans les tâches L1 suivantes. Aucun accès à Hermès.

Références : [contrat technique L1](../docs/contracts/L1-SERVICES.md),
[ADR01](../docs/adr/ADR-01-architecture.md), [ADR02](../docs/adr/ADR-02-auth-mcp.md).
