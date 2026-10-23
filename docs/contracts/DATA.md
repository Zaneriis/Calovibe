# Proposition de données communes — L0-DATA v0.1.0

Statut : **proposition technique non ratifiée** pour convergence L0. Ce document ne clôt
ni ADR-01 ni ADR-02, ne livre aucun service et ne constitue pas un contrat API/MCP complet.
Les exigences humaines et le cahier des charges restent prioritaires.

## Utilisation et version

`contracts/data.schema.json` déclare JSON Schema Draft 2020-12 et l'identifiant
`urn:calovibe:contracts:data:0.1.0`. Les objets racine portent `schemaVersion: "0.1.0"`.
Un consommateur cible une définition par `$ref`, par exemple
`urn:calovibe:contracts:data:0.1.0#/$defs/quantity`, après avoir enregistré le schéma.
La racine accepte une entrée, des objectifs, une enveloppe de mutation/annulation ou
une erreur. Elle ne décrit ni URL, ni authentification, ni corps métier de requête.
Une modification incompatible implique une nouvelle version et une revue des consommateurs.

La suite utilise Ajv **8.20.0**, son export `ajv/dist/2020`, en mode strict sans coercition,
sans valeurs par défaut et sans suppression de propriétés, ainsi qu'ajv-formats **3.0.1**
en mode `full`. Les formats `date`, `date-time`, `uuid` et `json-pointer` sont des
assertions obligatoires dans tout consommateur de cette proposition. Un moteur qui les
traite uniquement comme annotations ne suffit pas. Les objets interdisent les propriétés
inconnues. Les exemples sont fictifs ; aucun identifiant personnel ou secret.

Choix de dépendances : releases officielles vérifiées le 23 octobre 2026, support de
Draft 2020-12 documenté. Le premier essai Ajv 8.17.1 a signalé
[CVE-2025-69873](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6), concernant `$data`.
Cette option n'est pas activée ; 8.20.0 a néanmoins été retenu pour éviter la version
affectée. Les versions existantes Playwright/Lucide sont conservées. `npm audit` donne
un état daté des avis connus, pas une garantie de sécurité.

## Formes et règles proposées

| Définition | Représentation et sens |
|---|---|
| `decimal` | Chaîne non négative en base dix, de zéro à trois décimales ; sans signe, exposant, espace, virgule ou zéro initial superflu. `"0"`, `"0.000"` et `"1.25"` sont acceptés. Aucune borne nutritionnelle nouvelle n'est inventée. |
| `quantity` | Même représentation, strictement > 0 et ≤ 1000000 dans l'unité donnée ; `"0.001"` et `"1000000.000"` acceptés. `0`, `"0"`, `"-1"`, `""` et `"1000000.001"` refusés. |
| `nutrition` | Les quatre champs `kcal`, `proteinG`, `fatG`, `carbohydrateG` sont requis. Chaque valeur est un `decimal` ou `null` : zéro connu et inconnu restent distincts. Aucun champ absent n'est complété à zéro. |
| `reference` | Quantité et unité de la base, avec les quatre valeurs nutritionnelles pour cette base. Unités `g`, `ml`, `portion`. La portion doit être définie dans la fiche source avant usage métier. |
| `localDate` | Date réelle `YYYY-MM-DD`, années 0001–9999, avec vérification du calendrier grégorien : `2028-02-29` accepté ; `2026-02-29`, `1900-02-29`, `2100-02-29` et 31 avril refusés. |
| `utcTimestamp` | Horodatage RFC3339 normalisé en UTC : `T` et `Z` obligatoires, secondes 00–59, fraction décimale facultative. Un offset `+02:00` doit être normalisé avant stockage ; les secondes intercalaires ne sont pas représentées par cette proposition. |
| `version` | Entier positif ≤ 9007199254740991 pour rester exact dans les consommateurs JavaScript. `"1"`, 0 et 1,5 refusés. Ce compteur n'est pas une date. |
| `uuid` | UUID de forme standard ; ni génération ni unicité ne sont prouvées par le format. |
| `journalEntry` | ID/version, date explicite, repas `breakfast/lunch/dinner/snack`, quantité/unité consommées, instantané du nom et de la base nutritionnelle originale, provenance interne structurée et opération créatrice. |
| `goals` | ID/version, `effectiveDate`, origine `manual/calculated`, valeurs et opération. `formulaVersion` est null pour manuel et une chaîne versionnée pour calculé. Cette forme n'implémente ni ne valide aucune formule. |
| `mutation` | Métadonnées communes seulement : `create` sans version attendue ; `update/delete` avec au moins une cible `{id, expectedVersion}`. Le corps métier et le type d'entité restent au futur contrat API/MCP. |
| `undo` | Nouvel `operationId`, `targetOperationId` explicite et tableau des versions attendues de toutes les cibles, permettant un lot sans version unique fictive. Aucun historique d'opération implémenté. |
| `error` | `schemaVersion`, `code`, message générique, `fields` structurés et `operationId` UUID ou null si inconnu. Les chemins sont des JSON Pointers ; aucune valeur reçue n'est recopiée dans `fields`. |

