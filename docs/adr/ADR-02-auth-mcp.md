# ADR-02 — Accès personnel web/API et autorisation MCP HTTP

Date initiale :23 octobre2026. **Décision technique de développement : Keycloak local26.8.1, arrêtée le30 octobre2026 ; convergence soumise aux revues/CI exactes. Authentification applicative L1 non livrée.** [Fiche historique](../tasks/L0-ADR02.md).

## Décision de développement du30 octobre2026

Le coordinateur retient Keycloak OSS26.8.1 local, clients web/MCP/API distincts et
préenregistrés, inscription publique désactivée, propriétaire autorisé par issuer/sub.
Pas d’autorité distante ni de dépense nouvelle. L’administration reste privée/LAN.
L’échange natif conserve sujet et intersection des droits, sans token passthrough
ou repli sur compte plus puissant. La session web et ses défenses restent celles
définies ci-dessous et dans [L1-SERVICES](../contracts/L1-SERVICES.md).

Preuve de qualification : banc9e12d91c2ee0b2554641b5062008a259115c84c9, CI40552241506
et40552251772 vertes, trois avis indépendants renouvelés le30 octobre sur ce SHA
(fonctionnel et tests favorables, UI N/A motivée). Consentements read/write visibles
et acceptés obligatoires ; les deux injections réelles sans consentement attendu
échouent avec codes précis, zéro écriture et nettoyage. L’ancien faux positif2720c766
ne vaut plus preuve ; la [fiche](../tasks/L0-AUTH-QUALIFICATION.md) conserve l’historique.
La convergence avec SDK2.4.0 et la structure actuelle doit repasser le banc en CI
et les revues sur son nouveau SHA avant intégration. Ces preuves ne livrent aucun
service applicatif, session web, CSRF, sauvegarde ou exploitation de production.

Logto OSS1.45.0 est écarté pour le flux visé sur analyse de ses sources exactes,
sans prétendre un essai runtime ni une vulnérabilité. Justification et liens immuables
dans la fiche de qualification. L’étude initiale ci-dessous reste historique et ne
constitue plus une recommandation de qualifier Logto en priorité.

Limites acceptées pour le développement : resource-indicators expérimental,
clients préenregistrés pour éviter CIMD ; audience API distincte et URI explicites.
L’échange utilise le paramètre natif audience, pas un support RFC8693 resource
inventé. L’exception native de rééchange du propre jeton d’un client ne permet jamais
au gate MCP d’accepter un jeton API ; le vrai client public hors audience reste
refusé. Aucun contournement par reclassement du client tiers.

La livraison L1 reste soumise à AUTH01–10 selon leurs lots : HTTPS, propriétaire,
sessions/CSRF, expiration/logout, rotation/révocation et réel MCP→API. Le domaine,
les secrets et l’accès serveur de production restent [ADR03](ADR-03-deployment.md).

## Étude historique du23 octobre — contexte et recommandation initiale

Le cahier des charges exige un accès Internet personnel en HTTPS, une API commune et un adaptateur MCP qui appelle cette API. Hermès est externe : ne consulter ni modifier sa configuration. L'identité vient d'une autorité approuvée ; un nom d'utilisateur dans les arguments d'un outil n'est jamais une preuve d'identité.

