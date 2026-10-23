# Calovibe — Cahier des charges pour agents de développement

## Statut et décisions

Version 1.0 — 22 octobre 2026. Document destiné à des agents qui réalisent le projet sans intervention humaine dans le code. La présente version formalise les décisions prises avec le propriétaire ; elle ne signifie pas que l’application est déjà implémentée.

Termes : **DOIT** = exigence de livraison ; **DEVRAIT** = recommandation dont une exception doit être motivée ; **À DÉCIDER** = choix non encore arrêté. Les propositions techniques ne doivent pas être présentées comme des décisions utilisateur.

Décisions validées :

- Application personnelle de suivi alimentaire ; première interface web responsive, API commune et serveur MCP pour Hermès. Une application mobile dédiée peut ensuite consommer l’API.
- Petit-déjeuner, déjeuner, dîner et collation ; calories, protéines, lipides, glucides ; eau, poids et objectifs.
- Ajouts manuels, plats enregistrés, codes-barres et photos, combinables dans le même repas.
- Voix et compréhension conversationnelle assurées par les clients, notamment Hermès. Le projet ne comporte pas d’agent conversationnel interne. Une API de modèle externe peut analyser les photos.
- Serveur Ubuntu personnel avec Docker installé. Administration SSH depuis le PC fixe sur le réseau local. Web et API accessibles depuis Internet.
- Tous les services hébergés sont conteneurisés, front-end inclus. Production déployée automatiquement après validation.
- Thèmes clair et sombre ; design commun adapté au téléphone, à la tablette et à l’ordinateur.
- Toute entrée enregistrée doit être corrigeable et supprimable. Les opérations doivent pouvoir être annulées selon les règles définies plus bas.

Le détail des tâches, leurs dépendances et leurs preuves de réalisation figurent dans [BACKLOG.md](BACKLOG.md). Les règles de travail des agents figurent dans [AGENTS.md](../AGENTS.md).

## Périmètre fonctionnel

### F01 — Journal et bilan quotidien

Afficher une date sélectionnée, les quatre repas et leurs entrées, les sous-totaux de repas, les totaux du jour, les objectifs et les écarts. Naviguer librement dans les journées et compléter une journée passée. Les jours sans données affichent un état vide explicite.

Un repas est un conteneur journalisé pour une date et une catégorie. Un aliment contient des données nutritionnelles. Un plat enregistré est un aliment composé ou une préparation réutilisable ; il n’est pas le repas du journal.

Chaque entrée DOIT pouvoir être ajoutée, consultée, corrigée en quantité, déplacée vers un autre repas ou une autre date, et supprimée. Un plat journalisé doit avoir les mêmes possibilités de modification de portion et de suppression qu’un aliment.

### F02 — Aliments et ajout manuel

Rechercher un aliment dans les sources retenues ou créer un aliment personnel en renseignant son nom, sa base de référence et ses valeurs nutritionnelles. Renseigner une quantité consommée et prévisualiser ses apports avant enregistrement. Distinguer valeurs inconnues et zéro explicitement renseigné.

### F03 — Plats enregistrés et bibliothèque

Deux modes obligatoires :

1. Ingrédients avec quantités et définition du nombre de portions ou du poids final utilisable pour calculer la portion consommée.
2. Saisie directe des valeurs nutritionnelles du plat, avec base de référence clairement définie.

Ajouter une portion au repas sélectionné, puis pouvoir modifier sa quantité dans le journal. Modifier ultérieurement la fiche du plat ne change jamais les anciennes entrées journalisées. Les écrans de bibliothèque et de création de plat restent à détailler avant leur implémentation.

### F04 — Code-barres

Scanner un produit, vérifier les données trouvées, saisir la quantité consommée, prévisualiser puis confirmer. Prévoir saisie du code, produit inconnu, données incomplètes, permissions caméra refusées et erreur du fournisseur. Un produit inconnu doit permettre de poursuivre par une création manuelle sans perdre le repas ni la date.

