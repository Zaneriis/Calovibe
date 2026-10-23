# Proposition API et capacités MCP — L0-CONTRACTS v0.1.0

Statut : **proposition technique à revoir**, aucun service livré ni décision ouverte ratifiée.
Références : CAHIER-DES-CHARGES, BACKLOG, DATA v0.1.0 et ADR-01/02 proposées.
Ce contrat prépare les capacités des lots L2–L7 ; leur présence ne les rend pas disponibles.
Hermès reste externe. Le MCP appelle l'API et ne réimplémente ni calcul ni accès SQL.

## Versions, frontières et contexte

Proposition : REST JSON sous `/api/v1` (base publique `/api`, chemins OpenAPI `/v1`), OpenAPI 3.1.2, JSON Schema 2020-12 ; capacités outils MCP
selon spécification `2026-07-28`. Version métier `0.1.0`, indépendante de la version du protocole.
Les primitives, instantanés, versions, enveloppes mutation/undo et erreurs référencent les
`$defs` DATA ; elles ne sont pas réinventées ici. Un changement incompatible exige nouvelle
version et revue des consommateurs. Une nouvelle capacité n'autorise pas un appel par défaut.

Toute date journalisée et tout repas applicables sont fournis explicitement. Ne jamais
inférer aujourd'hui, le dernier repas, une portion ou une identité alimentaire depuis le texte.
Le fuseau appartient au profil, initialement Europe/Paris. Instants techniques UTC `Z`.
Les unités DATA s'appliquent ; eau en ml et poids en kg explicitement. Pas de conversion g/ml
sans équivalence propre au produit, ni cru/cuit implicite. Les données inconnues restent null,
les zéros explicites restent chaînes `"0"`. Calculs, précision et arrondis suivent DATA ;
les sommes côté serveur précèdent l'arrondi, les calories source ne sont pas remplacées.

## Droits et erreurs

ADR-02 propose `calovibe:read` et `calovibe:write`, indépendants : écrire ne donne pas lecture.
L’identité utilisateur provient d’une authentification vérifiée, jamais d’un champ libre
du corps. Aucun mécanisme de client logique partagé n’est nécessaire à l’idempotence.
Ressources API et MCP distinctes ; ne pas faire circuler un jeton
d'audience MCP comme jeton API. Logto, échange/délégation et transport restent à qualifier.
Le web utilise la session cookie ADR-02, les clients directs le Bearer d’audience API.
OpenAPI propose deux alternatives : lecture par session ou Bearer ; mutation par Bearer
ou session ET X-CSRF-Token lié, avec origine exacte vérifiée. Le middleware rejette une
requête mêlant les deux identités, sans en choisir une silencieusement. Les cookies,
headers CSRF/Origin et jetons sont des métadonnées de transport, jamais arguments d’outil.
La sécurité décrite est une exigence contractuelle proposée, pas une authentification testée.

| Code DATA | HTTP API | Résultat outil MCP après autorisation |
|---|---|---|
| UNAUTHENTICATED | 401 | refus transport HTTP 401, pas un succès tools/call |
| FORBIDDEN | 403 | refus transport HTTP 403, pas un succès tools/call |
| VALIDATION | 422 | isError true + erreur structurée |
| NOT_FOUND | 404 | isError true + erreur structurée |
| VERSION_CONFLICT | 409 | isError true + erreur structurée |
| INCOMPLETE_DATA | 422 | isError true + erreur structurée |
| DEPENDENCY_UNAVAILABLE | 503 | isError true + erreur structurée |
| IDEMPOTENCY_CONFLICT | 409 | isError true + erreur structurée |
| UNDO_CONFLICT | 409 | isError true + erreur structurée |
| MISSING_INFORMATION | 422 | isError true + fields non vide |

