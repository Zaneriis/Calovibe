# Instructions des agents — Calovibe

## Références

Lire `docs/CAHIER-DES-CHARGES.md` et `docs/BACKLOG.md` avant toute implémentation. Les décisions validées de ces fichiers et les instructions humaines en session font autorité. Les maquettes sont des références de comportement et de design, pas du code de production à recopier.

## Périmètre et ordre

- Travailler sur une tâche identifiée et respecter ses dépendances.
- Avant le code, rendre ses critères d’acceptation et sa stratégie de vérification explicites.
- Ne pas transformer une décision ouverte en exigence validée. Préparer une recommandation concrète ; remonter les seuls choix réellement nécessaires.
- Réutiliser les composants et règles métier partagés. Ne pas multiplier services ou abstractions sans bénéfice démontré.
- Garder chaque service dans son dossier (`backend/`, `web/`, `mcp/`), avec documentation propre et build indépendant. La documentation transversale reste dans `docs/` ; les contrats communs ont une seule source dans `shared/contracts/`. Ne pas imposer le build d’un autre service pour construire le service concerné.
- Pas d’agent conversationnel dans l’application : Hermès porte ce rôle. Le fournisseur photo reste une intégration distincte.

## Vérification

- Chaque fonctionnalité possède des tests de bout en bout sur les canaux qu’elle expose et les tests unitaires/intégration adaptés à ses risques.
- Chaque défaut corrigé reçoit un test de non-régression qui le reproduit. Toute exception est motivée et revue indépendamment.
- Couverture indicative : 70 %, non bloquante. Couvrir davantage lorsque cela protège un comportement utile ; expliquer les limites disproportionnées. Les comportements critiques restent à vérifier.
- Avant intégration, faire passer toute la suite requise. Ne jamais supprimer, ignorer ou affaiblir un contrôle pour faire passer une tâche.
- Vérifier les changements UI dans une interface rendue, dans les deux thèmes, sur petit/grand écran et au clavier. Tester date/repas d’origine, brouillons, erreurs et annulation.
- Ne pas déclarer exécuté un test non lancé. Signaler toute limite de vérification.

## Revues et autonomie

- Le coordinateur découpe, attribue les périmètres et contrats, suit les preuves et intègre. Le propriétaire autorise explicitement la délégation à plusieurs agents développeurs et à des réviseurs indépendants selon [ORCHESTRATION.md](docs/ORCHESTRATION.md).
- Lancer un développeur par tâche prête et réellement indépendante, dans la limite des capacités d’agents et ressources disponibles ; aucun plafond fixé à deux développeurs. Chaque développeur possède sa branche, son worktree et sa pull request vers `develop`.
- Réserver ou libérer de la capacité pour les revues ; plusieurs PR avancent en parallèle, les intégrations restent séquentielles sous la responsabilité du coordinateur. Aucun développeur n’intègre lui-même sa PR.
- Modèles : profil Équilibré choisi par le propriétaire, selon [MODELES-AGENTS.md](docs/MODELES-AGENTS.md) : Sol pour coordination/développement/revues, Luna pour les tâches simples, Astra pour un blocage difficile. Vérifier les capacités réelles, consigner le choix effectif, ne pas acheter de crédits ni activer un dépassement payant.

- Les revues fonctionnelle, UI/UX et qualité des tests sont distinctes ; le développeur n’auto-approuve pas son travail.
- Chaque retour bloquant doit citer une exigence, un risque concret ou une référence, avec preuve et résultat attendu.
- Les suggestions restent non bloquantes. Aucun score global ne compense un échec requis.
- Les approbations portent sur le commit exact. Modifier les règles de validation exige leur revue indépendante.
- Après trois cycles infructueux sur le même blocage, fournir un diagnostic et arrêter l’intégration sans assouplir les exigences.

## Git — règle impérative

- **Ne jamais fusionner vers `master`, ni y pousser un commit**, directement ou indirectement. Cette branche est figée ; ne pas la réécrire, supprimer, renommer ou utiliser comme cible d’une pull request ou d’un déploiement.
- `develop` est la branche d’intégration et la branche par défaut. Créer les branches de tâche depuis `develop` ; toutes les pull requests ciblent `develop`.
- Avant toute intégration vers `develop`, vérifier la cible, la suite complète réussie et les revues indépendantes applicables sur le commit exact. Tout blocage interdit l’intégration. Avancer `develop` uniquement en fast-forward vers ce commit approuvé, sans squash ni rebase qui changerait son SHA.
- Le dépôt reste privé et fonctionne sans GitHub Pro ni protection de branche. Décision explicite du propriétaire du 23 octobre 2026 : cette discipline remplace l’exigence précédente de protection par la plateforme, pas les tests ni les revues. Elle ne constitue pas un verrou technique GitHub.
- Ne jamais utiliser l’absence de protection pour contourner ces règles. Ne pas modifier cette politique de sa propre initiative ; toute évolution exige une instruction humaine explicite et une revue indépendante.

## Données et livraison

- Conserver les données existantes. Séparer brouillons et écritures confirmées.
- Prévenir les doublons et écrasements concurrents ; une annulation vise l’opération concernée.
- Ne jamais exposer secrets ou données personnelles dans les journaux, images conteneur ou dépôt.
- Tous les services hébergés, front compris, sont conteneurisés.
- Le déploiement en production est automatique une fois les contrôles et revues réussis. Ne pas demander une approbation routinière à chaque livraison.
- Une opération destructive sur les données, une dépense non décidée ou un changement d’exposition administrative exige un traitement explicite ; ne pas l’inférer de l’autorisation de déployer.

## Compte rendu de tâche

Indiquer : ID, résultat livré, commit/version, commandes réellement exécutées et résultats, critères couverts, limites et décisions restantes. Une maquette ou un test isolé ne prouve pas une fonctionnalité de production.
