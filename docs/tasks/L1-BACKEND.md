# L1-BACKEND — premier service applicatif réel et PostgreSQL

Mandat : première tranche technique L1, après convergence L0 et sa CI post-intégration.
Branche codex/l1-backend depuis develop f5caa31965c02f268ca3e925ee6cf3fe11cd8378 ;
worktree isolé artifacts/sdk-security réutilisé. Auteur développeur dédié ; seul le
coordinateur intègre. Cette tâche ne clôt pas L1 et ne livre pas encore le journal.

Propriété exclusive : backend/ (sources TypeScript, configuration/build, Dockerfile,
SQL et tests), package.json/package-lock.json racine, scripts/check.cjs et tests
transversaux strictement nécessaires à ce nouveau build, job CI backend et Compose
de test dédié. Pas de modification web/MCP/maquettes, qualification auth, JSON des
contrats, règles de validation ni décisions humaines. Documentation dans backend/.

Critères avant code, source normative docs/contracts/L1-SERVICES.md :

1. Remplacer le build de contrat seul par un vrai build TypeScript strict du backend
   Fastify5.12.7/pg8.23.1, avec dépendances runtime propres au workspace. Conserver
   l’artefact OpenAPI et les contrôles/contrats existants. Aucun script vide ou fake.
2. Vrai processus : GET /health/live minimal, GET /health/ready interne dépendant
   de PostgreSQL et de la version attendue des migrations ;503 si indisponible.
   GET /api/_technical/status réellement privé sous Bearer API : propriétaire
   issuer/sub autorisé et scope calovibe:read, audience API exclusive ;200 au format
   L1,401 token absent/invalide/expiré/audience/issuer/signature,403 droit/identité
   refusés. Rejeter Cookie+Bearer ambigu. Aucun outil ou endpoint alimentaire simulé.
3. Validation JWT par jose/JWKS officiel, endpoints/issuer de confiance configurés,
   pas de validateur crypto maison ni secret/PII dans logs/réponses. Données de test
   et clés de fixture synthétiques seulement. Une fixture JWKS de tests ne devient
   pas une autorité de production ; la validation complète Keycloak/web reste aux
   tâches d’auth applicative suivantes, sans prétendre clore AUTH01–10.
4. PostgreSQL18.6 réel : migrations SQL versionnées transactionnelles/verrouillées,
   données techniques nécessaires (version/association propriétaire), aucun journal
   anticipé, rôle runtime sans DDL/superutilisateur. Migration ponctuelle avec la même
   image backend, secrets séparés montés en fichiers. Aucun runtime DDL.
5. Image Node24.22.1 officielle fixée par digest, backend buildable seul avec sources
   backend et contrats communs ; ne pas construire web/MCP. Processus non privilégié,
   SHA/version d’image explicites, secrets absents de l’image/contextes/assets/logs,
   SIGTERM ferme HTTP/pool. PostgreSQL sans port hôte, ports test loopback seulement.
6. E2E API HTTP réelle + vraie base Docker : statut authentifié nominal, tous refus
   avant effet, base arrêtée503, migrations concurrentes sans double application,
   rôle runtime refusé en DDL, redémarrage conservant les données techniques et arrêt
   propre. Tests unitaires adaptés aux erreurs/configuration. Exécuter toutes les
   suites existantes et garder tous les jobs ; ajouter job backend Docker requis.
7. Adapter le test d’isolation des builds à la présence des sources backend réelles,
   sans le réduire : autres services absents, artefacts attendus et source manquante
   toujours vérifiés. Ne pas toucher les assertions d’isolation web/MCP.

Livraison : code, tests, README commandes build/run/migrate/check et limites ; npmci,
npmls/audit, check complet, builds/browser et E2E backend Docker réellement exécutés,
CI sur SHA exact et trois revues indépendantes avant FF coordinateur. Pour les images,
faire tester le vrai commit tête de PR et lui associer le SHA, pas un merge virtuel.
Pas de TLS/session web/OIDC/MCP applicatif déclaré livré par cette seule tâche ; ces
capacités suivent immédiatement sur ce backend réel. Demander au vérificateur toute
ambiguïté fonctionnelle/design avant une question humaine contextualisée.

## Implémentation et premiers résultats

Sources Fastify TypeScript réelles, validation jose/JWKS RS256, migrations SQL
transactionnelles/verrouillées et deux rôles distincts implémentés. Aucune allowlist
de client `azp` ajoutée : les jetons API légitimes web/MCP restent admis selon issuer,
audience exclusive, propriétaire et scope. Le build compile le runtime et conserve
OpenAPI ; l'isolation vérifie aussi qu'une source TypeScript absente échoue.
Le Dockerfile ne copie ni web/MCP ni secrets et fixe l'image officielle Node par
digest, avec UID1000 et SHA explicite. Le job CI backend construit/teste la vraie
tête de PR. Les jobs existants et leurs contrôles sont conservés.

Premières commandes réellement exécutées sous Node24.22.1/npm11.13.0 :
`npm run build:backend` réussi ; `node --test backend/tests/unit.test.cjs` 3/3 ;
`eslint . --max-warnings 0` réussi, sources TS incluses. Les dépendances runtime
Fastify5.12.7/pg8.23.1/jose6.2.13 et dev @types/pg8.23.1/typescript-eslint8.72.0
ont été installées exactement ; audit d'installation0. Modèle demandé Sol/high,
sans attestation supplémentaire du modèle effectif par un outil de session.

Le premier E2E Docker local n'a pas pu qualifier le produit : le moteur qui répondait
initialement28.1.1 retourne ensuite500 sur son API `/v1.49/version` et sur les
opérations Compose. Le nettoyage n'est pas vérifiable tant que ce moteur est
indisponible. Aucun arrêt global WSL, prune ou réparation administrative répété.
Le contrôle complet local et le vrai banc Docker en CI restent à terminer ; ne
pas considérer cette fiche comme leur réussite. La PR et ses preuves sur SHA exact
conserveront les résultats postérieurs sans nouveau commit documentaire de revue.

Le fichier `backend/README.md` décrit commandes, rôles, routes et limites.
Le banc JWKS HTTPS reste synthétique ; Keycloak réel, sessions, OAuth navigateur,
MCP applicatif et journal ne sont pas livrés dans cette tranche.
