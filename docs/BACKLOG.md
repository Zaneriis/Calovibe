# Calovibe — Ordre de réalisation et acceptation

Version 1.1 — 23 octobre 2026. Complète [le cahier des charges](CAHIER-DES-CHARGES.md). Aucun lot ci-dessous n’est déclaré implémenté par la présence d’une maquette.

## Mode d’exécution

Chaque tâche doit être assez petite pour être revue indépendamment. Avant son code, produire une fiche : ID, résultat attendu, dépendances, canaux, contrats concernés, critères d’acceptation, scénarios nominal/erreur/limites et commandes de vérification. Une ligne de cette matrice doit pointer vers un test ou une justification revue de non-applicabilité.

Ordre : L0 → L1 → L2 → L3. Ensuite L4 et L5 peuvent avancer indépendamment après stabilisation des contrats ; L6 dépend de L2 et de sa décision fournisseur. L7 peut commencer après L3. L8 termine la version initiale. Les travaux parallèles doivent posséder des frontières de fichiers et contrats claires.

La sécurité et les tests accompagnent chaque lot. L8 ne doit pas devenir une phase à laquelle ces obligations seraient repoussées.

## L0 — Contrats et décisions techniques

**Dépendances :** aucune. **Canaux :** tous.

Résultat : décisions d’architecture versionnées, versions d’outils fixées, modèle de données, contrat API et capacités MCP. Choisir une solution proportionnée aux trois services applicatifs validés.

Acceptation :

- ADR-01 et ADR-02 résolues, détails serveur accessibles d’ADR-03 vérifiés ; les accès manquants sont explicitement identifiés.
- Schémas de quantités, dates, erreurs, versions, objectifs et idempotence documentés avec exemples valides et invalides.
- Calcul d’une portion défini, arrondis compris. Cas : base 100 g à 200 kcal, quantité 150 g → 300 kcal.
- Incompatibilité g/ml sans équivalence explicitée.
- Contrat des outils MCP et interopérabilité vérifiés avec un client de référence ; Hermès reste un client externe, sans accès ni modification (précision humaine du 23 octobre 2026).
- Commandes stables de lint/types/tests/build et stratégie de suites requises définies.

Preuves : ADR, contrat validable, exemples vérifiés automatiquement. Aucun développement métier ne doit figer un contrat contradictoire à ce lot.

## L1 — Socle conteneurisé et chaîne de validation

**Dépendances :** L0. **Canaux :** infrastructure, web/API/MCP.

Résultat : démarrage reproductible, première route de santé, accès personnel sécurisé, migrations initiales et CI.

Acceptation :

- Un lancement documenté démarre front, API, MCP et données avec Docker Compose.
- Le navigateur, l’API et le MCP atteignent leurs services sans accès direct client à la base.
- Les routes privées refusent une requête non authentifiée.
- Les secrets sont absents des images et du dépôt.
- CI à chaque push ; suite complète et revues indépendantes requises avant intégration en fast-forward sur `develop`. `master` figée, jamais de fusion ni push ; sans protection GitHub selon la décision humaine du 23 octobre 2026 consignée dans AGENTS.md.
- Le même commit produit des images identifiables. Une erreur de compilation/test bloque l’intégration et le déploiement.

Preuves : démarrage propre, refus d’accès, contrôle CI volontairement en échec puis rétabli. Mettre en place le canal de déploiement local sans encore exposer un journal incomplet contenant des données personnelles.

## L2 — Premier parcours complet journal + MCP

**Dépendances :** L1. **Fonctions :** F01/F02/F08.

Résultat : création manuelle d’un aliment, ajout d’une quantité à une date et un repas, bilan, correction, déplacement, suppression et annulation via l’API, le web et le MCP.

Acceptation :

- Ajouter au dîner d’une date passée n’ajoute rien au déjeuner ni à aujourd’hui.
- Une portion calcule les quatre apports selon le contrat.
- Corriger la quantité met à jour entrée, repas et journée ; supprimer retire exactement cette entrée.
- Déplacer l’entrée met à jour les deux repas/journées sans duplicata.
- Deux envois avec le même identifiant d’opération produisent une seule entrée.
- Deux corrections concurrentes ne s’écrasent pas silencieusement.
- Redémarrer les conteneurs conserve le journal.
- Hermès/MCP et le web constatent le même résultat.
- Retour et annulation d’un écran d’édition n’enregistrent rien. Un brouillon reste disponible selon le parcours.
- Annuler une écriture ne modifie pas une entrée indépendante ; un conflit est explicite.

Preuves : unités de calcul, intégration avec la vraie base de test, tests de contrats, parcours de bout en bout web et MCP/API, revue fonctionnelle et UI/UX.

## L3 — Accueil complet et suivi quotidien

**Dépendances :** L2. **Fonctions :** F01/F06 et objectifs manuels de F07.

Résultat : accueil conforme aux références, navigation de dates, eau et objectifs manuels datés.

Acceptation :

- Les quatre repas sont présents ; une journée vide ne reprend pas les données d’une autre.
- Totaux et objectifs de la date sélectionnée sont corrects ; un dépassement est affiché.
- Eau : 250 ml, 500 ml, 1 000 ml et saisie libre. Correction, suppression et annulation testées.
- Changer un objectif n’altère pas rétroactivement les journées antérieures à sa date d’effet.
- Calendrier accessible sur mobile et au clavier.
- Thèmes et réorganisation responsive respectent les règles, y compris noms longs et grandes valeurs.
- Aucun tag de provenance sur les lignes de l’accueil ; plats et aliments restent modifiables/supprimables.

