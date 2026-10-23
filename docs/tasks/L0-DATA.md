# L0-DATA — Proposition de données communes v0.1.0

Statut initial : proposition à revoir, aucune fonctionnalité de production et aucune ADR close.
Dépendances : exigences L0 disponibles ; décision finale des consommateurs ADR-01/02 ouverte.
Auteur : agent développeur L0-DATA. Modèle demandé : GPT-6.1 Sol/high ; identité effective non exposée par un outil de vérification.
Isolation : branche codex/l0-data-contract ; worktree C:/Users/Leo14/.codex/worktrees/l0-data-contract/Calovibe ; base origin/develop 5a11d51812ad447023cdbdc4bb51e1e30a9cffaa.
Propriété exclusive : contracts/data.schema.json, contracts/examples/*, tests/contracts-data.test.cjs, docs/contracts/DATA.md et cette fiche. Aucun consommateur métier existant ; aucun fichier partagé modifié.

## Critères et stratégie avant code

| Critère | Nominal / erreur / limites | Vérification prévue |
|---|---|---|
| Contrat standard versionné et fermé | Draft 2020-12 ; références résolues ; champ inattendu refusé | compilation avec validateur conforme, sans validateur maison |
| Décimaux distincts des nombres binaires | chaînes jusqu'à 3 décimales ; quantité strictement positive ≤ 1000000 ; null distinct de zéro | exemples valides/invalides et tables de bornes |
| Dates et identifiants explicites | 2028-02-29 accepté, 2026-02-29 refusé ; UTC ; UUID et version positive | formats en assertion et tests de limites calendaires |
| Contexte et historique préservables | instantané, journée/repas, provenance ; objectifs datés et origine ; opération et version attendue | exemples structurés, champs obligatoires et unions |
| Erreurs partagées | catégories distinctes, champs manquants structurés, opération optionnellement inconnue | chaque catégorie et exemples incomplets refusés |
| Calcul défini sans code métier | précision exacte, somme avant arrondi, 200 × 150 / 100 = 300 ; aucune conversion g/ml implicite | revue documentaire, exemples de contrat ; calculateur différé |
| Limites des garanties explicites | schéma ne prouve ni atomicité, concurrence, idempotence, annulation ni conservation | documentation ; recommandations non ratifiées identifiées |

Commandes prévues : node --check tests/contracts-data.test.cjs ; node --test tests/contracts-data.test.cjs ; npm run check ; npm run test:browser si dépendances disponibles. Aucun endpoint/UI/transport exposé par cette proposition : E2E API/MCP/base et rendu UI non applicables à faire examiner indépendamment. Les tests navigateur actuels restent ceux des maquettes.

Besoin partagé remonté au coordinateur : validateur Ajv Draft 2020-12 et ajv-formats verrouillés ; ajout du test aux suites permanentes hors propriété de cette tâche. Aucun ajout de dépendance local au contrat.

## Livraison et revues

À renseigner après exécution : commit candidat, PR develop, commandes/résultats, limites et liens CI. Les verdicts indépendants seront conservés sur la PR au SHA exact ; aucune auto-approbation.

Extension de propriété accordée par le coordinateur avant modification : package.json,
package-lock.json et scripts/check.cjs, exclusivement pour Ajv/ajv-formats verrouillés et
le raccordement permanent de la suite de contrat. CI non modifiée : elle appelle check.

## Résultats locaux avant candidature

Le 23 octobre 2026, Node v26.2.0. Commandes réellement exécutées :

- `npm install --save-dev --save-exact ajv@8.17.1 ajv-formats@3.0.1 --ignore-scripts` : installation réussie, audit 1 avis modéré Ajv ; option vulnérable $data non activée. Vérification advisory officielle puis `npm install --save-dev --save-exact ajv@8.20.0 --ignore-scripts` : 0 avis.
- `node --check tests/contracts-data.test.cjs` : réussi ; `node --test tests/contracts-data.test.cjs` : 38/38 réussis lors du premier contrôle ciblé.
- `npm ci --ignore-scripts` : réussi avec les versions verrouillées finales, 0 avis.
- `npm test` et `npm run check` après correction ci-dessous : 67/67 réussis, dont 38 tests de contrat et 29 existants ; aucune désactivation.
- `npm run test:browser` : réussi, parcours existants 320–1024 px, deux thèmes et clavier compris dans le contrôle des maquettes. Aucun nouveau rendu produit.
- `npm audit` final : 0 vulnérabilité connue.

Critères couverts : schéma standard compilé strictement, formats calendaires réels, bornes/précision, inconnu/zéro, instantané/contexte, versions/UUID, objectifs datés et origine, métadonnées create/update/delete/undo mult cible, erreurs par catégorie et ambiguïté structurée. Calcul et arrondis spécifiés documentairement, sans prétendre tester un service inexistant.
Limites : proposition non ratifiée ; aucun stockage, calcul métier, transport, authentification ou E2E de production ; aucune mesure de couverture applicative. La non-applicabilité UI doit être revue indépendamment. La portée/durée d'idempotence et d'annulation restent à ratifier ; les cas de même date d'effet d'objectifs restent au contrat final. Les versions des cibles sont représentées, pas comparées à une base.

La PR doit viser develop. Les preuves de commit/CI/revues sont conservées dans la PR au SHA exact après commit afin de ne pas invalider les approbations par un ajout documentaire.

Contrôle intermédiaire effectivement en échec : ajout de minItems au cas MISSING_INFORMATION sans type array dans la sous-branche ; le mode strict Ajv a bloqué npm test/check. Correction : type array explicite, mode strict conservé ; le test de compilation et le cas fields vide protègent cette régression. Suite complète relancée avant candidature.

## Actualisation après intégration de la coordination

Extension attribuée par le coordinateur : README.md et docs/DEVELOPPEMENT-AUTONOME.md,
uniquement pour les instructions appelantes de check et le périmètre des tests.
Critères avant modification : documenter npm ci --ignore-scripts avant check, Ajv et
ajv-formats verrouillés, six scripts contrôlés et 67 tests dont 38 contrats ; ne pas
présenter les contrôles du cadre/maquettes/proposition comme une preuve de production.
Nominal : installation verrouillée puis suite complète ; erreur : aucune dépendance
implicite ou ancien nombre de scripts annoncé ; limite : aucun canal métier nouveau.
Vérification : lecture croisée des scripts/package et des deux documents, puis npm test,
npm run check, npm run test:browser et npm audit sur la candidate committée ; résultats
et nouveau SHA dans la PR, nouvelles revues indépendantes requises.

origin/develop db7c222f87db4321eeb1fb24e6de8ac4acac49bf fusionnée dans la branche de tâche
sans rebase, sans conflit et sans modification du registre de coordination. Les preuves
ci-dessus concernent la candidate initiale ; elles ne valent pas approbation du nouveau SHA.

## Actualisation après CI-L0DATA-APT-01 — 23 octobre 2026

origin/develop 7b9e9788b8248e78ae2d5b1699f4d109cca716b7 est fusionné sans rebase.
Avant résolution : critères = conserver les suites DATA (38), cadre/prototypes (29),
miroir CI (8), ainsi que les vérifications de syntaxe de leurs scripts et tests.
Nominal : npm ci --ignore-scripts puis npm test/check (75 attendus), navigateur et audit.
Erreur/limite : les deux conflits check/documentation ne doivent supprimer aucune suite ;
aucun nouveau schéma métier. Vérifier le workflow identique à develop, notamment miroir,
with-deps, timeout et captures. README et cadre décrivent les suites sans compte global
susceptible de périmer ; les comptes exacts restent dans les preuves datées de la PR.
Les deux tentatives CI PR4 arrêtées pendant APT avant le navigateur ne valent pas validation
navigateur. Le correctif miroir a été revu et intégré séparément ; la CI réelle du nouveau
SHA reste nécessaire. Anciennes revues invalides, nouvelles revues indépendantes requises.
Les commandes finales seront exécutées après commit et leurs résultats publiés dans PR4.
