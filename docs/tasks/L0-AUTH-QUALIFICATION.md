# L0-AUTH-QUALIFICATION — Étude du banc local Logto OSS

Date : 24 octobre 2026. Statut : banc candidat Keycloak implémenté ; qualification réelle en attente de CI Linux. Aucune autorité de production retenue. Les sections historiques décrivent la phase préalable.

- But : préparer le plus petit banc Docker isolé Logto OSS 1.45.0 + PostgreSQL afin de vérifier réellement découverte, OAuth Code/PKCE, audiences distinctes MCP/API, échange RFC 8693 conservant le sujet et limitant les droits au consentement entrant.
- Isolation : worktree `C:\Users\Leo14\.codex\worktrees\l0-auth-mcp\Calovibe`, propre avant étude ; branche `codex/l0-auth-qualification` depuis `origin/develop` `3b5b3134ef48a9df9669a6b3a3ab27325f0e0678`. Ancienne PR10 poussée conservée. Modèle demandé Sol/high ; effectif non attesté par les outils.
- Références lues : CAHIER-DES-CHARGES, BACKLOG, ADR02 et mandat humain original joint. Ponytail full : deux services jetables et un runner de qualification, sans serveur OAuth fabriqué ni application métier.
- Propriété présente : cette fiche et artefacts ignorés seulement. Écritures interdites dans package/verrou/check/CI/runtime/loader/ADR01/ADR02/docs MCP/DECISIONS, attribués exclusivement à TOOLCHAIN. Aucun schéma alternatif.
- Propriété future à attribuer avant code : `qualification/auth/compose.yml`, `qualification/auth/qualify.cjs`, `qualification/auth/README.md` et cette fiche ; un seul runner pour seed HTTP et tests OAuth/Playwright si les interfaces officielles le permettent. Aucun fichier partagé à modifier sans transfert.
- Dépendance : retour du coordinateur sur ce périmètre avant tout service/implémentation ; outils Node/Playwright existants à réutiliser sans nouvelle dépendance. Pas de PR ou commit pendant cette étude.

## Critères et preuves prévues avant code

| ID | Nominal / erreur / limite | Preuve réelle attendue |
|---|---|---|
| AQ-01 | Distribution OSS 1.45.0 exacte et gratuite pour capacités requises ; docs Cloud séparées | Tag/commit et image officielle par digest, licence et code exacts ; aucune feature payante supposée |
| AQ-02 | Deux services jetables, ressources bornées, loopback et nettoyage ciblé | Projet/volumes uniques, PG sans port hôte, 127.0.0.1 uniquement, CPU/RAM bornés ; assertions de labels/ports et disparition du seul projet |
| AQ-03 | Compte et clients préenregistrés synthétiques, sans fournisseur ni secrets personnels | Seed par interfaces officielles documentées, compte/RBAC/client public PKCE et client serveur confidentiel ; aucun accès Hermès ni production |
| AQ-04 | Découverte issuer/endpoints/JWKS et PKCE S256 | Métadonnées conformes et vraie connexion navigateur ; signature vérifiée cryptographiquement, mauvais verifier/code rejoués refusés |
| AQ-05 | Ressources MCP et API différentes | Jetons émis avec aud propres ; échange vers API, même sub vérifié, jeton MCP refusé à API et réciproquement ; pas de passthrough |
| AQ-06 | Droits aval limités au grant entrant, pas seulement au rôle de l'utilisateur | Utilisateur RBAC read+write mais consentement MCP read seul ; demander write à l'échange doit refuser ou rester sans write. Assertions sur signature/aud/sub/scope du jeton émis et endpoint protégé sans effet |
| AQ-07 | Refus sans élévation et client non autorisé | Mauvaise audience/ressource, client d'échange non autorisé, scope non consenti, sujet expiré/invalide ; aucune écriture sur un compteur synthétique protégé |
| AQ-08 | Preuves distinctes, erreurs et cleanup | Commandes réellement exécutées, images/digests, verdicts des assertions, échecs expurgés ; pas de token/mot de passe dans logs/dépôt ; nettoyage même sur échec sans volume personnel |