Preuves : E2E des jours et de l’eau, historique d’objectifs en intégration, captures stables des deux thèmes aux tailles de référence et intermédiaires.

## L4 — Bibliothèque et plats enregistrés

**Dépendances :** L2, contrats stabilisés ; cadrage UI ADR-07. **Fonction :** F03.

Résultat : deux modes de création de plat et ajout de portions dans le journal.

Acceptation :

- Un plat de deux portions répartit correctement les apports de ses ingrédients.
- Un plat défini par poids final permet de calculer une portion pesée.
- La saisie directe précise sa base et donne le même aperçu que le journal.
- Modifier la recette ne change pas ses consommations passées.
- Modifier le grammage d’une entrée de plat ne change pas la recette enregistrée.
- Ajouter un plat dans un repas contenant déjà des aliments conserve les entrées précédentes.

Preuves : calculs unitaires, instantanés en base, E2E création/ajout/édition de portion et outils MCP applicables.

## L5 — Produits et code-barres

**Dépendances :** L2, ADR-04 et ADR-07. **Fonction :** F04.

Résultat : scan ou code saisi, résolution produit, quantité, confirmation dans le contexte initial.

Acceptation :

- Produit connu : valeurs de référence et quantité appliquées correctement.
- Produit inconnu : poursuite manuelle sans perdre date/repas.
- Donnée manquante : aucune conversion silencieuse en zéro.
- Refus caméra et fournisseur indisponible : erreur compréhensible et solution de repli manuelle.
- Produit en ml : pas de conversion arbitraire en grammes.
- Un repas peut contenir un plat enregistré, un produit scanné et un ajout manuel.

Preuves : réponses fournisseur contrôlées, intégration réelle distincte, E2E du parcours et du repli, caméra vérifiée sur les appareils retenus.

## L6 — Analyse photo

**Dépendances :** L2, ADR-05. **Fonction :** F05.

Résultat : analyse externe et proposition corrigeable avec confirmation explicite.

Acceptation :

- Une image choisie/prisée est prévisualisée ; format invalide ou lecture impossible donne une erreur sans modifier le journal.
- Traitement asynchrone : états attente/en cours/réussite/échec ; pas de journalisation préalable à la confirmation.
- Quantités, suppression et ajout d’éléments oubliés fonctionnent ; valeurs manquantes distinguées des zéros.
- Renommer/changer l’identité exige la vérification nutritionnelle définie au contrat.
- Fermer et reprendre restaure la proposition pour sa date et son repas.
- Confirmer deux fois un lot ne l’ajoute qu’une fois. Une confirmation échouée n’ajoute pas un sous-ensemble invisible.
- Annuler le lot ne touche pas les autres entrées. Un conflit avec une modification ultérieure est explicite.
- Ajouter ensuite manuellement ou par code-barres complète le même repas.
- L’accès aux images respecte les droits et la politique de conservation décidée.

Preuves : tests de réponses du modèle, erreurs/reprises/duplication en intégration, E2E du parcours de correction et d’un repas mixte, contrôle réel du fournisseur distinct des tests déterministes.

## L7 — Poids et proposition d’objectifs

**Dépendances :** L3, ADR-06 et ADR-07. **Fonction :** F07.

Résultat : suivi des pesées et proposition calculée explicable avec application volontaire.

Acceptation :

- Ajouter/corriger/supprimer une pesée datée et vérifier la consultation des valeurs.
- Sans profil complet, les objectifs manuels restent utilisables.
- Un profil de référence donne les résultats attendus par les équations et coefficients versionnés.
- L’activité d’entraînement n’est pas comptée deux fois.
- Les macros proposées sont cohérentes avec l’enveloppe calorique selon la règle documentée ; une configuration impossible est signalée.
- L’utilisateur peut modifier puis appliquer les valeurs avec une date d’effet.
- Aucune modification automatique à une pesée ; aucun chiffre de gras perdu déduit du seul poids.

Preuves : tables de cas numériques et limites, historique en intégration, E2E profil/proposition/édition/application et saisie manuelle indépendante.

## L8 — Version initiale exploitable

**Dépendances :** L3 à L7 et décisions d’exploitation résolues.

Résultat : version utilisable, automatiquement déployée sur Ubuntu, contrôlée et récupérable.

Acceptation :

- Suite complète requise réussie et revues du commit exact validées.
- Test mixte : plat enregistré + aliment manuel + code-barres + photo dans le même repas ; corrections et totaux cohérents.
- Deux appareils et Hermès observent les mêmes données et conflits attendus.
- Vérifications responsive, clavier, focus, contrastes et grands caractères réalisées sur les écrans livrés.
- L’exécutant local déploie sans dépendre du PC fixe et sans approbation routinière de production.
- Un déploiement en échec ne détruit pas le journal ; la stratégie de retour est vérifiée.
- Une sauvegarde est restaurée dans un environnement isolé ; données et fichiers attendus sont récupérés.
- Installation, mise à jour, sauvegarde/restauration et diagnostic sont documentés avec commandes exactes.

Preuves : compte rendu de version, images/commit, journaux expurgés, tests après déploiement et exercice de restauration.

## Matrice des revues

| Changement | Fonctionnel | UI/UX | Tests |
|---|---|---|---|
| Parcours web ou composant | Oui | Oui | Oui |
| Calcul, stockage ou API/MCP | Oui | Si comportement visible affecté | Oui |
| Tests, seuils ou CI | Selon impact | Si références visuelles affectées | Oui, indépendante |
| Déploiement ou migration | Oui | Si parcours affecté | Oui |

La colonne UI/UX ne dispense pas des tests responsive lorsqu’un composant partagé est affecté. Une approbation ancienne ne vaut pas pour un nouveau commit.
