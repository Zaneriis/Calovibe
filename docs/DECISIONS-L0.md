# L0 — Registre des décisions et accès

État du 23 octobre 2026. Aucun lot n'est déclaré terminé par ce registre.

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

La [spécification MCP d'autorisation consultée le 23 octobre 2026](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
distingue HTTP et stdio ; pour HTTP, elle décrit découverte, OAuth, audience et refus des
jetons invalides. Cela ne prouve pas la compatibilité Hermès. Ne pas transmettre au MCP
un jeton destiné à une autre ressource ni improviser une authentification exposée.

## Contrats à préparer avant L1 — propositions à revoir

Ces conventions ne constituent pas encore OpenAPI ni un schéma validable livré.
Ne pas commencer L2 sur cette seule description.

- Quantités et valeurs nutritionnelles : décimaux sous forme de chaînes, précision proposée
  3 décimales, quantité > 0 et ≤ 1000000 dans son unité ; `null` pour inconnu, `"0"` pour zéro.
  PostgreSQL numeric proposé ; arrondi d'affichage au demi supérieur, kcal entières et macros
  à 0,1 g, somme avant arrondi. Exemple 200 kcal/100 g × 150 g = 300 kcal ; rejeter -1,
  chaîne vide et conversion g/ml sans équivalence produit. Implémentation arithmétique différée.
- Date locale ISO réelle `YYYY-MM-DD` avec fuseau profil Europe/Paris, horodatage UTC RFC3339 ;
  `2028-02-29` valide, `2026-02-29` invalide ; tester minuit et changements d'heure.
- Version entière positive ; mutation avec version attendue, sinon conflit explicite.
  UUID d'opération par client ; même ID/même corps = même résultat, corps différent = conflit.
  Portée d'idempotence et durée de conservation à fixer avant contrat définitif.
- Objectifs avec date d'effet, version et origine, sans réécriture du passé. Entrées nutritionnelles
  en instantané ; proposition photo séparée ; confirmation atomique ; annulation ciblée avec
  version attendue. Recommandation : conserver les opérations tant que les données ciblées
  existent, annulation seulement sans conflit ; portée exacte à ratifier au contrat.
- Erreur proposée `{code, message, fields, operationId}` sans secret ni donnée personnelle ;
  HTTP 401/403/422/404/409/422/503 pour authentification, autorisation, validation, introuvable,
  version, incomplet, dépendance. Codes distincts pour les deux 422 ; ambiguïté MCP structurée.
- Capacités MCP à décliner du tableau du cahier des charges (journal, bibliothèque, eau,
  poids/objectifs, photo et opérations), paramètres explicites et mêmes erreurs via API.
  Les noms, schémas typés, exemples automatisés et négociation réelle restent à livrer en L0.

## Accès indispensables uniquement

| Élément | Constat local | Ce qui manque / action attendue |
|---|---|---|
| Git | dépôt privé Zaneriis/Calovibe créé et premier commit poussé ; authentification rétablie | aucun accès supplémentaire nécessaire pour la CI |
| Protections/revues | API GitHub de protection master : 403 ; propriétaire choisit explicitement de fonctionner sans protection | aucun achat ; master figée selon AGENTS.md, develop pour intégration ; CI et revues indépendantes obligatoires, risque technique résiduel accepté dans cette décision |
| Docker local | CLI présente, moteur Linux inaccessible | démarrer Docker Desktop si essais conteneur locaux souhaités ; pas nécessaire au pilote de revue |
| Ubuntu | aucune connexion serveur vérifiée | accès LAN/SSH pour préparer et vérifier la production uniquement ; développement et essais Docker locaux possibles sans cet accès |
| Exposition | domaine/proxy/TLS non fournis | accès à l'existant et décision domaine si absent ; aucune ouverture administrative implicite |
| Hermès | client utilisateur externe, décision de session | aucun accès requis ; contrat standard et client MCP de référence, sans modifier Hermès |
| Secrets/déploiement | aucun magasin configuré | choisir celui de la plateforme réelle, déléguer uniquement injection/exécution ; générer les secrets lors du raccordement, sans valeurs dans le dépôt |

Le propriétaire ne doit modifier aucun code. Un accès peut suffire à laisser les agents
inventorier et proposer la configuration exacte. Aucun achat, domaine fictif, serveur,
secret ou protection supposés. ADR-01/02 restent ouvertes ; L1 en préparation uniquement.