Une simple lecture/décodage de JWT, une chaîne `scope` injectée dans une fixture ou un smoke de démarrage ne prouve pas AQ-04 à AQ-07. Les services réels Calovibe, transactions et UI restent hors de cette tâche. Une limite native de l'autorité doit être rapportée, pas masquée par un faux serveur OAuth ou une nouvelle variante de contrat.

## Résultat de l’étude : Logto ne satisfait pas le flux cible natif

**Conclusion statique, aucun essai OAuth exécuté.** Tag officiel Logto `v1.45.0`, commit `94c088f9e4f87ba93df1f72ed20edf16ce364f61`, licence MPL-2.0. La signature du tag est indiquée valide par GitHub. Le Dockerfile du tag retire `packages/cloud` de l’image ; cela ne qualifie pas les fonctions Cloud ni ne garantit que tout exemple de la documentation courante existe dans cette distribution.

Preuves primaires sur ce commit immuable :

- [account.ts, lignes 129–157](https://github.com/logto-io/logto/blob/94c088f9e4f87ba93df1f72ed20edf16ce364f61/packages/core/src/oidc/grants/token-exchange/account.ts#L129) : exclusion explicite des jetons sujets émis à un client tiers ; le commentaire de sécurité explique que l’échange n’hérite ni audience ni scopes du jeton entrant. Aux lignes 189–197, la validation ne transmet ensuite que `userId`.
- [index.ts, lignes 12–19](https://github.com/logto-io/logto/blob/94c088f9e4f87ba93df1f72ed20edf16ce364f61/packages/core/src/oidc/grants/token-exchange/index.ts#L12) : capacité réservée aux applications first-party, sans allowlist de scopes par client. Aux [lignes 140–224](https://github.com/logto-io/logto/blob/94c088f9e4f87ba93df1f72ed20edf16ce364f61/packages/core/src/oidc/grants/token-exchange/index.ts#L140), nouveau Grant, scopes demandés et droits RBAC de la ressource ; aucune intersection conservée avec les scopes du sujet entrant.

Ce code exclut le flux natif « client MCP tiers consentement read → échange API sous ce consentement » attendu par AQ-05/06. Il ne prouve pas une vulnérabilité de Logto : son modèle de confiance first-party est explicite. Reclassifier le client tiers en first-party ou fournir un sujet plus puissant contournerait précisément l’exigence étudiée. PAT, impersonation administrative, proxy émetteur de JWT ou contrôle simulé de chaînes ne sont pas des solutions proposées.

**Recommandation : rejeter statiquement Logto 1.45.0 pour ce flux, sous revue indépendante des lignes ci-dessus ; ne pas construire un gros banc connu incompatible.** Si une preuve HTTP négative est jugée utile après attribution : un seul scénario réel Code/PKCE d’un client tiers préenregistré et échange de son access token vers la seconde ressource doit reproduire le refus natif. Ce refus confirme une incompatibilité, jamais une qualification réussie. Toute observation contraire imposerait d’identifier version, image et configuration avant de réviser le diagnostic.

## Alternative bornée : Keycloak 26.8.1, à qualifier

Tag `26.8.1` → commit `24ed1dadf3f246a555adb6d3d4a99e9b3003fb3b`, Apache-2.0 ; logiciel OSS sans abonnement exigé pour un banc local. Coût de licence nul ne signifie pas ressources machine/hébergement gratuites. Aucun choix d’autorité n’est arrêté par cette fiche.

- La [documentation du tag, lignes 98–134](https://github.com/keycloak/keycloak/blob/24ed1dadf3f246a555adb6d3d4a99e9b3003fb3b/docs/guides/securing-apps/token-exchange.adoc#L98) expose Standard Token Exchange V2, activé par défaut côté serveur mais à autoriser sur un client demandeur confidentiel. `audience` cible un identifiant de client. Les [lignes 265–273](https://github.com/keycloak/keycloak/blob/24ed1dadf3f246a555adb6d3d4a99e9b3003fb3b/docs/guides/securing-apps/token-exchange.adoc#L265) exigent que le demandeur figure dans l’audience du sujet et décrivent le consentement ; cela ne prouve pas à lui seul l’intersection avec le grant entrant.
- Les [lignes 168–172](https://github.com/keycloak/keycloak/blob/24ed1dadf3f246a555adb6d3d4a99e9b3003fb3b/docs/guides/securing-apps/token-exchange.adoc#L168) avertissent que les scopes peuvent augmenter par défaut. La politique native `downscope-assertion-grant-enforcer` est donc indispensable à essayer sur le seul client d’échange. Son [implémentation, lignes 93–115](https://github.com/keycloak/keycloak/blob/24ed1dadf3f246a555adb6d3d4a99e9b3003fb3b/services/src/main/java/org/keycloak/services/clientpolicy/executor/DownscopeAssertionGrantEnforcerExecutor.java#L93) refuse un scope demandé absent du sujet puis restreint les scopes effectifs. Elle préserve aussi certains scopes par défaut non inclus dans la claim `scope` : les mappers, rôles et permissions réellement obtenus doivent donc être vérifiés, pas seulement cette chaîne.
- La [déclaration des features](https://github.com/keycloak/keycloak/blob/24ed1dadf3f246a555adb6d3d4a99e9b3003fb3b/common/src/main/java/org/keycloak/common/Profile.java#L190) classe `cimd` et `resource-indicators` **expérimentaux** (lignes 190/208). Standard Token Exchange V2 est DEFAULT, la délégation avec `act`/`may_act` est PREVIEW (lignes 93–94) et n’est pas nécessaire au banc demandé. Ne pas activer globalement `preview`.
- Le [tableau du tag, ligne 333](https://github.com/keycloak/keycloak/blob/24ed1dadf3f246a555adb6d3d4a99e9b3003fb3b/docs/guides/securing-apps/token-exchange.adoc#L333) indique que le paramètre RFC 8693 `resource` n’est pas supporté pour l’échange. Le paramètre `audience` et RFC 8707 au flux d’autorisation sont distincts : une correspondance explicite entre identifiants de clients et URI d’audience contractuelles est à qualifier sans changer les contrats. Support des métadonnées OAuth attendues par le client MCP à contrôler réellement ; OIDC discovery seul ne suffit pas. L’enregistrement initial des clients élimine le besoin de CIMD dans ce banc, sans prouver la compatibilité avec des clients arbitraires.

**Recommandation suivante : un banc Keycloak strictement borné, après accord du coordinateur sur ce périmètre.** Si les flags expérimentaux ou la politique native échouent aux exigences, rapporter l’échec ; ne pas affaiblir ADR02 ou ajouter une autre autorité dans cette tâche.

## Périmètre proposé pendant l’étude (autorisé ensuite ci-dessous)

Conserver les trois fichiers futurs annoncés dans `qualification/auth/` et cette fiche. Le Compose contient uniquement l’autorité retenue pour l’essai et PostgreSQL ; le runner Node pilote HTTP et le navigateur Playwright installé. Aucun service applicatif Calovibe ni framework OAuth ajouté. Pour Keycloak, préparer un realm importé et des clients/scopes/mappers/politique via son interface officielle ; valider le format exact du tag avant code. Utilisateur synthétique avec rôle read+write, client public Code/PKCE S256 et consentement read seul, service MCP confidentiel autorisé à échanger, API cible distincte et client non autorisé. Pas de modification SQL privée pour contourner les règles de l’autorité.

Ordre décisif des essais :

1. Démarrer sur un réseau/projet unique avec délai de santé maximal, vérifier issuer, discovery et JWKS ; vraie connexion navigateur puis échange code/PKCE. Refus du mauvais verifier et du rejeu du code.
2. Vérifier cryptographiquement signature/issuer/expiration/aud/sub avec JWKS. Réutiliser `jose` présent dans le verrou (`6.2.13`, transitif du SDK MCP) seulement si ce mode d’import de test est accepté dans l’attribution ; aucune dépendance ajoutée maintenant.
3. Sujet MCP read seul, utilisateur ayant aussi write : échange demandant write refusé ou sans droit write. Tester aussi scopes omis, rôles/mappers par défaut, plusieurs audiences, mauvaise audience et mauvais client demandeur. Un endpoint API synthétique protégé vérifie réellement le jeton signé/audience/scopes avant d’incrémenter son compteur en mémoire ; chaque refus garde le compteur identique. Cet endpoint ne simule aucune autorité et ne prouve aucun métier Calovibe.
4. Échange read autorisé vers la seule audience API, même sub ; API refuse le jeton MCP et le canal MCP refuse le jeton API. Essayer ensuite un consentement write réellement accordé et son échange autorisé, puis sujets invalides/expirés. Sorties d’assertions expurgées ; jamais de jetons complets ni secrets.
5. Arrêt ciblé en `finally`, délais bornés et preuve de disparition des seuls conteneurs/volumes étiquetés pour ce run.

Isolation proposée : projet `calovibe-authq-<identifiant aléatoire>`, aucun volume externe, PG sans port publié, autorité et console liées exclusivement à `127.0.0.1`. Ports sélectionnés par l’OS puis passés explicitement à Compose pour fixer l’issuer ; le relâchement avant bind Docker laisse une course locale, donc échec de bind = abandon/reprise bornée, jamais changement silencieux d’issuer. Secrets aléatoires synthétiques en mémoire/fichiers ignorés propres au run. Pas de journalisation des réponses de jetons, de rendu de configuration contenant les secrets ou de seed utilisateur réel. Pas de `docker system prune` ni de suppression de volume par recherche globale.

Budget initial **à mesurer, pas une compatibilité attestée** : Logto 1 CPU/768 MiB ou Keycloak 2 CPU/1536 MiB ; PG 1 CPU/512 MiB ; un seul navigateur, durée totale maximale 5 minutes puis nettoyage. PG 18.6 est le candidat déjà mentionné par ADR01 ; sa compatibilité effective avec chaque autorité reste ouverte, le Compose de démonstration Logto utilise PG 17. Aucun changement d’ADR01 n’est proposé ici.

## Images et commandes effectivement examinées

Métadonnées de registre seulement, pas de pull ni d’exécution de ces images :

| Image exacte | Digest index | Digest linux/amd64 |
|---|---|---|
| `ghcr.io/logto-io/logto:1.45.0` | `sha256:097cd47689546461edb4637fb6eee60b9ab6d3d4c08ebb20bc44a1b1809b82c0` | `sha256:3eb5fbf63ec81777a524a4287387e8d674cb5db9d5d0ee546df6bf93171d0a68` |
| `quay.io/keycloak/keycloak:26.8.1` | `sha256:a78d6b79572168cb25886b80a8b5b8d4ed4390743e3eecb810538683e209dd6b` | `sha256:3e1ac632e743660017b1e6bb4c3ffc800fd02c82cdd0db858cd03456a98a8dfc` |
| `postgres:18.6-bookworm` | `sha256:bbf83594798e144bff365a9c191c5d779f181fb3135902064ab8ff11918020fc` | `sha256:6b38fe68f2c02cafffbbce7496f76d110d8a947c039bd22c067e9a43c2250240` |

Le digest immuable identifie un artefact, pas une preuve que son binaire correspond au commit étudié : vérifier provenance/labels et version à l’exécution avant toute conclusion dynamique. Le Compose amont Logto référence `svhd/logto`, donc ne pas confondre cet exemple et l’image GHCR examinée.

Commandes exécutées : `docker version` → Engine 28.1.1 ; `docker info` → Linux x86_64 ; `docker manifest inspect` pour Logto/PG et `docker buildx imagetools inspect` pour les trois références → métadonnées lues ; `gh api` tags/commits/fichiers exacts → sources/licences conservées dans `artifacts/auth-qualification-study/` ignoré ; `npm ls jose --depth=4` → 6.2.13. Lecture complémentaire des [instructions OSS Logto](https://docs.logto.io/logto-oss/deployment-and-configuration) et de sa [délégation service-à-service](https://docs.logto.io/developers/service-to-service-delegation) : documentation courante, non substitut au code du tag.

**Bilan de la phase étude seulement — non exécuté :** démarrage de conteneur, seed, OAuth/PKCE, échange RFC 8693, contrôle d’intersection réel, suite de tests du dépôt. Aucun succès d’autorité, de fournisseur ou d’auth L1 revendiqué. Aucune modification des fichiers partagés gelés, aucun commit/PR. Restent : revue du rejet statique Logto, attribution du périmètre de qualification Keycloak et vérification dynamique des limites expérimentales. L’achat, le fournisseur distant et une exposition administrative publique ne sont ni nécessaires au banc proposé ni autorisés ici.

## Passage à l’implémentation autorisée — 24 octobre 2026

Le coordinateur autorise le banc **Keycloak OSS 26.8.1** après intégration PR11 ; branche actualisée par fusion sans rebase sur `92c1ebe8d723d5e32f780a219456a99dc65865d7`. Il s’agit du candidat d’essai, pas d’une autorité de production retenue. Le rejet Logto ci-dessus demeure fondé uniquement sur ses sources exactes ; aucun gros banc Logto ne sera ajouté.

Propriété transférée : `qualification/auth/*`, cette fiche et documentation dédiée ; `package.json`, `package-lock.json` seulement pour `jose@6.2.13` direct et `test:auth`, CI pour rendre ce test requis dans un job Docker séparé. Tous les contrats/fixtures/loader/ADR01/ADR02/DECISIONS et règles de validation restent inchangés. Utiliser Node 24.22.1/npm 11.13.0. AQ-04 à AQ-07 sont bloquants : un échec de qualification est diagnostiqué et publié comme tel, jamais présenté comme succès ou contourné par reclassement du client tiers. Réutiliser les helpers OAuth du SDK s’ils conviennent et jose/JWKS pour la cryptographie. Suite finale requise : installation verrouillée, test/check/lint/types/build, auth réel, navigateur, audit, diff et CI sur SHA exact.

## Livraison candidate et vérifications avant publication

Livré : `qualification/auth/compose.yml`, runner `qualify.cjs`, README, `jose@6.2.13` direct, script permanent `test:auth`, job CI `auth` séparé (normal + échec injecté et cleanup). Images/versions exactes prévues ci-dessus ; les versions effectivement exécutées devront provenir des rapports CI, pas de ces références. Le seed reste0600 ; le conteneur prend l’UID du runner pour éviter d’élargir les permissions.

Local réel Node24.22.1 (binaire portable SHA256 `d702daa815eabbff763c7d3808e235cf031cf2ca70211b56847bc72f51e240e5`) / npm11.13.0 : `npm ci --ignore-scripts` réussi ; `npm run check` 256/256 tests, lint/types/build réussis ; navigateur existant réussi ; `npm audit` zéro vulnérabilité ; Compose `config --quiet` avec seules valeurs synthétiques réussi sans service.

**ENV-DOCKER-NET-01 :** `npm run test:auth` local réellement lancé, échoue dès `docker version` HTTP500 ; aucun conteneur de ce banc n’a démarré, seed retiré. Le coordinateur confirme hors sandbox apiproxy→192.168.65.7:2375 inaccessible, distinct de l’ancien défaut IPC. Aucune réparation administrative, arrêt WSL/Debian ou update Docker tenté ici. AQ04–07 restent donc non prouvés localement. La CI Linux doit exécuter le vrai banc et les refus complets : candidate **non intégrable** tant que ce job et les contrôles/revues indépendantes ne sont pas favorables sur SHA exact. Un échec de compatibilité découvert en CI reste un blocage, sans assouplissement ni suppression de scénario.

L’auto-review a refusé une proposition de seed0644 ; cette proposition n’a pas été exécutée. Alternative retenue : seed0600, UID du propriétaire dans le conteneur. Aucun secret personnel ni fournisseur externe impliqué. Modèle Sol/high demandé, effectif toujours non attesté.

Défauts du banc pendant sa qualification (sans verdict d’autorité favorable) : AQ-UI-SELECTOR-01, première correction du sélecteur `input` vers l’élément officiel `button` du thèmev2 ; protection par le vrai E2E, aucun test recopiant le sélecteur. CI40102271198 a ensuite atteint l’émission réelle, mais jose refuse un claim requis : le seed minimal avait omis le mapper natif `oidc-sub-mapper` normalement apporté par le scope Keycloak basic. AQ-SEED-SUB-01 : ajout du mapper officiel côté émetteur (aucun `sub` fabriqué/réécrit dans les tokens). Les scopes read+write par défaut du seul échangeur permettent d’exercer explicitement leur restriction par le sujet ; le client public conserve read seul demandé. L’expiration attend les deux JWT réels (sujet et aval), dont les dates d’émission diffèrent.

Suivi stable des défauts du banc : AQ-UI-SELECTOR-01 (1 correction, 0 correction infructueuse constatée ; l’E2E suivant atteint émission JWT), AQ-SESSION-REPLAY-01 (1 correction d’isolation selon la révocation native ; 0 correction infructueuse constatée ; nouveau grant nominal complet après les négatifs explicitement exigé), AQ-SEED-SUB-01 (1 correction native, validation CI en attente ; 0 correction infructueuse constatée). Aucun compteur réinitialisé ; signaler et arrêter l’intégration au troisième échec du même blocage. Le rejeu reste réellement tenté/refusé ; le nouveau grant se reconnecte, obtient un code/PKCE distinct puis vérifie signature, sub, audience et scopes avant l’échange aval.

## Reprise du 27 octobre 2026

Mandat de reprise explicite du propriétaire, usage ordinaire autorisé sans achat. Tête distante5655c149 préservée, base develop92c1ebe inchangée ; les deux modifications locales préparées le24 (nouveau grant après négatifs et suiviIDs) sont conservées.

Logs exacts CI40102551630 et40102554571 : AQ02, discovery/S256, vrai consentement Code/PKCE et JWT MCP signé, refus de code rejoué/verifier incorrect/resource modifiée passent ; l’assertion stricte sur les scopes aval échoue ensuite. Les deux nettoyages, dont échec injecté, passent. Les artefacts3jours sont expirés au27 ; ajouter un diagnostic expurgé des seuls scopes/rôles synthétiques émis, jamais JWT ou secret, avant d’attribuer une cause au surplus. AQ-EXCHANGE-SCOPES-01 : constat initial, diagnostic en cours, aucune correction ni assouplissement à ce stade. AQ-SEED-SUB-01 corrigé : preuveJWT signé atteint dans les deuxCI ; compteur infructueux0 maintenu. AQ-SESSION-REPLAY-01 : nouveau grant Code/PKCE entièrement renouvelé après les négatifs ajouté, refus du rejeu conservé ; validation à suivre.

Docker local revérifié sans reset ni arrêt WSL : pipe `dockerDesktopLinuxEngine` absent le27. ENV-DOCKER-NET-01 reste une limite locale, distincte des résultats obtenus sous Docker Linux CI. Aucune autorité retenue, PR12 toujours brouillon/non intégrable.