Ne pas inclure de valeur personnelle, image, jeton ou corps soumis dans message/fields/logs.
Une référence absente ou étrangère renvoie NOT_FOUND sans divulguer l'existence d'autrui.
Les erreurs JSON-RPC (outil inconnu, requête protocolaire invalide) restent des erreurs du
protocole, distinctes de l'échec métier d'un outil reconnu. Le contrôle de droits précède
l'accès aux résultats d'opérations et aux objets supprimés.

## Écritures, nouvelles tentatives et annulation proposées

Toutes les écritures, y compris brouillons photo et annulations, portent un UUID operationId
DATA. La mutation create n'a pas de version cible ; update/delete portent les cibles et leurs
versions attendues. L'API n'accepte qu'une cible pour une route d'objet unique et vérifie son
égalité avec l'ID de route ; aucune mise à jour partielle implicite. Une écriture réussie
renvoie une opération et ses résultats atomiques, y compris les versions postérieures.
Les tombstones ont un ID/version afin de pouvoir annuler une suppression sans écrasement.

Portée recommandée après convergence technique du coordinateur, non ratifiée par le
propriétaire : **utilisateur authentifié + operationId**, indépendante du canal et du client.
Le client génère un UUID et le conserve jusqu’à résolution de l’incertitude réseau. Une
reprise API/web/MCP du même utilisateur transmet la même clé et le même payload canonique ;
elle retrouve le résultat d’origine. Il n’existe ni identité de client logique à partager,
ni userId/clientId libre dans la requête. Un autre utilisateur ne partage jamais ce registre.
Vérifier identité, appartenance et scopes requis à chaque tentative AVANT accès au cache ;
write autorise le résultat de cette mutation demandée, pas une consultation arbitraire
(GET operation exige read). Un changement de canal n’accorde aucun droit supplémentaire.

Comparer l'action métier normalisée, les IDs de route et l'intégralité du payload canonique,
indépendamment de l'ordre des clés JSON. Retirer seulement les métadonnées de transport/auth ;
seuls les champs décimaux typés DATA sont normalisés sans perte ("150" et "150.000" équivalents). Même clé/même
requête : réponse d'origine, pas recalcul à partir d'une bibliothèque ou date devenue différente.
Même clé/autre requête : IDEMPOTENCY_CONFLICT. Réserver la clé, écrire toutes les cibles et
mémoriser le résultat et une empreinte cryptographique de la requête canonique dans une
transaction ; l’empreinte permet la comparaison sans conserver le fichier photo original. Une tentative en cours retourne un résultat
consultable pending ; aucun second effet. Une erreur de validation préalable ne consomme
pas la clé ; après réservation, son issue terminale est conservée, même en échec métier.

Conservation recommandée : conserver registre et résultat d'opération pendant la vie du
compte, y compris après suppression des cibles, avec tombstones et inverses minimaux tant
qu'annulables ; aucune expiration automatique ni purge silencieuse. C'est une précision à
la recommandation DATA « tant que les données existent » : une suppression conserve une
cible tombstone. La politique d'effacement du compte et de purge des données personnelles
exige une décision explicite avant production ; ne pas inférer ici une conservation d'image.
Si une purge future est décidée, garder une marque de clé non réutilisable ou retourner un
refus explicite, jamais rejouer une ancienne opération comme nouvelle après expiration.

Annulation : nouvelle operationId, targetOperationId et versions attendues de **toutes**
les cibles de l'opération originale. Autorisée pour créations, corrections, déplacements,
suppressions et confirmation photo, eau/poids/objectifs/bibliothèque ; ne pas annuler une
lecture, une analyse photo externe ou une annulation (pas de redo implicite). La fenêtre
recommandée est la vie du compte tant que l'inverse existe et sans conflit. L'inverse restaure
seulement les cibles exactes, ensemble ; toute cible changée, référence devenue incompatible,
inverse absent ou opération déjà annulée avec une autre clé donne UNDO_CONFLICT sans effet.
Une nouvelle tentative avec la même clé d'annulation retrouve son résultat. Pour un lot photo,
un seul membre modifié interdit l'annulation entière ; aucune entrée indépendante touchée.