Recommander **la qualification locale de Logto OSS 1.45.0 en priorité**, avec Keycloak 26.8.1 comme alternative. Aucun des deux ne peut être retenu pour la production sans essai réel. Prévoir un seul compte utilisateur autorisé, inscription publique désactivée, clients web/MCP/API séparés et console administrative limitée au LAN. Pour Keycloak, la [page de téléchargement](https://www.keycloak.org/downloads) affiche 26.8.1 ; sa [licence Apache-2.0](https://raw.githubusercontent.com/keycloak/keycloak/26.8.1/LICENSE.txt) n'impose pas de redevance. Cela n'établit pas un coût total nul : mémoire, disque, sauvegardes et maintenance consomment le serveur existant. Aucun achat ni abonnement n'est proposé.

Pour Keycloak, cette alternative est **conditionnelle aux essais**, pas une déclaration de support complet : le [guide MCP de Keycloak](https://www.keycloak.org/securing-apps/mcp-authz-server) classe encore MCP `2026-07-28` comme expérimental. `resource-indicators` est expérimental ; CIMD l'est aussi. Préenregistrer le client de référence évite CIMD pour la qualification initiale, mais ne supprime pas le risque RFC 8707. Ne pas contourner celui-ci en acceptant une audience absente ou commune à l'API et au MCP. Un résultat incompatible bloque cette option et impose de réexaminer l'autorité, sans affaiblir le contrat.

| Option | Bénéfice | Charge / limite | Avis |
|---|---|---|---|
| Logto OSS 1.45.0 dédié sur Ubuntu | Produit Node/PostgreSQL, parcours utilisateur existant, documentation MCP v2 et délégation aval | Qualification des fonctionnalités dans la distribution OSS exacte et des restrictions de scopes encore nécessaire ; limites commerciales à vérifier | Candidat prioritaire de qualification, pas autorité validée |
| Keycloak 26.8.1 dédié sur Ubuntu | Login, gestion du compte, récupération et échange de jetons dans une autorité existante | Conteneur, base/rôle SQL dédiés, mises à jour et sauvegarde ; support MCP expérimental à qualifier | Alternative technique sous réserve des essais |
| `oidc-provider` 9.13.0 intégré au processus Node retenu si ADR-01 le confirme | Pas de service d'identité supplémentaire ; bibliothèque MIT, découverte, PKCE, RFC 8707 | Écrans de login/consentement, compte, récupération, adaptateur de persistance et délégation API restent à assembler ; ce n'est pas un produit d'identité prêt à exploiter | Alternative techniquement possible, pas le défaut pour réduire le seul nombre de conteneurs |
| Autorité OAuth/OIDC déjà exploitée par le propriétaire | Peut éviter un service local supplémentaire | Aucune autorité fournie ; vérifier RFC 8707, délégation vers API, clients publics et coût ; une offre distante implique un choix explicite de fournisseur et de données d'identité transmises | À comparer uniquement si une autorité réelle est identifiée |

La [documentation de `oidc-provider`](https://github.com/panva/node-oidc-provider) décrit ses capacités et ses fonctionnalités à activer ; [sa version publiée](https://raw.githubusercontent.com/panva/node-oidc-provider/v9.13.0/package.json) est confirmée par npm. La liste des capacités consultée ne suffit pas à prouver une délégation RFC 8693 prête à configurer : ne pas inventer ce support.

La [release officielle Logto 1.45.0](https://github.com/logto-io/logto/releases/tag/v1.45.0), publiée le 13 octobre 2026, et sa [licence MPL-2.0 versionnée](https://raw.githubusercontent.com/logto-io/logto/v1.45.0/LICENSE) rendent cette alternative concrète. Son [guide MCP](https://docs.logto.io/use-cases/ai/mcp-server-enable-third-party-ai-agent-access) décrit SDK v2, préenregistrement, PKCE et ressources avec audience ; son [guide de délégation](https://docs.logto.io/developers/service-to-service-delegation) décrit échange de l'access token utilisateur pour un jeton d'API aval conservant `sub` et indiquant `client_id`. L'arbre Git du tag contient le grant `packages/core/src/oidc/grants/token-exchange` et des tests d'échange d'access tokens ; ils n'ont pas été exécutés ici. Cette documentation non figée ne prouve pas toutes les fonctionnalités dans cette version OSS. L'[inventaire OSS](https://docs.logto.io/introduction/set-up-logto-oss) et la release signalent des fonctionnalités réservées à Cloud/Pro, notamment administration collaborative, personnalisation et MFA imposée à la console. Ne pas souscrire Pro ; bloquer une fonctionnalité requise absente plutôt que l'acheter ou la supposer disponible. Garder la console sur le LAN. Le guide MCP signale aussi une particularité de slash final d'URI côté SDK : tester l'identifiant exact au lieu de normaliser silencieusement l'audience.

Pour Logto, proposer un conteneur, une base/rôle PostgreSQL isolés et une enveloppe d'essai initiale de 1 vCPU / 1 Gio RAM, à mesurer : aucune consommation ni capacité Ubuntu n'est vérifiée. Les [instructions de déploiement OSS](https://docs.logto.io/logto-oss/deployment-and-configuration) séparent endpoint utilisateur et console ; seule la première doit être publique. Ces valeurs sont une proposition technique, pas un minimum éditeur ni un résultat de charge.

Pour l'essai Keycloak : proposer un conteneur unique, limite initiale **2 Gio de RAM et 1 vCPU**, sans cluster, et une base/rôle isolés dans le PostgreSQL prévu. C'est une enveloppe de qualification à mesurer, pas un dimensionnement Ubuntu validé. Le [guide officiel de dimensionnement](https://www.keycloak.org/high-availability/multi-cluster/concepts-memory-and-cpu-sizing) donne notamment 1 250 MB de base dans son contexte HA/cache et demande des mesures ; ces chiffres ne sont pas un minimum garanti pour un compte personnel. ADR-03 doit confirmer la capacité réelle avant production. Pas de port d'administration supplémentaire exposé sur Internet.

## Choix technique et autonomie

La qualification locale de Logto OSS, puis de Keycloak si nécessaire, est autorisée par le mandat technique autonome, sans dépense ni nouvelle exposition administrative. Après preuves et revues, le coordinateur peut retenir la solution technique dans ce cadre ; aucune validation humaine de l'autorité locale n'est inventée ni exigée comme préalable routinier. Le caractère ouvert du choix dans DECISIONS-L0 exige une proposition et sa vérification, pas un veto humain ajouté par cet ADR.

Savoir si le propriétaire exploite déjà une autorité peut éviter un service supplémentaire : cette information est utile mais ne bloque pas la qualification locale. En revanche, choisir un fournisseur distant et lui transmettre des données d'identité, engager une dépense ou rendre une console administrative publique exige une décision humaine explicite. Aucun consentement à ces changements ne se déduit de cet ADR.

Les détails techniques suivants peuvent être préparés et testés sous mandat : versions, configuration de clients de test, audiences, scopes, sessions, tests automatisés et conteneurs locaux isolés. Aucun accès à Hermès n'est nécessaire. Les opérations destructives restent traitées séparément. Les domaines réels, secrets et moyens de récupération seront configurés lors du raccordement ; les URL `example.test` ci-dessous sont des illustrations.

## Web et API : session proposée

Servir web et API sous la même origine publique HTTPS via le proxy. Le navigateur utilise une session serveur opaque, stockée dans PostgreSQL avec expiration ; cookie `__Host-calovibe-session`, `Secure`, `HttpOnly`, `Path=/`, sans `Domain`, `SameSite=Lax`. Aucun jeton OAuth dans localStorage ou dans une URL. L'API associe le couple immuable `issuer`/`sub` au propriétaire autorisé ; un compte valide non autorisé reçoit un refus. Une adresse email modifiable n'est pas la clé d'autorisation.

Le backend initie OIDC Authorization Code + PKCE S256 et vérifie `state`, `nonce`, issuer, signature, audience et durée de l'ID token avant de créer la session. Rotation de l'identifiant à la connexion, invalidation serveur à la déconnexion, durées proposées 30 minutes d'inactivité / 12 heures absolues ; une nouvelle authentification est exigée ensuite. Le jeton d'identité sert à la connexion, jamais comme Bearer API. Les [pratiques OAuth RFC 9700](https://www.rfc-editor.org/rfc/rfc9700) fondent le flux ; le contrôle de session suit les [recommandations OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Pour chaque mutation avec cookie, vérifier un jeton CSRF lié à la session dans un en-tête dédié et l'origine exacte ; refuser un jeton manquant/invalide. Même règle pour la déconnexion, sans mutation par GET. `SameSite` apporte une défense complémentaire, pas le seul contrôle. Refuser les origines étrangères par défaut ; CORS n'est pas une autorisation. Utiliser la protection CSRF du framework choisi, selon [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

Une expiration ne confirme ni ne rejoue automatiquement une mutation. Après reconnexion, reprendre le brouillon selon le contrat de parcours, avec date/repas d'origine et nouvelle vérification de version. Une session est distincte du brouillon métier. Les règles d'idempotence de l'API restent nécessaires lorsqu'une réponse d'écriture est perdue. L'API n'accepte pas indifféremment deux identités : endpoints et middleware choisissent explicitement session web ou Bearer API ; une requête ambiguë est rejetée.

## MCP : contrat d'autorisation HTTP proposé

Le 23 octobre 2026, la [spécification officielle `latest`](https://modelcontextprotocol.io/specification/latest/basic/authorization) redirige effectivement vers `2026-07-28`. Cette version n'est donc pas déduite du registre local. Utiliser **Streamable HTTP** sur `/mcp`, avec réponses JSON ou SSE selon le besoin, et les règles de [transport de cette révision](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http). Pas de faux protocole Bearer propriétaire. Une révision antérieure n'est acceptée que si un test explicite la qualifie ; ne pas prétendre que le comportement historique `initialize` prouve le protocole actuel.

Proposition de séquence, à implémenter et tester :

1. Sans jeton, `/mcp` répond `401` avec `WWW-Authenticate: Bearer resource_metadata="https://example.test/.well-known/oauth-protected-resource/mcp", scope="calovibe:read"`. Le document contient `resource: https://example.test/mcp`, une autorité approuvée dans `authorization_servers`, et `scopes_supported: [calovibe:read]`. Le `scope` du challenge précise les droits de l'opération ; il ne donne aucun droit à lui seul.
2. Publier aussi la découverte well-known RFC 9728. Le client suit la découverte de l'autorité RFC 8414 ou OIDC et vérifie l'issuer exact ; une URL fournie par un paramètre d'outil ne change jamais l'autorité approuvée. Voir [découverte MCP](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/authorization-server-discovery).
3. Préenregistrer le client Inspector de test comme client public, sans secret, redirect URI loopback exacte. La [spécification d'enregistrement](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration) permet le préenregistrement ; CIMD est recommandé pour les clients sans relation préalable, DCR demeure un repli optionnel et déprécié. Ne pas ouvrir une inscription dynamique anonyme par commodité. CIMD, s'il est ajouté, doit limiter les URL et requêtes sortantes contre SSRF et faire l'objet d'essais dédiés.
4. Authorization Code avec PKCE S256 et `state` unique ; vérifier le support PKCE dans les métadonnées, sinon arrêter. Lier issuer attendu, verifier et état à la même tentative ; contrôler `iss` de la réponse selon la capacité annoncée. Codes à usage unique, redirect URI exacte et HTTPS hors loopback. Les [règles de sécurité MCP](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations) détaillent ces protections.
5. Inclure `resource=https://example.test/mcp` dans les demandes d'autorisation et de jeton. Le serveur vérifie l'access token à chaque requête HTTP : issuer approuvé, signature/clé et algorithme autorisés, validité temporelle, audience MCP exacte, sujet propriétaire, scopes. L'identifiant de session de transport éventuel n'authentifie personne. Aucun jeton en query string, journal ou résultat d'outil. La portée d'une ressource et celle d'un droit sont distinctes ([RFC 8707](https://www.rfc-editor.org/rfc/rfc8707.html)).

Scopes applicatifs proposés, à faire converger avec les contrats L0 : `calovibe:read` pour consulter ; `calovibe:write` pour les mutations, sans implication automatique de lecture. Demander la lecture initialement et l'écriture seulement lorsque nécessaire ; consentement lisible indiquant client et capacités, jamais un scope d'administration. Pour un appel nécessitant plusieurs droits, les vérifier tous. La politique de droits est la même sur le web, l'API et les outils ; la présence d'un outil dans une liste n'autorise pas son appel.

Jeton absent/invalide/expiré/révoqué ou mauvaise audience : `401`. Droits insuffisants : `403` avec challenge `insufficient_scope` et scopes nécessaires. Ne retourner aucune donnée privée et n'exécuter aucune mutation avant ces contrôles. Reconnexion ou élévation de scopes bornée ; un refus de consentement reste un refus sans écriture. Les [réponses d'autorisation MCP](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) s'appliquent au transport, pas une réussite HTTP contenant une erreur métier déguisée. Pour refresh tokens éventuels : stockage client sûr et rotation ; ne pas exiger `offline_access` comme scope de la ressource.

## Appel MCP → API sans passthrough

Proposition de ressources distinctes : `https://example.test/mcp` et `https://example.test/api`. Le MCP valide d'abord le jeton entrant destiné au MCP. Il agit ensuite comme client confidentiel auprès de l'autorité pour obtenir **un autre access token destiné à l'API**, via échange RFC 8693. Le jeton entrant n'est présenté qu'au point d'échange de confiance, jamais à l'API métier. [RFC 8693](https://www.rfc-editor.org/rfc/rfc8693.html) définit cette obtention d'un jeton approprié au service aval ; la seule existence de ce RFC ne prouve pas la configuration de l'autorité.

Pour Logto, qualifier le grant décrit par son guide de délégation avec client serveur autorisé à échanger ; la documentation RBAC ne garantit pas à elle seule l'intersection avec les scopes du consentement entrant. Le test de non-élévation ci-dessous reste bloquant. En alternative, Keycloak documente un [échange standard V2 entre clients d'un même realm](https://www.keycloak.org/securing-apps/token-exchange), avec client demandeur confidentiel. Qualifier ce mécanisme si Keycloak est essayé, pas l'ancien échange V1 déprécié ni une impersonation administrative. Configurer l'autorisation d'échange au seul adaptateur MCP vers l'API. **Condition d'acceptation** : le jeton aval conserve le sujet propriétaire, identifie le client appelant selon le profil de l'autorité et ne reçoit que l'intersection droits entrants / droits de l'opération / droits permis pour l'API. L'échange ne doit jamais augmenter les droits ; cette propriété nécessite une assertion de test, même si l'autorité permet des mappers ou scopes par défaut plus larges.

L'API valide son audience propre, issuer, sujet, client et scopes à nouveau ; elle refuse le jeton MCP d'origine. Ne pas remplacer le sujet par un champ `userId`, un en-tête libre ou un compte technique omnipotent. Les paramètres métier, identifiants d'opération et versions passent à l'API qui garde toutes les règles de données. Le MCP n'accède pas à PostgreSQL. L'échec d'échange n'a aucun effet métier et ne déclenche pas un repli vers un jeton de service plus puissant. Les clés et secrets sont injectés à l'exécution, expurgés des traces.

## SDK, client de référence et vérification restante

Le [README officiel du SDK TypeScript](https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md) annonce v2 stable pour MCP `2026-07-28`. Le 23 octobre 2026, `npm view` retourne `@modelcontextprotocol/client` **2.3.1** et `@modelcontextprotocol/server` **2.3.1**, Node `>=20`. L'ancien paquet `@modelcontextprotocol/sdk` **1.32.1** appartient à v1 ; ne pas le choisir silencieusement pour v2. Ce constat doit converger avec ADR-01, sans ajout de dépendance dans cette étude.

Client proposé : **MCP Inspector 2.12.0**, Node `>=22.19.0`, confirmé par npm et son [package officiel versionné](https://raw.githubusercontent.com/modelcontextprotocol/inspector/2.12.0/package.json). Node local observé : 26.2.0. La [documentation d'autorisation Inspector](https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector/authorization) décrit client préenregistré et callback CLI `http://127.0.0.1:6276/oauth/callback`. Utiliser une instance et des comptes de test isolés ; ne pas réutiliser des jetons personnels stockés. Désactiver la persistance des jetons pour l'essai interactif, expurger les traces, ne pas exposer l'interface Inspector sur Internet.

La commande de préparation réellement exécutée avec succès (code 0), `npm exec --yes --package=@modelcontextprotocol/inspector@2.12.0 -- inspector --cli --help` a affiché l'aide CLI ; elle vérifie seulement son démarrage. Aucun faux serveur OAuth Node n'est livré dans cette étude : il pourrait tester le client et le transport dans une tâche dédiée, mais ne qualifierait ni Logto ni Keycloak. Pour l'implémentation, verrouiller aussi les dépendances transitives du client de test ; une commande npm à version racine seule n'établit pas une chaîne d'essai reproductible complète. Ensuite lancer contre la vraie URL de test : `inspector --cli https://example.test/mcp --transport http --client-id <client-public-de-test> --method tools/list`. Cette dernière commande est un exemple à adapter, **pas un test exécuté**.

Les échéances suivent le backlog : L0 qualifie le contrat et le client de référence sur des fixtures sans métier ; L1 vérifie les services et leur authentification réels ; L2 vérifie les données et parcours métier ; L8 vérifie la restauration complète en environnement isolé. Une fixture synthétique ne qualifie pas l'autorité retenue. La clôture de L0 ne dépend pas d'un journal L2 implémenté. Aucun scénario ci-dessous n'a été exécuté dans cette étude.

| ID | Lot exigible | Scénario à automatiser | Résultat requis |
|---|---|---|---|
| AUTH-REF | L0 | Contrat MCP et client de référence : lecture, écriture et refus sur fixture technique sans journal | Messages et résultats validables, refus observé sans effet dans la fixture ; nature synthétique et limites explicites |
| AUTH-01 | L1 | Connexion web, lecture d'une ressource privée technique, déconnexion, expiration | Session rotatée, lecture autorisée puis 401 ; aucune mutation implicite |
| AUTH-02 | L1 | Mutation technique cookie sans CSRF, origine étrangère, session fixée, compte inconnu | Refus et zéro effet ; aucune réponse privée exposée |
| AUTH-03 | L1 | Inspector sans jeton → découverte → PKCE → lecture sur services et autorité réels | Challenge/métadonnées et issuer cohérents ; accès seulement au propriétaire |
| AUTH-04 | L2 | Consentement lecture puis écriture explicite du journal, date passée et repas précis | Jeton aval distinct, seule cible modifiée ; API et web voient le résultat |
| AUTH-05 | L1 | Mutation technique avec jeton lecture, consentement refusé | 403/challenge adéquat ; aucun effet et aucun élargissement silencieux |
| AUTH-06 | L1 | Jeton API au MCP, jeton MCP à API, issuer/signature/audience expirés ou erronés | 401 aux deux frontières réelles, aucun contournement par transport/session |
| AUTH-07 | L1 | Échange indisponible/refusé ou tentative d'augmentation des scopes sur mutation technique | Refus explicite, aucun effet, aucun compte technique de repli |
| AUTH-08 | L1 | PKCE absent/incorrect, state/iss/redirect URI incorrects, réutilisation du code | Flux arrêté avant session/jeton utilisable |
| AUTH-09 | L2 | Expiration/reconnexion avec brouillon et date/repas d'origine ; nouvelle tentative après réponse d'écriture perdue ; conflit de version | Brouillon et contexte conservés sans écriture implicite ; une opération, pas de doublon ; conflit sans écrasement et annulation ciblée |
| AUTH-10 | L1 puis L8 | L1 : rotation de clés/refresh, révocation et redémarrage de l'autorité ; L8 : restauration complète dans un environnement isolé | L1 : refus conforme après invalidation et récupération documentée ; L8 : identité/configuration et données attendues récupérées sans exposition de données personnelles |

Les erreurs métier de l'API gardent leurs codes structurés distincts (validation, conflit, introuvable, données incomplètes, dépendance). Les tests de contrats MCP du lot L0 fixeront leur enveloppe typée. Les annotations MCP de lecture/écriture ne remplacent jamais l'autorisation.

**Preuves réelles de cette étude :** sources officielles consultées ; métadonnées npm ; `npm ci --ignore-scripts` réussi (3 paquets, audit 0 vulnérabilité signalée), `npm run check` réussi (29/29), `npm run test:browser` réussi (parcours prototypes 320–1024 px). Ces contrôles protègent le cadre existant : ils ne testent aucune authentification applicative.

**Limites :** aucune autorité, route privée, API métier ou serveur MCP Calovibe exécutable à ce stade ; aucune interopérabilité lecture/écriture/refus réellement exécutée. Aucun compte Hermès, fournisseur distant, accès Ubuntu, domaine, ressource Docker ou mesure mémoire qualifiés. Les scénarios AUTH-REF et AUTH-01 à AUTH-10 restent des conditions de livraison aux lots indiqués, pas des tests verts. Aucun écran modifié ; non-applicabilité UI à faire confirmer indépendamment. Revues fonctionnelle et qualité des preuves requises sur le commit exact ; aucun auto-avis d'approbation.

## Suivi daté du 24 octobre 2026 — sans modification des règles d'authentification

AUTH-REF est livré par [PR10](https://github.com/Zaneriis/Calovibe/pull/10), commit
`3b5b3134ef48a9df9669a6b3a3ab27325f0e0678` : vrais SDK officiels, 31 outils et
échanges HTTP client → MCP → API, avec identités/droits/réponses **synthétiques**.
Voir [MCP-REFERENCE](../contracts/MCP-REFERENCE.md) pour preuves et limites. Les résultats
historiques de l'étude ci-dessus restent datés ; cette livraison ne prouve pas OAuth,
Logto ou une autorité réelle. AUTH-01 et suivants restent aux lots L1/L2/L8 indiqués.
L0-TOOLCHAIN actualise le runtime de lancement et partage le seul assemblage de contrats ;
aucune règle de session, audience, délégation ou exposition administrative n'est changée.
ADR02 et L0 ne sont pas clos par ce suivi.
