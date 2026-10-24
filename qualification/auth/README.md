# Qualification locale d’une autorité candidate

Ce banc n’est ni une autorité de production ni une implémentation d’auth Calovibe. Il teste **Keycloak OSS 26.8.1** avec PostgreSQL 18.6, images linux/amd64 fixées par digest dans `compose.yml`. Logto1.45.0 est écarté ici par étude de ses sources, sans essai runtime : voir [fiche](../../docs/tasks/L0-AUTH-QUALIFICATION.md).

Depuis la racine du dépôt, sous Node24.22.1/npm11.13.0, moteur Docker Linux/Compose accessible et Chromium Playwright installé :

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run test:auth
npm run test:auth -- --failure-cleanup
```

Le second appel injecte un échec juste après démarrage/inspection des deux conteneurs et doit prouver le nettoyage ; il ne qualifie aucun flux OAuth. Les deux appels sont requis dans le job CI `auth`, séparé des contrôles existants. Toute incompatibilité fait échouer le premier. Ne jamais traiter un refus du flux nominal comme un résultat vert.

Le runner crée un projet aléatoire, un volume neuf et un realm officiel importé. Un utilisateur synthétique possède read+write par ses rôles API, mais le client public demande d’abord seulement read et affiche le consentement réel. Le service MCP est confidentiel pour l’échange, le client public reste public/avec consentement : aucun reclassement tiers→first-party. Aucun compte administrateur bootstrap, fournisseur externe, mail, SQL privé, donnée métier ou accès Hermès.

La seule feature expérimentale activée est `resource-indicators`. Les clients sont préenregistrés ; CIMD, token exchange legacy et délégation preview restent désactivés. Le service MCP et l’API ont chacun comme clientId leur URI loopback exacte et `resource_url` identique. Les jetons sont vérifiés avec jose/JWKS sans réécriture de `aud`. `audience` à l’échange désigne ainsi directement l’URI API ; ce n’est pas une prétendue prise en charge de `resource` RFC8693 à ce grant. La politique native `downscope-assertion-grant-enforcer` s’applique à tous les échanges du realm jetable. Le SDK officiel fournit découverte, PKCE et échange du code ; le POST RFC8693 suit l’interface Keycloak officielle.

Les assertions couvrent issuer/endpoints/S256, signature/expiration/audience exclusive/sub, consentement read puis write, rejeu de code/mauvais verifier, scopes demandés ou omis, scope write par défaut et ses mappers, marqueur par défaut non affiché dans scope, client/secret/audience invalides, sujet altéré et réellement expiré. L’API synthétique vérifie les JWT avant son compteur : lecture autorisée, write read-only→403, jetons absents/altérés/destinés à l’autre canal→401, refus sans effet, un write explicitement consenti→un seul effet. Aucun jeton synthétique signé par le runner.

L’API et les callbacks écoutent sur des ports OS éphémères en 127.0.0.1 ; PG n’a aucun port hôte. Le port d’autorité est choisi par l’OS puis relâché avant bind Docker : une collision reste possible et fait échouer le run sans adopter un autre issuer. Limites Compose : Keycloak2CPU/1536MiB, heap768MiB ; PG1CPU/512MiB ; limites de processus. Deadline du scénario5min, commandes Docker180s maximum, cleanup60s par commande. Les pulls consomment aussi ce budget. Le job CI garde son délai10min, celui du job existant reste inchangé.

Le seed est créé en mode0600 et supprimé dans `finally`. Keycloak utilise l’UID du runner Linux (1000 par défaut sur Windows), groupe0 de l’image, afin de lire ce seed sans l’ouvrir aux autres utilisateurs. Les chemins ignorés par run sont construits sous `artifacts/auth-qualification/`, jamais fournis depuis la ligne de commande. Le nettoyage `compose down --volumes` vise uniquement ce projet aléatoire, puis vérifie l’absence de conteneurs/volumes/réseau par son label exact. Pas de prune global. Browser/serveur sont également fermés, y compris sur erreur. Une interruption forcée du processus ou de Docker peut empêcher le `finally` : les labels du seul projet permettent un diagnostic ciblé, jamais une suppression globale.

Rapports expurgés : `artifacts/auth-qualification/report.json` et `report-failure-cleanup.json`. Les tests n’impriment ni mots de passe, ni secret client, ni token/code OAuth, ni commande contenant un secret. Le rapport contient versions effectives, IDs images, URI de fixtures, assertions réussies, phase échouée et verdict de nettoyage. Les erreurs détaillées du navigateur/OAuth/Docker sont volontairement retenues ; reproduire dans le même banc plutôt que publier des logs sensibles.

Une réussite prouverait seulement cette configuration/version et ces cas de qualification. Elle ne clôt ni ADR02, ni L0/L1 : authentification web/CSRF, services réels, consentement/révocation complet, récupération/sauvegardes, déploiement HTTPS, clients arbitraires et charge restent hors périmètre. La feature RFC8707 demeure expérimentale même si les essais passent.