Les opérations d'objectifs ayant la même date d'effet visent une seule révision logique par
utilisateur/date ; une création concurrente est un VERSION_CONFLICT, pas un départage par
horloge. Une correction/remplacement de cette révision exige sa version. Une suppression
révèle l'objectif historique précédent applicable, sans modifier ses valeurs.

## Photo, bibliothèque et capacités différées

Les deux modes plats (ingrédients avec rendement portions/poids final, nutrition directe)
sont distincts. Les ingrédients sont des instantanés et références versionnées explicites.
Modifier une fiche ne modifie jamais une entrée passée. La prévisualisation de portion est
une lecture calculée, pas une écriture du journal. La recherche externe/code-barres dépend
d'ADR-04 ; aucune source présumée ou appel externe automatique.

Soumettre une photo crée un brouillon avec date/repas. Attente/en cours/prêt/échec n'ajoutent
rien au journal. Une correction remplace la proposition versionnée, sans effet journal.
Changer une identité exige une nouvelle correspondance ou une vérification explicite ; un
simple renommage ne vérifie aucune nutrition. La confirmation prend la version et le contexte
d'origine, crée toutes les entrées en une transaction et lie le lot ; une seconde confirmation,
même avec nouvelle clé, retrouve le lot déjà confirmé et ne le recrée pas. Rejeter un contexte
différent ou une proposition encore incomplète ; retirer un élément et ajouter un oubli est
possible avant confirmation. Une annulation ciblée du lot ne relance pas l'analyse.

ADR-05 doit encore définir fournisseur, budget, formats, taille et rétention des images.
La proposition de soumission JSON image {mediaType, base64} évite un service assets séparé
et un téléchargement d'URL arbitraire. Forme, bornes, formats et rétention PHOTO restent
provisoires à revoir AVANT implémentation L6 ; ils ne figent pas L2. Une regex base64 et un
MIME déclaré ne prouvent pas la nature du fichier : le service devra borner le transport
avant décodage, vérifier taille décodée et média effectif, sans conservation d'image implicite.
Aucun upload exécuté, fournisseur ou stockage d'image n'est livré.
Objectifs calculés/profil : capacité différée ADR-06 ; objectifs manuels indépendants et
datés disponibles en premier. Aucune formule ni coefficient codé dans cette proposition.

## Preuves et limites

Fichiers proposés : contracts/api.openapi.json et contracts/mcp-tools.json ; DATA v0.1.0 intégré sur develop 33f736276d31bd9c245a5987db905e10ce643a95. Une validation
de manifest démontre des types et une cohérence statique, **pas l'interopérabilité**. Une étape
séparée doit négocier le protocole et exécuter lecture/écriture/refus avec un vrai client MCP
de référence ; L0 reste ouvert jusque-là. Les E2E web/API/MCP, droits et transactions avec
base réelle accompagnent les lots applicatifs. Pas de nouveau rendu UI dans cette tâche.

