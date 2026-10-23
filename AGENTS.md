# Instructions des agents — Calovibe

## Références

Lire `docs/CAHIER-DES-CHARGES.md` et `docs/BACKLOG.md` avant toute implémentation. Les décisions validées de ces fichiers et les instructions humaines en session font autorité. Les maquettes sont des références de comportement et de design, pas du code de production à recopier.

## Périmètre et ordre

- Travailler sur une tâche identifiée et respecter ses dépendances.
- Avant le code, rendre ses critères d’acceptation et sa stratégie de vérification explicites.
- Ne pas transformer une décision ouverte en exigence validée. Préparer une recommandation concrète ; remonter les seuls choix réellement nécessaires.
- Réutiliser les composants et règles métier partagés. Ne pas multiplier services ou abstractions sans bénéfice démontré.
- Pas d’agent conversationnel dans l’application : Hermès porte ce rôle. Le fournisseur photo reste une intégration distincte.

## Vérification

- Chaque fonctionnalité possède des tests de bout en bout sur les canaux qu’elle expose et les tests unitaires/intégration adaptés à ses risques.
- Chaque défaut corrigé reçoit un test de non-régression qui le reproduit. Toute exception est motivée et revue indépendamment.
- Couverture indicative : 70 %, non bloquante. Couvrir davantage lorsque cela protège un comportement utile ; expliquer les limites disproportionnées. Les comportements critiques restent à vérifier.
- Avant intégration, faire passer toute la suite requise. Ne jamais supprimer, ignorer ou affaiblir un contrôle pour faire passer une tâche.
- Vérifier les changements UI dans une interface rendue, dans les deux thèmes, sur petit/grand écran et au clavier. Tester date/repas d’origine, brouillons, erreurs et annulation.
- Ne pas déclarer exécuté un test non lancé. Signaler toute limite de vérification.

## Revues et autonomie

- Les revues fonctionnelle, UI/UX et qualité des tests sont distinctes ; le développeur n’auto-approuve pas son travail.
- Chaque retour bloquant doit citer une exigence, un risque concret ou une référence, avec preuve et résultat attendu.
- Les suggestions restent non bloquantes. Aucun score global ne compense un échec requis.
- Les approbations portent sur le commit exact. Modifier les règles de validation exige leur revue indépendante.
- Après trois cycles infructueux sur le même blocage, fournir un diagnostic et arrêter l’intégration sans assouplir les exigences.

## Données et livraison

- Conserver les données existantes. Séparer brouillons et écritures confirmées.
- Prévenir les doublons et écrasements concurrents ; une annulation vise l’opération concernée.
- Ne jamais exposer secrets ou données personnelles dans les journaux, images conteneur ou dépôt.
- Tous les services hébergés, front compris, sont conteneurisés.
- Le déploiement en production est automatique une fois les contrôles et revues réussis. Ne pas demander une approbation routinière à chaque livraison.
- Une opération destructive sur les données, une dépense non décidée ou un changement d’exposition administrative exige un traitement explicite ; ne pas l’inférer de l’autorisation de déployer.

## Compte rendu de tâche

Indiquer : ID, résultat livré, commit/version, commandes réellement exécutées et résultats, critères couverts, limites et décisions restantes. Une maquette ou un test isolé ne prouve pas une fonctionnalité de production.