### F05 — Photo

Importer une image ou utiliser la caméra si le client le permet. L’analyse propose un ou plusieurs aliments, des quantités et des apports estimés. Avant confirmation, permettre de modifier les quantités et les informations nutritionnelles, retirer un élément et ajouter un élément oublié.

L’analyse ne modifie pas le journal. Seule la confirmation enregistre les éléments, ensemble, dans le repas sélectionné. Une analyse échouée ou une confirmation répétée ne doit produire ni ajout partiel ni doublon.

Un changement de nom ne doit pas faire passer les anciennes valeurs nutritionnelles pour des valeurs nouvellement vérifiées. Un changement d’identité exige une nouvelle correspondance alimentaire ou une vérification explicite des valeurs. Une donnée absente ne doit pas devenir silencieusement zéro.

### F06 — Hydratation

Afficher consommation et objectif quotidiens. Raccourcis validés : **250 ml, 500 ml, 1 litre et autre quantité**. Icônes verre et bouteille sur les raccourcis appropriés. Saisie libre via fenêtre dédiée ; crayon pour modifier l’objectif. Chaque ajout est une opération corrigeable, supprimable et annulable. Les données de journées distinctes sont isolées.

### F07 — Poids et objectifs

Enregistrer les pesées datées et consulter leur évolution. Définir et modifier les objectifs de calories, macros et hydratation. Conserver leur date de prise d’effet et l’historique nécessaire aux anciennes journées.

Les objectifs manuels fonctionnent sans profil physiologique complet. Une proposition calculée est une étape distincte, explicable et modifiable avant application. Aucun changement automatique des objectifs à chaque pesée.

### F08 — Accès par Hermès/MCP

Hermès dispose déjà de la transcription et de l’agent conversationnel. Le MCP expose les fonctions métier, sans reconstruire un agent à l’intérieur de Calovibe. Les capacités de consultation et d’écriture doivent rester cohérentes avec l’API et le web.

Les ambiguïtés sont remontées comme des informations manquantes structurées ; un outil ne doit pas choisir silencieusement une portion, un aliment ou un repas incertain.

## Règles métier et données

### Calculs et unités

- Le serveur calcule les totaux ; les interfaces peuvent prévisualiser, mais ne définissent pas des règles divergentes.
- Pour une base de 100 g : apport de portion = valeur de référence × grammes / 100. Même principe pour une base en ml ou par portion explicitement définie.
- Aucune conversion g ↔ ml sans donnée de densité ou équivalence propre au produit. Aucune conversion cru ↔ cuit implicite.
- Quantités strictement positives ; bornes, précision et arrondis doivent être définis dans le contrat avant implémentation. Éviter les flottants binaires comme seule représentation persistante des quantités.
- Calculer avec la précision interne définie, puis arrondir à l’affichage. Ne pas sommer des valeurs déjà arrondies par l’interface.
- Les calories d’une source alimentaire sont conservées ; elles ne doivent pas être remplacées automatiquement par 4P + 9L + 4G. Cette formule peut servir à répartir un objectif de macros, pas à écraser une étiquette.
- Distinguer `inconnu` de `0`. Un bilan contenant des données incomplètes ne doit pas être présenté comme un total complet.
- Lorsque la consommation dépasse l’objectif, afficher un dépassement explicite ; ne pas masquer l’écart derrière « restant : 0 ».

### Journalisation, historique et annulation

Une entrée conserve un instantané des valeurs utilisées, sa quantité et unité, sa date locale, son repas et sa provenance interne. Les informations de provenance ne nécessitent pas de tags dans les lignes de l’accueil.

Les dates du journal sont explicites et interprétées dans le fuseau du profil, initialement Europe/Paris. Les horodatages techniques sont stockés sans ambiguïté. Les changements de jour et d’heure doivent être testés.