Provenance : `method` décrit la méthode d'ajout (`manual`, `saved_dish`, `barcode`, `photo`),
`sourceId` est une référence interne opaque ou null et `estimated` rend une estimation
explicite. Ce n'est ni un tag imposé à l'accueil ni un identifiant fournisseur externe.
Le contrôle des références et la règle exigeant une correspondance/vérification lors d'un
changement d'identité photo appartiennent au service futur.

Les erreurs distinguent `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION`, `NOT_FOUND`,
`VERSION_CONFLICT`, `INCOMPLETE_DATA`, `DEPENDENCY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`,
`UNDO_CONFLICT`, `MISSING_INFORMATION`. Les raisons de champ sont `required`, `invalid`,
`ambiguous`, `incomplete`, `incompatible_unit`. Le transport fixera le mapping HTTP/MCP ;
le schéma ne confond pas validation et données incomplètes. Le texte des messages doit
rester générique : le schéma ne détecte pas des secrets ou des données personnelles dans
une chaîne libre et ne donne aucune autorisation de journaliser les corps.

## Calcul de portion, précision et arrondi proposés

Les décimaux d'entrée sont exacts, avec au plus trois décimales. Proposition d'arithmétique
interne : entiers multiprécision et rapports rationnels exacts jusqu'à l'affichage ; ne
pas introduire d'arrondi fixe intermédiaire, même si une division est périodique. Une
implémentation peut utiliser une bibliothèque décimale avec une stratégie équivalente
explicitement démontrée ; un flottant binaire seul n'est pas une représentation persistante.
Le choix d'implémentation reste à faire avant le calculateur métier.

Pour chaque apport connu : `apport = valeur de référence × quantité consommée / quantité de base`,
à unité identique. Ainsi **200 kcal / 100 g × 150 g = 300 kcal**. Pour une base 100 ml,
utiliser des ml ; pour une portion explicitement définie, utiliser des portions. Aucune
conversion g/ml sans densité ou équivalence propre au produit, aucune conversion cru/cuit
implicite. Une combinaison d'unités incompatible doit retourner une erreur structurée,
pas un calcul. Le schéma vérifie les unités isolément ; il ne peut démontrer une équivalence.

Additionner les apports exacts du repas/de la journée avant arrondi, sans sommer les
valeurs affichées. Arrondi proposé au demi supérieur pour les valeurs non négatives :
kcal à l'entier et macros à 0,1 g. Exemple : 1,25 g s'affiche 1,3 g ; deux valeurs exactes
de 1,24 g donnent 2,48 g, affiché 2,5 g, même si chaque ligne affiche 1,2 g. Le calculateur
à livrer devra tester ces cas ; cette tâche documente le contrat, sans faux test de calcul
métier de production. Les calories de source restent conservées, jamais remplacées par
4P + 9L + 4G. Un apport `null` rend le total concerné incomplet ; une somme connue partielle
ne doit pas être présentée comme un total complet.

## Temps, historique et opérations : limites explicites

