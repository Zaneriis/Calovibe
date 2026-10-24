# L0 — Registre des décisions et accès

État du 24 octobre 2026. Aucun lot n'est déclaré terminé par ce registre.

## Livraisons vérifiées, qualifications restantes

Le cadre de coordination ([PR3](https://github.com/Zaneriis/Calovibe/pull/3)), les
schémas communs DATA ([PR4](https://github.com/Zaneriis/Calovibe/pull/4)), les propositions
d'architecture ([PR5](https://github.com/Zaneriis/Calovibe/pull/5)) et d'authentification
([PR6](https://github.com/Zaneriis/Calovibe/pull/6)) sont intégrés sur `develop` après
suite, CI et revues indépendantes sur leurs SHA exacts. Le correctif de miroir Ubuntu
([PR7](https://github.com/Zaneriis/Calovibe/pull/7)) conserve tous les contrôles et permet
à la CI d'installer les dépendances du navigateur sans le miroir Azure défaillant.

Les [données communes](contracts/DATA.md) disposent d'un schéma JSON Schema 2020-12,
d'exemples et de tests permanents. Ce sont des formes et conventions proposées, pas
un calculateur, une base ou une API en production. Les [contrats API/MCP](contracts/API-MCP.md)
([PR8](https://github.com/Zaneriis/Calovibe/pull/8), commit
`1778c6aa96d43785fcdb0ecb8b6c16bd234c38a7`) sont intégrés : OpenAPI 3.1.2,
31 capacités MCP, exemples et validation permanente ; 165 tests et navigateur réussis,
avec revues indépendantes sur ce commit. [PR10](https://github.com/Zaneriis/Calovibe/pull/10),
commit `3b5b3134ef48a9df9669a6b3a3ab27325f0e0678`, livre la référence MCP HTTP officielle
avec 31 outils et identités/réponses synthétiques ([preuves et limites](contracts/MCP-REFERENCE.md)).
L’autorité/authentification réelles et la qualification de la chaîne applicative restent à réaliser. **L0 et L1 ne sont pas terminés.**

Le [suivi de coordination](tasks/L0-COORDINATION.md) conserve l'état de départ ; le
tableau courant, les candidats et les preuves postérieures aux commits sont dans la
[PR de coordination](https://github.com/Zaneriis/Calovibe/pull/3). Les rapports ignorés
dans `artifacts/` ne constituent pas seuls le suivi durable.

## Validé par le propriétaire

Web responsive + API commune + MCP pour Hermès ; pas d'agent conversationnel interne ;
services conteneurisés sur Ubuntu personnel ; données sur ce serveur ; HTTPS et droits
sur les interfaces Internet ; livraison automatique après contrôles et revues indépendantes.
Les autres exigences validées restent dans le cahier des charges, sans modification ici.

Décision humaine du 23 octobre 2026 : dépôt privé sans GitHub Pro ni protection de branche.
Interdiction formelle dans AGENTS.md de fusionner ou pousser vers `master`, qui reste figée.
`develop` sert à l'intégration et devient la branche par défaut ; CI et revues indépendantes
restent requises sur le SHA exact, intégré en fast-forward. Cette discipline ne constitue
pas une interdiction techniquement imposée par GitHub.

## Choix ouverts et recommandation de travail

| ADR | Proposition, non décision utilisateur | Condition avant clôture |
|---|---|---|
| 01 | monorepo, API modulaire, web et adaptateur MCP, Compose et PostgreSQL conformément aux recommandations existantes ; préférer un même langage si les bibliothèques le permettent | comparaison courte, versions supportées exactes, dépendances verrouillées et commandes lint/types/tests/build vérifiées avant code applicatif |
| 02 | web avec session sécurisée ; MCP HTTP avec autorisation conforme au protocole, validation d'audience et droits ; MCP appelle l'API | transport/version/auth documentés et essais lecture/écriture/refus avec client MCP de référence ; Hermès reste un client externe sans accès ni modification ; choisir l'autorité d'identité sans inventer de fournisseur |
| 03 | exécutant dédié sur Ubuntu/LAN, reverse proxy existant si adapté, images par digest | inventaire réel CPU/RAM/disque, Docker/Compose, domaine/DNS/TLS, réseau, sauvegardes, plateforme Git et droits disponibles |
| 04–07 | inchangées, différées aux échéances du backlog | pas nécessaires pour préparer le cadre ; photo et budget avec propriétaire avant intégration |

Les comparaisons et versions candidates sont dans [ADR-01](adr/ADR-01-architecture.md)
et [ADR-02](adr/ADR-02-auth-mcp.md). Le coordinateur peut arrêter les choix techniques
locaux sous mandat après qualification et revues, sans inventer une validation humaine
ni demander une approbation routinière. Les décisions réellement réservées restent les
fournisseurs externes, dépenses non décidées, opérations destructives et changements
d'exposition administrative. Aucune autorité réelle ni pile applicative n'est déjà
qualifiée par la seule intégration de ces propositions.

La [spécification MCP d'autorisation consultée le 23 octobre 2026](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
distingue HTTP et stdio ; pour HTTP, elle décrit découverte, OAuth, audience et refus des
jetons invalides. Cela ne prouve pas la compatibilité Hermès. Ne pas transmettre au MCP
un jeton destiné à une autre ressource ni improviser une authentification exposée.

## Contrats à préparer avant L1 — propositions à revoir

DATA v0.1.0 et les formes API/MCP sont livrés comme contrats proposés et revus ; les
conventions ci-dessous se lisent avec [DATA](contracts/DATA.md), [API/MCP](contracts/API-MCP.md)
et leurs limites. Les validations de forme ne prouvent pas les garanties des futurs services.
Ne pas commencer L2 sur cette seule description.

- Quantités et valeurs nutritionnelles : décimaux sous forme de chaînes, précision proposée
  3 décimales, quantité > 0 et ≤ 1000000 dans son unité ; `null` pour inconnu, `"0"` pour zéro.
  PostgreSQL numeric proposé ; arrondi d'affichage au demi supérieur, kcal entières et macros
  à 0,1 g, somme avant arrondi. Exemple 200 kcal/100 g × 150 g = 300 kcal ; rejeter -1,
  chaîne vide et conversion g/ml sans équivalence produit. Implémentation arithmétique différée.
- Date locale ISO réelle `YYYY-MM-DD` avec fuseau profil Europe/Paris, horodatage UTC RFC3339 ;
  `2028-02-29` valide, `2026-02-29` invalide ; tester minuit et changements d'heure.
- Version entière positive ; mutation avec version attendue, sinon conflit explicite.
  UUID d'opération généré par le client ; portée utilisateur authentifié + operationId,
  indépendante du canal/client. Même ID et requête canonique = résultat d'origine,
  requête différente = conflit. Authentification et droits restent vérifiés avant le reçu.
- Objectifs avec date d'effet, version et origine, sans réécriture du passé. Entrées nutritionnelles
  en instantané ; proposition photo séparée ; confirmation atomique ; annulation ciblée avec
  version attendue. Recommandation revue : registre et résultats pendant la vie du compte,
  tombstones après suppression et inverses tant qu'annulables, sans purge silencieuse ;
  annulation atomique des seules cibles concernées et sans conflit. Ces garanties restent
  à implémenter et tester en base ; aucune conservation d'image n'est choisie ici.
- Erreur proposée `{code, message, fields, operationId}` sans secret ni donnée personnelle ;
  HTTP 401/403/422/404/409/422/503 pour authentification, autorisation, validation, introuvable,
  version, incomplet, dépendance. Codes distincts pour les deux 422 ; ambiguïté MCP structurée.
- Capacités MCP à décliner du tableau du cahier des charges (journal, bibliothèque, eau,
  poids/objectifs, photo et opérations), paramètres explicites et mêmes erreurs via API.
  Les 31 noms, schémas typés et exemples automatisés sont livrés ; la négociation réelle
  avec le client de référence reste à vérifier en L0.

## Accès indispensables uniquement

| Élément | Constat local | Ce qui manque / action attendue |
|---|---|---|
| Git | dépôt privé Zaneriis/Calovibe ; develop par défaut ; PR intégrées et CI vérifiées | aucun accès supplémentaire nécessaire pour la CI existante |
| Protections/revues | API GitHub de protection master : 403 ; propriétaire choisit explicitement de fonctionner sans protection | aucun achat ; master figée selon AGENTS.md, develop pour intégration ; CI et revues indépendantes obligatoires, risque technique résiduel accepté dans cette décision |
| Docker local | Diagnostic coordinateur hors sandbox du24octobre : WSL2 Linux configuré (WSL3.0.3/kernel6.18.54), Debian/docker-desktop Stopped ; CLI start dit déjà running, mais info/logs/restart bornés ne répondent pas ; com.docker.service Stopped | Cause non résolue, aucune suppression/reset ni conteneur lancé. Le service Windows n’est pas nécessaire au moteur WSL2 Linux sans maintien des hosts selon [Docker](https://docs.docker.com/desktop/setup/install/windows-permission-requirements/) ; ne pas présumer une intervention admin ni un essai Docker réussi. Études/contrats locaux indépendants continuent |
| Ubuntu | aucune connexion serveur vérifiée | accès LAN/SSH pour préparer et vérifier la production uniquement ; développement et essais Docker locaux possibles sans cet accès |
| Exposition | domaine/proxy/TLS non fournis | accès à l'existant et décision domaine si absent ; aucune ouverture administrative implicite |
| Hermès | client utilisateur externe, décision de session | aucun accès requis ; contrat standard et client MCP de référence, sans modifier Hermès |
| Secrets/déploiement | aucun magasin configuré | choisir celui de la plateforme réelle, déléguer uniquement injection/exécution ; générer les secrets lors du raccordement, sans valeurs dans le dépôt |

Le propriétaire ne doit modifier aucun code. Un accès peut suffire à laisser les agents
inventorier et proposer la configuration exacte. Aucun achat, domaine fictif, serveur,
secret ou protection supposés. ADR-01/02 restent ouvertes pour leurs qualifications ;
la négociation du client MCP de référence relève de L0, la sécurité des services réels
de L1, le journal et ses brouillons/conflits de L2, la restauration complète isolée de L8.
Ces étapes ne sont pas des prérequis circulaires les unes des autres.