Toute écriture reçoit un identifiant d’opération pour empêcher les doublons lors des nouvelles tentatives. Un numéro de version ou mécanisme équivalent empêche l’écrasement silencieux d’une modification concurrente.

L’annulation cible une opération identifiée, pas « les N dernières lignes ». Elle ne doit pas supprimer ou restaurer des changements indépendants réalisés depuis. En cas de conflit, retourner une erreur explicite sans écrasement. L’annulation d’un lot photo porte sur les entrées de ce lot. La durée de disponibilité et la portée exacte des opérations annulables doivent être documentées dans le contrat.

### Modèle conceptuel minimal

| Entité | Informations essentielles |
|---|---|
| Profil | Fuseau et données physiologiques nécessaires au calcul choisi |
| Objectifs | Valeurs, date d’effet, origine manuelle/calculée, version de formule |
| Aliment | Nom, base de référence, unités possibles, valeurs et source |
| Plat enregistré | Mode ingrédients/direct, composition ou valeurs, portions/poids final, version |
| Entrée de journal | ID, journée, repas, quantité, unité, instantané nutritionnel, version |
| Ajout d’eau | ID, journée, quantité, version |
| Pesée | ID, date/heure, valeur, unité |
| Proposition photo | ID, statut, éléments provisoires, corrections, référence au traitement |
| Opération | ID, auteur/client, idempotence, cibles et informations d’annulation |

Le schéma concret peut regrouper certaines entités ; il doit préserver ces propriétés.

### Proposition d’objectifs nutritionnels

Méthode de départ retenue pour la spécification : estimation du métabolisme de repos par Mifflin–St Jeor, puis coefficient d’activité documenté tenant compte du quotidien et de l’entraînement. Ne pas compter deux fois une séance déjà incluse.

Pour un profil adulte pratiquant la musculation, les paramètres de départ discutés sont : sèche à maintien estimé moins 15 %, recomposition au maintien estimé, protéines à 2 g/kg/jour, lipides à 30 % des calories et glucides avec le reste. Ce sont des valeurs initiales modifiables et des estimations, pas une garantie de résultat ni des recommandations universelles.

Avant livraison du calculateur, la tâche dédiée DOIT documenter l’équation exacte, les coefficients d’activité, les populations et limites d’usage, les garde-fous et les cas incompatibles. Ces choix doivent s’appuyer sur les sources en fin de document. La formule ne nécessite pas de modèle IA. Aucun calcul de « masse grasse perdue » à partir du seul poids ; aucune promesse de date exacte de perte de gras.

## Contrats des interfaces

L’API métier est le point commun du web, du MCP et d’un éventuel mobile. Le MCP appelle l’API ; il n’accède pas directement aux tables et ne réimplémente pas les règles.

Contrat recommandé : API REST documentée avec OpenAPI, validation des entrées, erreurs structurées et versionnement compatible. Les noms définitifs sont fixés au lot L0. Capacités minimales :

| Domaine | Opérations |
|---|---|
| Journal | Lire une journée ; créer, corriger, déplacer et supprimer une entrée |
| Bibliothèque | Rechercher/créer/corriger aliments et plats ; calculer une portion |
| Eau | Lire, ajouter, corriger, supprimer |
| Poids/objectifs | Lire et modifier les données datées |
| Photos | Soumettre, consulter un statut/proposition, corriger et confirmer |
| Opérations | Consulter le résultat d’une écriture et demander son annulation |

Les outils MCP exposent les mêmes capacités pertinentes avec paramètres typés et résultats structurés. Les mutations incluent date, repas, quantité et unité explicites lorsqu’applicables. La matrice tâche/canal dans le backlog fait autorité sur les capacités à livrer à chaque étape.

Les erreurs distinguent au minimum : authentification, autorisation, validation, introuvable, conflit de version, donnée incomplète et dépendance indisponible. Les exemples de contrats doivent inclure ces réponses.

## Architecture et exploitation

### Découpage

