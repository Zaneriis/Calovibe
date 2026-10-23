# L0-CONTRACTS — proposition API/MCP v0.1.0

## Résultat, dépendances et propriété

Statut : contrat PROPOSÉ préparé pour revues indépendantes ; aucune API ni serveur MCP livré. Résultat attendu :
OpenAPI 3.1 validable, outils MCP typés de même capacité, exemples et vérification permanente.
Base : develop `db7c222f87db4321eeb1fb24e6de8ac4acac49bf`.
Branche : `codex/l0-api-mcp-contract` ; worktree :
`C:/Users/Leo14/.codex/worktrees/l0-api-mcp-contract/Calovibe`.
Auteur : agent développeur L0-CONTRACTS, profil demandé Sol/high ; le nom effectif du
modèle n'est pas vérifiable depuis le processus. Aucune délégation ni auto-approbation.

Dépendance DATA PR #4 intégrée dans develop `33f736276d31bd9c245a5987db905e10ce643a95`,
fusionnée dans cette branche avant tout schéma consommateur, package ou test. ADR-01/02
restent des propositions à qualifier ; aucun choix d’authentification, fournisseur photo
ou calculateur n’est déclaré livré. Fusion finale réalisée sans rebase : origin/develop `7d154f552535d4b63e74b4ffc63614b4df6f062c`
(ADR-01/02) ; aucun changement concurrent restant sur les fichiers possédés.

Propriété : cette fiche, docs/contracts/API-MCP.md, contracts/api.openapi.json,
contracts/mcp-tools.json, contracts/examples/api-mcp*, tests/contracts-api-mcp.test.cjs.
Après signal du coordinateur DATA intégré seulement : package.json, package-lock.json et
scripts/check.cjs, pour validation standard des contrats dans la suite existante.
Extension attribuée ensuite : README.md et docs/DEVELOPPEMENT-AUTONOME.md, portée des
validations et installation seulement ; aucune règle de revue ou politique Git modifiée.
Extension de convergence : docs/contracts/DATA.md, portée/rétention idempotence proposées
alignées sur API-MCP ; aucun schéma DATA ni décision humaine modifié.
Exclus : services, SDK client de référence, UI, base, migrations, Hermès, master et intégration develop.

## Critères avant implémentation et stratégie

| ID | Critère observable | Nominal, erreur, limite et preuve prévue |
|---|---|---|
| C1 | Un seul modèle DATA réutilisé | Compiler toutes les DTO avec Ajv2020 strict et formats complets ; références DATA, pas copie de ses définitions |
| C2 | API versionnée et typée | Swagger Parser standard sur OpenAPI 3.1 ; chemins et paramètres complets ; exemples requêtes/réponses acceptés ou rejetés |
| C3 | Parité des capacités pertinentes MCP/API | Matrice operationId/méthode/chemin unique, mêmes entrées/résultats métier ; outils lecture/écriture explicitement annotés |
| C4 | Contexte, unités, versions explicites | Date passée/repas, quantité/unité, version cible ; rejeter date impossible, repas absent, quantité numérique, champs inconnus et mutation sans version |
| C5 | Erreurs structurées distinctes | Exemples pour tous les codes DATA et mapping HTTP ; informations manquantes sans choix implicite ; distinguer transport 401/403 et résultat outil |
| C6 | Mutations et annulation définies | Documenter portée, JSON canonique, résultat durable, suppression/tombstone, reprise multicanal, versions et annulation atomique ciblée ; schémas ne prouvent pas ces transactions |
| C7 | Photo reste brouillon jusqu'à confirmation | Contrats soumission/statut/correction/confirmation ; identité et vérification explicites ; aucun fournisseur, budget ou rétention image inventé |
| C8 | Limites de preuve honnêtes | Pas d'E2E/service, auth réelle, persistance ni interop MCP prétendues ; client de référence exigé dans étape séparée avant clôture L0 |
| C9 | Suite existante maintenue | npm ci --ignore-scripts, npm test, npm run check, npm run test:browser, npm audit réellement exécutés après DATA intégré ; aucune règle affaiblie |