Sources officielles consultées le 23 octobre 2026 :
- [OpenAPI 3.1.2](https://spec.openapis.org/oas/v3.1.2.html), version corrective retenue dans la famille 3.1.
- [MCP outils 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools), schémas d'entrée/sortie et résultats structurés.
- [Swagger Parser 13.1.0](https://github.com/APIDevTools/swagger-parser/releases/tag/v13.1.0), version retenue ; [source officielle](https://github.com/APIDevTools/swagger-parser/blob/v13.1.0/lib/index.js) déclarant support de 3.1.2. Son validateur standard sélectionne le schéma OpenAPI 3.1 ; les DTO seront vérifiées séparément avec Ajv strict/formats complets.


MCP 2026-07-28 : les résultats finaux portent resultType: complete. Les requêtes doivent
porter les métadonnées _meta obligatoires définies par le protocole ; la négociation/version
et ces champs seront vérifiés avec le SDK/client de référence séparément. Les manifests
locaux à références de fichiers devront être liés en schémas autonomes avant outils/list ;
aucun client distant ne doit résoudre des chemins du dépôt ou des URN privés sur Internet.

## Formes de transport proposées et matrice

MCP reçoit les arguments explicites `{path?, query?, body?}` de la même route API.
Le corps JSON contient `{mutation, data}` sauf undo (enveloppe DATA directement) ; DELETE
conserve son corps JSON versionné. PUT remplace les données éditables documentées ; déplacer
une entrée utilise PUT avec la nouvelle date/repas et conserve son instantané.
Les routes mono-objet exigent exactement une cible DATA, égale à leur ID ; cette égalité
et l’unicité des IDs d’un lot restent des validations métier, pas du JSON Schema.

Les succès API de lecture renvoient leur DTO ; une écriture renvoie une opération typée
avec résultat discriminé (200 succeeded, 202 pending). GET operation peut aussi retourner
failed avec son erreur persistée ; une erreur synchrone garde le statut HTTP de la matrice.
MCP structuredContent est `{ok:true,data}` ou `{ok:false,error}`, avec outputSchema validant
les deux formes ; le bloc texte contient le même JSON. Un échec métier porte isError:true,
un succès isError:false et resultType:complete. Les refus 401/403 restent au transport.
Les scopes protègent également chaque tools/call ; la découverte ne remplace pas les droits.

Les valeurs `displayNutrition`/`displayTotals` sont les valeurs finales arrondies selon DATA
(kcal entières, macros à 0,1 g), null par apport incomplet. Ne pas sommer ces valeurs pour
refaire un bilan ; le serveur somme ses rapports exacts avant affichage. Les références
source et quantités exactes DATA restent dans les instantanés. La journée renvoie chacun
des quatre repas une seule fois, même vide ; unicité/identité des jours et concordance
poids localDate/measuredAt avec le fuseau seront vérifiées au service.

Proposition de bornes aux frontières : noms non blancs ≤200 caractères ; recherche ≤200 ;
recette/photo ≤100 éléments ; page 1–100 (défaut50), curseur opaque ≤512. Requête JSON
≤64 KiB avant analyse, sauf photo ≤15 MiB avant décodage ; base64 ≤13981016 caractères
et taille décodée ≤10 MiB. Photo JPEG/PNG/WebP **provisoire ADR-05 avant L6**, aucun fournisseur
ni stockage choisi. Vérifier le média effectif et décodage canonique : les octets `hello`
de la fixture positive prouvent seulement la forme, ce n’est pas un fichier image accepté.
Le format `calovibe-base64` est une assertion obligatoire : borner la chaîne avant décodage
avec Buffer.from standard, borner les octets décodés puis exiger un réencodage identique.
`contentEncoding:base64` reste une annotation ; le format personnalisé est le contrôle exact.
La regex alphabet/padding maximal ne remplace pas cette assertion ni le média effectif. Un dépassement transport renvoie 413/VALIDATION sans effet.

Les listes sont paginées, tri stable (bibliothèque : nom puis ID ; pesées : measuredAt puis ID ;
objectifs : effectiveDate puis ID), bornes from/to inclusives, from≤to. Curseur lié aux filtres
et à l’utilisateur ; si devenu invalide, VALIDATION avec reprise de liste. Aucune pagination
implicite ne tronque le bilan quotidien. Les collisions d’objectifs à même date d’effet et
références bibliothèque supprimées/incompatibles sont contrôlées avant transaction.

| Outil / operationId | API (base publique /api) | Lot | Droit |
|---|---|---|---|
| journal_day_read | GET /v1/journal/days/{localDate} | L2/L3 | calovibe:read |
| journal_entry_read | GET /v1/journal/entries/{entryId} | L2 | calovibe:read |
| journal_entry_create | POST /v1/journal/entries | L2 | calovibe:write |
| journal_entry_update | PUT /v1/journal/entries/{entryId} | L2 | calovibe:write |
| journal_entry_delete | DELETE /v1/journal/entries/{entryId} | L2 | calovibe:write |
| library_search | GET /v1/library/items | L2/L4 | calovibe:read |
| library_item_read | GET /v1/library/items/{itemId} | L2/L4 | calovibe:read |
| library_item_create | POST /v1/library/items | L2/L4 | calovibe:write |
| library_item_update | PUT /v1/library/items/{itemId} | L2/L4 | calovibe:write |
| library_item_delete | DELETE /v1/library/items/{itemId} | L2/L4 | calovibe:write |
| portion_preview | POST /v1/portions/preview | L2/L4 | calovibe:read |
| water_day_read | GET /v1/water/days/{localDate} | L3 | calovibe:read |
| water_entry_create | POST /v1/water/entries | L3 | calovibe:write |
| water_entry_update | PUT /v1/water/entries/{waterId} | L3 | calovibe:write |
| water_entry_delete | DELETE /v1/water/entries/{waterId} | L3 | calovibe:write |
| weights_list | GET /v1/weights | L7 | calovibe:read |
| weight_create | POST /v1/weights | L7 | calovibe:write |
| weight_update | PUT /v1/weights/{weightId} | L7 | calovibe:write |
| weight_delete | DELETE /v1/weights/{weightId} | L7 | calovibe:write |
| goals_effective_read | GET /v1/goals/effective/{localDate} | L3 | calovibe:read |
| goals_history | GET /v1/goals | L3 | calovibe:read |
| goals_create | POST /v1/goals | L3 | calovibe:write |
| goals_update | PUT /v1/goals/{goalId} | L3 | calovibe:write |
| goals_delete | DELETE /v1/goals/{goalId} | L3 | calovibe:write |
| photo_submit | POST /v1/photo-proposals | L6 | calovibe:write |
| photo_read | GET /v1/photo-proposals/{proposalId} | L6 | calovibe:read |
| photo_correct | PUT /v1/photo-proposals/{proposalId} | L6 | calovibe:write |
| photo_delete | DELETE /v1/photo-proposals/{proposalId} | L6 | calovibe:write |
| photo_confirm | POST /v1/photo-proposals/{proposalId}/confirmation | L6 | calovibe:write |
| operation_read | GET /v1/operations/{operationId} | L2 | calovibe:read |
| operation_undo | POST /v1/operations/{targetOperationId}/undo | L2–L7 | calovibe:write |

## Vérification reproductible

Après npm ci --ignore-scripts sur Node26.2.0 :

```text
node --check tests/contracts-api-mcp.test.cjs
node --test tests/contracts-api-mcp.test.cjs
npm test
npm run check
npm run test:browser
npm audit
```

Les exemples api-mcp-valid/invalid/errors/result sont fictifs et validés par la suite.
Swagger Parser13.1.0 valide le document OpenAPI et résout les références locales sans HTTP.
Ajv8.20.0 strict et ajv-formats3.0.1 full vérifient toutes les DTO et les schémas MCP liés.
Un document OpenAPI invalide et une référence cassée sont rejetés par le validateur standard.
Le document porteur temporaire des tests ne constitue pas un adaptateur applicatif.
Le test arithmétique exact vérifie uniquement la fixture200kcal/100g×150g=300kcal ;
il ne livre pas un calculateur métier parallèle. Le cas g/ml vérifie la forme valide de
la requête et de son erreur métier attendue ; il ne prétend pas exécuter un contrôle de densité.
Les 75tests antérieurs et la suite navigateur restent dans la vérification permanente.

Défaut de préparation REG-PHOTO-BASE64-01 : l’ancienne regex à groupes répétés levait
RangeError sur une chaîne base64 de13981020 caractères. Le test du même nom reproduit
cette borne, la borne exacte10MiB, le dépassement décodé à longueur encodée encore admissible,
les longueurs/padding non canoniques ; le contrôle exact utilise Buffer standard après borne
préalable, sans décodeur maison ni abandon de la validation. Les consommateurs futurs
doivent enregistrer cette assertion de format ; le catalogue seul ne l’implémente pas.
Sources : [Buffer Node26](https://nodejs.org/api/buffer.html#static-method-bufferfromstring-encoding),
[JSON Schema contentEncoding en annotation](https://json-schema.org/understanding-json-schema/reference/non_json_data).

Une confirmation photo déjà effectuée est reconnue après droits/appartenance/contexte :
la version fournie doit être celle consommée par cette confirmation et date/repas identiques.
Une nouvelle clé est alors mémorisée comme alias vers le reçu et le lot d’origine, qui
conservent leur operationId ; aucune nouvelle cible ni nouvel effet. L’annulation vise
l’operationId de confirmation retourné, jamais une sélection arbitraire de lignes. Une
version ou un contexte différents reste un conflit explicite. Les états photo failed et
confirmed exigent respectivement une erreur et un identifiant de confirmation structurés ;
une identité library exige ID/version, les autres identités ne portent pas de fausse référence.

L’ajout inline représente une saisie manuelle : le client fournit l’instantané, pas de
provenance arbitraire. Le serveur dérive la provenance selon le canal métier autorisé
(manuel, bibliothèque ou confirmation photo) ; un client ne peut pas injecter method:photo
ou marquer une analyse comme vérifiée sur journal_entry_create. L’intégration code-barres
et ses références fournisseur seront spécialisées à ADR-04/L5. La suppression par ID/version
utilise le contexte conservé de cet objet, sans deviner de date ou repas à partir de l’horloge.
Node26.2.0 reste le runtime du cadre de vérification existant ; cela ne ratifie pas le
runtime des futurs services de l’ADR-01 proposée.

Exemples de reprise proposés (garanties futures, aucun test transactionnel simulé) :

| Situation | Résultat attendu |
|---|---|
| Réponse perdue après ajout dîner22/10 ; même utilisateur/UUID via MCP et même corps | Reçu d’origine, une entrée seulement |
| Même utilisateur/UUID via autre canal, quantité150g devenue200g | IDEMPOTENCY_CONFLICT409, aucun effet |
| Même UUID chez un autre utilisateur | Registre isolé ; aucun accès au résultat du premier |
| Ajout puis suppression, nouvelle tentative de l’ancien ajout | Résultat d’ajout conservé, pas de recréation de l’entrée supprimée |
| Suppression puis undo avec version du tombstone | Restauration de cette cible si aucune modification incompatible |
| Undo du lot photo avec un seul membre ensuite modifié | UNDO_CONFLICT409 et aucune inversion partielle |
| Reprise avec droits retirés | Refus401/403 avant cache, aucun résultat antérieur divulgué |

REG-PHOTO-VERIFY-01 : la commande de correction porte, pour chaque élément,
verificationAction:preserve/verify/reassociate, distinct du statut nutritionVerified
retourné par le serveur. Le client ne renvoie jamais ce booléen comme preuve de nouvelle
vérification. preserve garde les informations sans les revérifier ; un changement de
nom/identité ou de référence nutritionnelle avec preserve rend la vérification caduque.
verify atteste une vérification explicite des valeurs soumises ; reassociate demande
une correspondance library ID/version que le serveur résout à nouveau. Confirmer exige
une identité résolue et une vérification valable pour chaque élément ; sinon
INCOMPLETE_DATA. Quantité seule ne revérifie pas la référence. Ces transitions et leurs
preuves utilisateur devront être testées au service/UI L6 ; ici le test portant cet ID
rejette structurellement l’ancien booléen recopié et l’intention manquante.