- Front-end web responsive servi depuis un conteneur.
- API métier modulaire dans un conteneur.
- Serveur MCP dans un conteneur.
- PostgreSQL proposé pour les données structurées, avec volume persistant.
- Reverse proxy pour l’accès HTTPS ; stockage des fichiers si leur conservation est retenue.

L’analyse photo commence comme module isolé de l’API, avec traitement différé si nécessaire. Extraire un processus séparé seulement si cela apporte un bénéfice démontré. Ne pas découper eau, poids et repas en services indépendants sans besoin documenté. Un dépôt unique et Docker Compose sont recommandés pour ce serveur personnel.

Les frameworks, versions, fournisseurs et détails d’authentification sont **À DÉCIDER au lot L0**, avant d’écrire les composants concernés. Le choix d’une bibliothèque ne doit pas être inféré des technologies utilisées pour les maquettes.

### Accès et données

Même pour un usage personnel, les interfaces exposées à Internet exigent authentification, autorisation et HTTPS. Les autorisations du MCP doivent être compatibles avec Hermès. Les secrets sont injectés à l’exécution et absents des images, des journaux et du dépôt.

Les données applicatives restent sur le serveur personnel. Pour les photos, l’utilisateur accepte un fournisseur externe à choisir ensemble. Limiter les données envoyées à ce qui est utile à l’analyse. La durée de conservation des images reste à décider.

### Déploiement automatique

1. Push et contrôles automatiques.
2. Version candidate exacte identifiée par commit, tests réussis et revues requises.
3. Construction des images versionnées.
4. Déploiement automatique par un exécutant joignant le serveur sur le réseau local ; ne pas dépendre du PC fixe allumé et ne pas exposer SSH sur Internet pour contourner cette contrainte.
5. Vérification de santé et d’un parcours minimal après déploiement.
6. Retour à une version compatible en cas d’échec, avec diagnostic.

Ne jamais déployer deux livraisons concurrentes. Les données et sauvegardes survivent au remplacement des conteneurs. Les migrations doivent être testées et compatibles avec la stratégie de retour ; redéployer une ancienne image ne constitue pas une restauration de base.

L’automatisation de production est autorisée. Cela n’autorise pas à effacer les données, exposer de nouveaux ports d’administration ou engager des dépenses non décidées. Ces situations exceptionnelles doivent être remontées explicitement.

## Références UI et UX

### Références locales

- [Accueil](../mockups/calovibe-accueil.html).
- [Ajout manuel et parcours combinés](../mockups/calovibe-ajout.html).
- [Analyse photo et correction des propositions](../mockups/calovibe-photo.html).

Chaque référence contient les variantes ordinateur/téléphone et clair/sombre. Les captures dans `mockups/checks/` sont des preuves de contrôle, pas une autorisation de changer le design. La direction générale est validée ; les derniers ajustements issus de la revue ont été appliqués. Les écrans code-barres, bibliothèque/plats, poids, objectifs et paramètres restent à détailler avant leur réalisation.

Les maquettes sont des prototypes avec jeux de données et analyse photo simulée. Leur code n’est pas une architecture de production. Certains menus restent des représentations de parcours à construire.

### Règles visuelles

- Fond clair chaud ou anthracite, cartes opaques, accent indigo/lavande, angles arrondis et typographie hiérarchisée.
- Icônes cohérentes pour calories, protéines, lipides et glucides ; garder les mots et les valeurs, sans signification transmise par la couleur seule.
- Valeur, flamme et kcal utilisent un même composant aligné. Les unités des champs de quantité sont à l’intérieur du contrôle, sans suffixe flottant isolé.
- Pas de tags « manuel » ou « photo, estimation validée » sur les lignes de l’accueil. L’état estimé reste explicite pendant la validation photo.
- Listes d’aliments compactes. Sur mobile : icône, nom, quantité et calories sur une ligne lorsque l’espace le permet ; réorganiser pour les petits écrans, grands caractères ou noms longs plutôt que tronquer les actions.
- Cliquer une ligne ouvre ses détails ; les champs et boutons gardent leur action. Le nom possède aussi une commande accessible au clavier avec état ouvert/fermé.
- Correction et suppression présentes pour aliments et plats ; sur les lignes photo mobiles, suppression dans les détails.
- Cibles tactiles confortables, focus visible, contraste contrôlé et utilisation sans survol obligatoire. Honorer la réduction des animations.

