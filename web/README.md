# Web Calovibe — L1-WEB

Front réel React19.3.1/TypeScript strict/Vite8.3.5. Serveur Fastify5.12.7,
actifs construits avec @fastify/static10.1.7 et proxy @fastify/http-proxy11.6.5.
Aucun journal alimentaire n’est annoncé avant L2.

Depuis la racine, Node24.22.1/npm11.13.0 :

```
npm ci --ignore-scripts
npm run lint --workspace @calovibe/web
npm run types --workspace @calovibe/web
npm run build:web
npm test --workspace @calovibe/web
npm run test:browser --workspace @calovibe/web
```

Le build ne lit aucun fichier backend/MCP/contrat et produit `web/dist/`.
Pour démarrer le vrai serveur, configurer `BACKEND_ORIGIN` vers l’origine interne
fixe du backend (sans chemin, identifiants ou query), puis `npm start --workspace
@calovibe/web`. `PORT` vaut4173, `HOST` vaut127.0.0.1 ; dans un conteneur,
utiliser HOST=0.0.0.0. Le service échoue au démarrage sans origine configurée.

Le navigateur appelle uniquement `/api/session`, `/api/_technical/status` et
POST `/auth/logout`. La connexion navigue vers `/auth/login`, le callback est
relayé vers `/auth/callback`. Le proxy refuse les autres chemins/méthodes API/auth.
Sa destination vient uniquement de la configuration serveur ; aucun proxy
administratif n’est fourni. `/health/live` vérifie le processus seulement.
Les erreurs réseau sont retournées comme502 générique ; les réponses403/401
sont conservées. Pas de rejeu automatique, même pour les lectures. Les requêtes
client ont un délai maximal10s. Le CSRF reste en mémoire React ; aucune identité,
jeton OIDC ou session n’est écrit dans le stockage navigateur. L’origine et la
protection CSRF sont contrôlées par le backend ; le proxy les transmet.

Le reverse proxy HTTPS, l’origine publique, Keycloak, PostgreSQL et l’image finale
sont coordonnés dans L1 : ce service seul ne les qualifie pas. Ne pas présenter un
HTTP loopback comme preuve TLS/cookie Secure. Le navigateur doit joindre le web
et son API par la même origine HTTPS en exploitation.

## Vérifications et portée

`tests/server.test.cjs` démarre le vrai serveur et un serveur HTTP de contrat
strictement réservé aux tests : actifs, santé minimale, proxy limité, transfert
cookie/CSRF/origin, refus, dépendance indisponible. `tests/browser.cjs` utilise
Chromium/Playwright sur les vrais actifs React et le vrai proxy :401/403, erreurs,
réessai, réponse invalide, logout CSRF/doubleclic, clavier, clair/sombre320/1024.
Les captures sont produites sous `web/checks/`. Aucune route de scénario de test
ni fixture n’est compilée dans les actifs ou appelée par le serveur de production.
Ce banc ne prouve pas l’intégration Keycloak/session backend complète.
Les contextes date/repas, brouillons et annulation métier ne sont pas applicables
à cet écran d’accès sans écriture alimentaire ; ils restent requis dès L2.

## Prototypes conservés

`npm run prototype` démarre explicitement la maquette
historique, via `mockups/helpers/preview.cjs` et `mockups/helpers/build.cjs`. Les fichiers sous `mockups/` à la racine
et `mockups/helpers/page.cjs` restent des prototypes. Tests dédiés : `node --test mockups/tests/navigation.test.cjs` et
`node mockups/tests/browser-check.cjs`. Aucun prototype n’est inclus par le build Vite.