La date du journal est fournie explicitement et interprétée dans le fuseau du profil,
initialement Europe/Paris. Le schéma n'infère jamais la journée depuis l'horloge UTC.
Les tests de formats incluent des instants aux changements d'heure, mais ne testent pas
la conversion UTC/Europe/Paris ni un passage de journée métier : ces vérifications devront
traverser le futur service, ses interfaces et la base réelle.

Un instantané reste indépendant de la fiche alimentaire : modifier la bibliothèque ne
doit pas réécrire les anciennes consommations. La quantité consommée et la base d'origine
sont conservées séparément pour recalculer. Les objectifs applicables sont ceux de la date
d'effet la plus récente ne dépassant pas la journée consultée ; leur historique doit être
conservé. Le schéma ne prouve ni cette sélection ni l'immutabilité ni l'absence de doublons.
Les cas d'objectifs ayant la même date d'effet devront être réglés dans le contrat métier.

Idempotence **proposée, non ratifiée** : portée utilisateur + client + opération ; même
UUID et même requête canonique = résultat d'origine, même UUID et corps différent = conflit.
Ne pas comparer des JSON sérialisés naïvement (l'ordre des clés ne définit pas une nouvelle
opération). Recommandation de conservation : garder les opérations tant que les données
ciblées existent. Cette durée et la portée exacte restent à ratifier avant contrat final.

Annulation **proposée, non ratifiée** : viser l'opération identifiée et toutes ses cibles,
vérifier leurs versions et inverser atomiquement ; refuser sans écrasement si un changement
ultérieur empêche l'inversion. Une annulation de lot photo ne touche que ce lot, jamais
les écritures indépendantes. Recommandation : même fenêtre de conservation, sans conflit ;
aucun nombre de jours arbitraire validé. L'identité de l'acteur et les droits relèvent du
contrat d'authentification, pas de ces métadonnées.

À vérifier au service : unicité des ID de cible (JSON Schema `uniqueItems` rejette seulement
les objets identiques, pas deux versions du même ID), existence/appartenance des références,
comparaison des versions, transactions, reprises concurrentes et rétention. Le schéma ne
rend ni un lot atomique ni un historique durable. Ces garanties exigent tests d'intégration
sur base réelle et E2E API/web/MCP, absents tant que les services ne sont pas livrés.

Sont différés : profils physiologiques, modèle complet aliments/plats/eau/pesées/photo,
stockage SQL et migrations, résultats d'opérations et payloads API/MCP. Les définitions
communes sont réutilisables par ces contrats à venir, sans prétendre couvrir L0 entier.
Les limites de taille des messages/chaînes, les noms blancs et autres validations d'entrée
contextuelles seront fixés aux frontières de transport avant exposition ; ce schéma local
n'est pas à exposer seul comme garde de sécurité publique.

## Vérification reproductible et sources

Après `npm ci --ignore-scripts` sur Node 26.2.0 :

```text
node --check tests/contracts-data.test.cjs
node --test tests/contracts-data.test.cjs
npm test
npm run check
npm run test:browser
npm audit
```

Les deux fichiers `contracts/examples/valid.json` et `invalid.json` associent définition
et valeur ; les tests les valident avec Ajv, compilent toutes les définitions, exercent les
bornes et les champs obligatoires. `npm test` et `check` incluent le contrat en permanence ;
la CI existante appelle `check`, sans filtre ajouté. Les tests navigateur restent ceux des
maquettes. Aucun canal applicatif nouveau ou rendu UI n'est livré : la non-applicabilité
de nouvelles E2E/UI est soumise à revue indépendante. Aucun pourcentage de couverture
applicative ni test métier de persistance/idempotence n'est revendiqué.

Références officielles consultées le 23 octobre 2026 :

- [JSON Schema Validation 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation), notamment formats en annotation/assertion.
- [Ajv et Draft 2020-12](https://ajv.js.org/json-schema.html#draft-2020-12).
- [Formats Ajv](https://ajv.js.org/guide/formats.html).
- [Release Ajv 8.20.0](https://github.com/ajv-validator/ajv/releases/tag/v8.20.0) et [ajv-formats 3.0.1](https://github.com/ajv-validator/ajv-formats/releases/tag/v3.0.1).