### Règles de parcours

- Conserver date, repas, origine, recherche et brouillon pendant les transitions.
- Retour suit l’origine : modifier depuis l’accueil revient au même contexte de journal ; choisir un nouvel aliment revient à la recherche ; quitter la portion d’un aliment créé restaure son formulaire.
- Retour ne confirme jamais une modification. Les modifications de journal exigent une action d’enregistrement explicite.
- Fermer une proposition photo sans confirmer ne l’enregistre pas ; permettre sa reprise pour la même date et le même repas.
- Une confirmation revient à l’accueil, au repas concerné, sans perdre le contexte. Le prochain ajout peut utiliser une autre méthode.
- Les contrôles de dates restent utilisables sur mobile. Les journées sont indépendantes, y compris pour l’eau.
- Distinguer chargement, résultat vide, erreur et réussite. Un bouton désactivé doit avoir une raison compréhensible à proximité.
- Pas de bouton Ajouter général doublonnant ceux des repas.

### États à spécifier pour chaque écran

État nominal ; vide ; chargement ; erreur de validation ; échec d’une dépendance ; données longues ; grands nombres ; dépassement ; focus/clavier ; confirmation et annulation lorsque pertinentes. Les scénarios non applicables sont identifiés et justifiés.

## Validation et livraison

### Definition of Done commune

Une tâche est terminée uniquement si :

1. Ses critères d’acceptation sont vérifiés et reliés à des preuves.
2. Les tests unitaires pertinents et les intégrations traversées sont couverts.
3. Chaque fonctionnalité dispose d’au moins un scénario de bout en bout, et de variantes d’erreur/limites selon sa matrice de risques. Tester les canaux qu’elle expose.
4. Tous les tests requis passent ; aucun test requis n’est désactivé pour contourner un échec.
5. Compilation, types, analyse statique et contrats passent selon la configuration du lot L0.
6. La revue indépendante applicable n’a aucun défaut bloquant ouvert.
7. Les documents, contrats et migrations concernés sont à jour.
8. Le compte rendu fournit commit exact, commandes réellement exécutées, résultats et limites.

### Couverture et non-régression

70 % est un repère de couverture, pas un seuil bloquant. Couvrir autant de comportements utiles que raisonnablement possible. Une difficulté disproportionnée peut justifier une exception documentée ; si elle concerne un comportement critique, une revue doit examiner une autre stratégie de test ou une simplification.

Restent obligatoires : vérification des critères d’acceptation, calculs nutritionnels critiques, persistance, droits d’accès, prévention des doublons et non-régression des défauts corrigés. Un pourcentage ne remplace pas des assertions pertinentes.

Chaque défaut corrigé reçoit un test automatisé qui échoue sur le défaut et réussit après correction, au niveau pertinent. Si cela est techniquement impossible, expliquer et faire examiner l’exception ; le développeur ne la décide pas seul.

Les tests des fonctionnalités livrées restent dans la suite permanente. Avant intégration à la branche principale, toute la suite requise passe. Les tests des fournisseurs externes utilisent des réponses contrôlées pour la répétabilité ; un contrôle distinct vérifie l’intégration réelle, sans prétendre à une estimation photo parfaitement déterministe.

### Contrôles et revues par agents

Chaque push déclenche les contrôles rapides et les suites concernées. Chaque version candidate à intégrer exécute la suite complète requise. Le choix des suites concernées ne doit pas permettre de contourner une dépendance partagée ou les contrôles de CI.

Trois responsabilités distinctes :

