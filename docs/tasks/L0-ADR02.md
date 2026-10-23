# L0-ADR02 — Étude authentification web/API et autorisation MCP

Statut : étude en cours, proposition à revoir ; aucune authentification livrée.

- Dépendances : L0 sans dépendance ; conventions d'ADR-01 et contrats L0 à faire converger avant L1.
- Auteur : agent développeur L0-ADR02 ; modèle demandé GPT-6.1 Sol/high ; modèle/niveau effectifs non exposés de façon vérifiable dans cette session. Aucun achat ou dépassement activé.
- Propriété exclusive : `docs/adr/ADR-02-auth-mcp.md`, `docs/tasks/L0-ADR02.md`. Aucun code, dépendance, CI, contrat partagé ou configuration Hermès modifié.
- Isolation : branche `codex/l0-auth-mcp`, worktree `C:\Users\Leo14\.codex\worktrees\l0-auth-mcp\Calovibe`, base `origin/develop` = `5a11d51812ad447023cdbdc4bb51e1e30a9cffaa`, état initial propre.
- Sources lues : AGENTS, CAHIER-DES-CHARGES, BACKLOG, DECISIONS-L0, DEVELOPPEMENT-AUTONOME, ORCHESTRATION, MODELES-AGENTS ; skill Ponytail full appliquée.

## Critères et vérification prévus avant rédaction de l'ADR

| Critère | Nominal / erreur / limite | Preuve attendue |
|---|---|---|
| Choix concret proportionné, non présenté comme décision humaine | Comparer autorité dédiée et option minimale ; identifier décision propriétaire indispensable | ADR sourcée, revue fonctionnelle indépendante |
| Web sécurisé et API commune | Session, expiration, déconnexion, CSRF et refus sans identité ; aucune session d'auth confondue avec brouillon métier | Contrat proposé dans ADR ; E2E applicatif différé, aucune route existante |
| MCP HTTP standard | Découverte, PKCE, resource/audience, scopes et jetons refusés | Spécification officielle datée + compatibilité SDK/client documentée |
| MCP appelle API sans passthrough | Identité et droits propagés de façon contrôlée, audience distincte ; refus n'écrit rien | Séquence proposée et scénarios lecture/écriture/refus ; interop réelle non revendiquée |
| Client de référence exécutable | Versions publiées et prérequis vérifiés ; absence de serveur signalée | Métadonnées officielles / npm ; futur plan d'essai reproductible |
| Cadre existant conservé | Dépendances verrouillées, syntaxe/unités et navigateur | `npm ci --ignore-scripts`, `npm run check`, `npm run test:browser` réellement exécutés ou limite exacte |
| Pas d'impact visible livré | Aucun écran ni parcours modifié | Demande de non-applicabilité UI au réviseur indépendant |

## Livraison et revue

PR cible `develop` uniquement. Le SHA exact, l'URL, les commandes et résultats seront conservés dans la PR après commit ; aucun auto-avis d'approbation. Aucune intégration par le développeur. Les verdicts indépendants et cycles de correction appartiennent au circuit du coordinateur.

## Résultats réels de l'étude

- `npm ci --ignore-scripts` : succès, 3 paquets, audit npm 0 vulnérabilité signalée.
- `npm run check` : succès, 29 tests / 29, aucun ignoré ; syntaxe et cadre/prototypes uniquement.
- `npm run test:browser` : succès, parcours prototypes 320–1024 px ; aucune auth applicative couverte.
- `npm exec --yes --package=@modelcontextprotocol/inspector@2.12.0 -- inspector --cli --help` : succès, code 0, aide affichée ; aucun serveur contacté.
- `npm view` : client/server MCP 2.3.1 Node >=20 ; ancien sdk 1.32.1 Node >=18 ; Inspector 2.12.0 Node >=22.19.0 ; oidc-provider 9.13.0. Node observé 26.2.0, npm 11.13.0.
- Sources officielles actuelles comparées dans ADR : protocole 2026-07-28 réellement accessible ; Logto OSS 1.45.0 qualification prioritaire ; Keycloak 26.8.1 avec fonctions expérimentales ; oidc-provider 9.13.0 seulement alternative à assembler.
- Limites : AUTH-01 à AUTH-10 non exécutés, aucune interopérabilité réelle ni service auth livré ; aucune autorité validée par le propriétaire ; périmètre exact des fonctionnalités Logto OSS à qualifier. Aucun accès Hermès ou Ubuntu ni essai conteneur de cette tâche.
- Non-applicabilité UI proposée : uniquement deux documents ajoutés, aucun écran changé ; verdict du réviseur indépendant encore requis. Étude proposée prête à revoir, ADR ouverte. Une tâche distincte doit implémenter et tester les contrats MCP ; un faux fournisseur OAuth Node éventuel doit rester explicitement synthétique.
