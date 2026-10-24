# Référence MCP HTTP — L0-MCP-REFERENCE

Cette suite exécute de vrais échanges HTTP entre le client officiel MCP 2.3.1, le serveur officiel 2.3.1 et une API de référence en mémoire. **Les identités, droits et réponses sont SYNTHÉTIQUES.** Elle ne livre aucun service de production, ne qualifie ni OAuth/Logto ni la délégation réelle vers l'API et ne réalise aucune opération alimentaire.

## Lancer

Sur Node 26.2.0, runtime actuel du cadre :

```text
npm ci --ignore-scripts
node --test tests/mcp-reference.test.cjs
npm test
npm run check
npm run test:browser
npm audit
```

Les trois paquets sont verrouillés en dépendances de développement : `@modelcontextprotocol/client` 2.3.1, `@modelcontextprotocol/server` 2.3.1 et `@modelcontextprotocol/node` 2.1.1. Les dépendances transitives sont dans le verrou unique. Aucun processus permanent, port fixe, Docker, base SQL, accès Internet au runtime des tests ou secret utilisateur n'est requis. `test` et `check` incluent la nouvelle suite et conservent les 165 tests préexistants. Le navigateur reste celui des prototypes.

## Ce que prouve la suite

- Les 31 outils du catalogue intégré sont résolus avec Swagger Parser, réseau de résolution désactivé, et exposés par le SDK. Les entrées et sorties gardent les schémas JSON partagés, Ajv2020 strict et les formats obligatoires du contrat, sans copie en Zod. `tools/list` est comparé au catalogue lié ; aucun `$ref` local ou champ de routage privé ne reste sur le wire.
- Le client épingle `2026-07-28` et le handler refuse le mode legacy. Le test observe la révision dans les headers et `_meta`, et vérifie le refus de l'ancien `initialize`. Le défaut client est historique : sa simple version npm ne suffirait pas à prouver la révision.
- Chacune des 31 fixtures intégrées passe par client → MCP HTTP → API HTTP sur deux adresses `127.0.0.1` à ports éphémères. Les assertions vérifient compteur d'appels, méthode, URL, query et corps reçus par l'API, puis le résultat. L'ajout de fixture conserve notamment `2026-10-22`, `dinner`, `150` et `g`. Aucune nutrition n'est calculée ; l'API renvoie le DTO préfabriqué du contrat.
- Les 25 fixtures d'arguments invalides, l'outil inconnu, les identités absente/invalide et les droits insuffisants ne provoquent aucun appel API. Les refus d'identité sont HTTP 401 ; read → write et write → read sont HTTP 403. Les annotations d'outils ne remplacent pas ces gates.
- Les huit catégories d'erreur métier API sont projetées en résultat structuré, `isError:true`, et texte JSON identique. Les refus API 401/403 restent des refus du transport MCP. Une réponse API hors schéma, un statut inattendu, une interruption réseau ou le délai API de 2 secondes donnent `DEPENDENCY_UNAVAILABLE`, sans recopier la réponse invalide.
- Le SDK client retire `resultType` lors de la normalisation de `callTool`. La suite contrôle donc `resultType:'complete'` sur les véritables réponses JSON HTTP avant normalisation, et contrôle séparément les résultats structurés rendus au client.
- Origin/Host étrangers, JSON malformé et corps dépassant la borne de 64 Kio sont refusés sans API. Le Host hostile est émis par `node:http`, car `fetch` impose le Host de destination. La fermeture explicite après réussite/erreur et après échec de connexion est vérifiée par un nouveau raccordement TCP qui doit échouer avec `ECONNREFUSED` sur les deux ports ; un simple délai expiré ne vaut pas fermeture.

## Choix d'implémentation et limites

Le serveur bas niveau `Server` reste public pour les cas avancés, bien que marqué déprécié au profit de `McpServer`. Deux handlers protocolaires réutilisent ici les schémas JSON existants ; ce choix évite 31 définitions Zod supplémentaires. Il reste limité au support de tests. Les conversions HTTP sont celles de l'adaptateur officiel `toNodeHandler`.

L'étude statique préparatoire attribuait à tort `resolveScopeChallenge` au serveur bas niveau : le code distribué réserve cette intégration automatique à `McpServer`. La référence utilise donc la gate officielle `requireBearerAuth` avant le dispatch SDK, avec les scopes issus du catalogue. Le corps est lu via un clone Request borné par l'adaptateur ; `parsedBody` est fourni au SDK pour éviter un deuxième décodage. Les requêtes protocolaires invalides gardent les erreurs du SDK. Un handler est créé et fermé par requête ; aucun SSE, abonnement ou session de protocole n'est revendiqué ici.

Les jetons MCP opaques de fixture et ceux de l'API sont différents. Le vérificateur synthétique associe seulement des chaînes connues à des scopes ; il ne prouve aucune signature, audience émise, authentification personnelle, rotation, découverte OAuth, PKCE ou intersection réelle des droits du consentement entrant avec les droits API. Ces preuves restent aux services/authentification L1. Les réponses de l'API sont contrôlées par le test, sans journal ni transaction : idempotence, concurrence, annulation réelle, persistance, médias photo et brouillons restent L2 et suivants.

Les bornes HTTP de 64 Kio et le délai API de 2 secondes sont ceux du banc de référence : aucun upload photo réel ou test de capacité de production. Le protocole est exercé avec réponses JSON ; SSE, streaming, OAuth et compatibilité de clients autres que le SDK testé ne sont pas qualifiés. Aucun accès ou modification d'Hermès. Aucun écran modifié ; non-applicabilité UI soumise au réviseur indépendant.

Sources étudiées : [SDK officiel v2](https://ts.sdk.modelcontextprotocol.io/v2/), [transport Streamable HTTP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), déclarations et sources des paquets npm exacts verrouillés ; [contrat API/MCP intégré](API-MCP.md), [ADR02](../adr/ADR-02-auth-mcp.md) et [fiche de tâche](../tasks/L0-MCP-REFERENCE.md). Cette preuve ne clôt pas à elle seule L0, ADR01/02 ou L1.