- Revue fonctionnelle : exigences, erreurs, contexte et effets sur les données.
- Revue design/UX : interface rendue, références, états, responsive et accessibilité ; requise pour les changements d’interface.
- Revue des tests : assertions, cas limites, non-régression et contournements éventuels.

Les revues sont indépendantes du développeur et attachées au commit exact. Chaque défaut bloquant cite exigence/règle/risque, preuve reproductible et résultat attendu. Une préférence esthétique supplémentaire est une suggestion, pas un blocage.

Toute modification invalide les approbations concernées. Un changement des tests, seuils ou workflows exige une revue de ces contrôles. La branche principale est protégée par la plateforme ; l’agent ne peut pas s’auto-approuver ou contourner la protection.

Pas de score global compensatoire. Utiliser des barrières indépendantes. Après trois cycles de corrections sur un même désaccord bloquant, produire un diagnostic et arrêter l’intégration ; ne pas affaiblir la règle ni tourner indéfiniment.

### Preuves actuelles des maquettes

`mockups/tests/navigation.test.cjs` vérifie des règles de navigation, de dates et de complétude nutritionnelle. `mockups/tests/browser-check.cjs` exerce des parcours dans un navigateur, les deux thèmes et plusieurs largeurs. Ces vérifications concernent les prototypes ; elles ne constituent pas les tests de l’API, de la base, du MCP ou du déploiement futurs.

## Sources et décisions ouvertes

Références scientifiques utilisées pour le choix initial, avec leurs populations et limites à relire dans la tâche calculateur :

- [Mifflin et collaborateurs, 1990](https://pubmed.ncbi.nlm.nih.gov/2305711/) — équation de dépense au repos.
- [Validation chez des adultes en surpoids ou obèses](https://ajcn.nutrition.org/article/S0002-9165%2823%2923309-2/fulltext).
- [Comparaison des équations chez les sportifs, 2023](https://pubmed.ncbi.nlm.nih.gov/37632665/).
- [FAO — besoins énergétiques et activité](https://www.fao.org/4/y5686e/y5686e07.htm).
- [Morton et collaborateurs, 2018](https://bjsm.bmj.com/content/early/2018/01/18/bjsports-2017-097608?versioned=true) — protéines et entraînement en résistance.
- [Garthe et collaborateurs, 2011](https://pubmed.ncbi.nlm.nih.gov/21558571/) — vitesse de perte de poids chez des athlètes.
- [Helms et collaborateurs, 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4033492/) — contexte de préparation au bodybuilding.

Références de design : [Material 3 Expressive](https://design.google/library/expressive-material-design-google-research) et les maquettes locales. Le protocole et l’autorisation MCP doivent être vérifiés sur la [spécification officielle](https://modelcontextprotocol.io/) au moment du lot L0.

| ID | Décision ouverte | Échéance |
|---|---|---|
| ADR-01 | Frameworks et versions, organisation du dépôt, dépendances et commandes de contrôle | L0 |
| ADR-02 | Authentification personnelle, clients API et autorisation MCP compatible Hermès | L0 |
| ADR-03 | Domaine, reverse proxy, TLS, exécutant CI local, ressources et architecture CPU du serveur | L0/L1 |
| ADR-04 | Source alimentaire, couverture, identifiants produits, quotas et stratégie de mise à jour | Avant recherche externe/code-barres |
| ADR-05 | Fournisseur photo, modèle, coût autorisé, format de réponse et conservation des images | Avant intégration photo ; fournisseur à choisir avec le propriétaire |
| ADR-06 | Équation exacte, activité, limites et garde-fous du calculateur d’objectifs | Avant calculateur |
| ADR-07 | Maquettes et états des écrans non encore détaillés | Avant chaque lot concerné |

Les agents peuvent préparer les comparaisons et des recommandations concrètes. Ils ne doivent pas inventer un budget, des accès, un domaine, des identifiants serveur ou une validation de fournisseur encore absents.