Pas de nouveau rendu ou parcours UI livré : non-applicabilité de nouveaux contrôles UI/E2E
à faire confirmer par revue indépendante. Les tests navigateur existants restent requis.
Les schémas testent la forme ; concurrence, droits, totaux, annulation et atomicité seront
vérifiés avec services/base réels et canaux API/web/MCP aux lots correspondants.

## Livraison et revues

Candidate/PR et revues post-commit : rapportées dans la PR vers develop, sur SHA exact. Les revues fonctionnelle,
UI/UX (applicabilité) et qualité des tests sont demandées à des agents indépendants par le
coordinateur sur le SHA exact ; leurs preuves restent dans la PR. Aucune approbation locale.
Blocages/cycles de correction : aucun retour de revue à ce stade.

Préparation initiale : deux documents rédigés avant intégration DATA, aucune dépendance
ni consommateur écrit avant le signal. Références et sources officielles lues.
Livrable statique : 31 capacités API/MCP, schémas via références DATA, 31 exemples de
requête/réponse, 7 variantes, 25 requêtes invalides, 10 codes d’erreur et résultat MCP final.
Swagger Parser13.1.0 exact ajouté ; Ajv8.20.0, ajv-formats3.0.1, Playwright et contrôles
antérieurs préservés. Le seul format nouveau est une assertion base64 canonique bornée
via Buffer standard dans la suite, à enregistrer par tout futur consommateur.

Défaut détecté pendant préparation : **REG-PHOTO-BASE64-01**, regex récursive RangeError
à13981020 caractères. Corrigé par assertion canonique bornée, sans affaiblir le format ;
test portant cet ID dans tests/contracts-api-mcp.test.cjs (bornes, padding, octets).
Second défaut de conception préparatoire **REG-PHOTO-VERIFY-01** : un ancien booléen
nutritionVerified pouvait être recopié après changement de nom. La commande porte désormais
verificationAction distinct du statut retourné ; le test portant cet ID refuse l’ancien
booléen et l’intention absente. Les transitions métier restent à vérifier en L6.
Ces défauts ne sont pas des retours de revue ni une preuve de service livré.

Commandes réellement exécutées à ce stade :
- git status/rev-parse/switch/fetch/merge origin/develop : branche isolée, aucun push develop/master.
- npm view @apidevtools/swagger-parser@13.1.0 version engines : version13.1.0, Node>=22.19.0.
- npm install --save-dev --save-exact @apidevtools/swagger-parser@13.1.0 --ignore-scripts : réussi, audit0avis.
- npm ci --ignore-scripts : réussi depuis verrou, audit0avis.
- node --test tests/contracts-api-mcp.test.cjs : 86/86 après corrections ; aucune E2E production.
- git diff --check : réussi sur fichiers suivis ; à répéter après staging.
Après fusion finale : npm ci --ignore-scripts réussi ; npm test et npm run check ont passé
163/163 avant la dernière correction REG-PHOTO-VERIFY-01 ; nouvelle suite check réussie164/164 après cette correction.
La vérification finale de la candidate exacte et son SHA sont consignés dans la PR.
npm run test:browser : réussi (deux thèmes, 320–1024px et parcours des prototypes).
npm audit --json : 0avis connus. git diff --check à répéter après staging.
Aucun test d’authentification réelle, base, interop MCP ou service de production exécuté.

Critères C1–C5 et C9 : tests de contrat + suites permanentes. C6–C7 : contrat/prose et
formes testées, aucune garantie transactionnelle/média exécutée. C8 : limites et client
de référence explicitement différé ; L0 global reste ouvert. Les verdicts indépendants
fonctionnel, UI/UX (applicabilité) et qualité des tests restent à obtenir sur le commit.
