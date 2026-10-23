# Cadre local — L0-CADRE et préparation L1

Statut : cadre du développement et de la CI ; les règles Git ci-dessous appliquent la décision
humaine du 23 octobre 2026. Aucun service de production n'est livré par ce document.
Les décisions validées restent celles de CAHIER-DES-CHARGES.md et BACKLOG.md.
Cette tâche ne termine ni L0 ni L1. Aucun service métier ajouté.

## Fiche de tâche et acceptation

ID : L0-CADRE. Dépendances : aucune pour le cadre ; L0 complet avant le socle L1.
Canaux : outillage local et documentation. Contrat modifié : format des preuves de revue.
Périmètre : README, scripts de contrôle, tests du circuit, registre L0 et organisation L1.
Les maquettes et données existantes sont conservées.

| Critère | Vérification |
|---|---|
| Trois responsabilités indépendantes, développeur exclu | tests de la barrière et revue du protocole |
| Revues et contrôles sur le commit exact | rejet des SHA périmés et de l'arbre sale |
| Blocage, preuve absente, test échoué interdisent la candidature | tests négatifs permanents |
| Arrêt après trois cycles infructueux du même blocage | test du compteur et journal du coordinateur |
| Pas de fausse validation UI | impact obligatoire, non-applicabilité motivée par le réviseur UI |
| Plateforme et production non inventées | registre des accès et limites |

## Circuit et responsabilités

L'[ordonnancement multi-agents](ORCHESTRATION.md) complète ce circuit : capacité variable,
worktrees isolés, propriété des fichiers/contrats, reprise et intégration séquentielle.
Le [prompt de reprise](PROMPT-DEMARRAGE.md) permet de démarrer dans un autre contexte.

Le coordinateur choisit une petite tâche du backlog dont les dépendances sont satisfaites,
prépare critères/scénarios/commandes, puis confie le code à un développeur. Il maintient le
journal des blocages par identifiant stable et le nombre de corrections infructueuses.
Un blocage inchangé ne peut pas être remis à zéro en changeant son nom ou sa tâche.

Le développeur lit les sources de vérité, réutilise les composants existants, implémente
seulement la tâche, fournit tests et preuves puis crée une candidate immuable par SHA.
Il ne modifie ni les rapports des réviseurs ni les paramètres des protections.

Chaque réviseur reçoit : fiche, SHA, diff et sources reliées, rapports de commandes,
matrice critère/preuve, limites et blocages précédents. Il inspecte lui-même le code et
les preuves, peut relancer les commandes et n'approuve pas sur la seule déclaration du développeur.

| Agent distinct | Preuves attendues | Blocages admissibles |
|---|---|---|
| Fonctionnel | exigences reliées aux cas nominal/erreur/limites ; effets sur données et canaux | exigence non satisfaite, perte de contexte/données, contrat contradictoire |
| UI/UX | rendu clair/sombre, petit/grand et intermédiaire, clavier/focus, états et références | divergence aux références ou risque concret d'accessibilité/parcours ; sinon non-applicabilité motivée |
| Qualité des tests | assertions utiles, test reproduisant chaque défaut, erreurs/limites, intégrations et E2E pertinents, règles de CI | test requis absent/affaibli, résultat non reproduit, contrôle contournable présenté comme protection |

Format de retour : rôle, identité, SHA, verdict (approved/changes-requested/not-applicable UI),
preuves, suggestions séparées ; pour chaque blocage : ID stable, exigence/risque, reproduction,
résultat observé et attendu. Les préférences et scores n'annulent aucun blocage.
Les changements des contrôles sont eux-mêmes revus par l'agent qualité des tests.

Boucle : contrôles → trois revues → correction ciblée → nouveau SHA → suite complète →
nouvelles revues sur ce SHA. Toute ancienne approbation devient invalide. Au troisième
cycle infructueux du même blocage : diagnostic, arrêt de l'intégration, aucune réduction
des exigences. Le propriétaire n'est sollicité que pour une décision ou un accès que
les agents ne peuvent résoudre. Les écarts ordinaires restent entre développeur et réviseurs.

## Exécution locale

Node 26.2.0 est le runtime **observé et fixé pour cet outillage**. Installer les
dépendances npm verrouillées avant les contrôles : Ajv et ajv-formats valident la
proposition de schémas L0. Cela ne choisit pas le runtime de production (ADR-01).

```
npm ci --ignore-scripts
npm run check
npm run test:browser
npm run gate -- artifacts/candidate.json
```

`check` vérifie le runtime, la syntaxe des scripts du cadre, du correctif de miroir CI
et des tests, puis les suites de revue, navigation, miroir CI et schémas L0.
Ces contrôles ne prouvent pas une fonctionnalité de production. Ce n'est ni un linter
sémantique ni une vérification TypeScript.
Il n'existe pas encore de build/types applicatifs : non applicables au cadre, à définir
avec ADR-01 avant L1. Aucun contrôle applicatif fictif n'est déclaré réussi.
Le test navigateur utilise Playwright et Lucide verrouillés dans package-lock.json et
Chromium installé par Playwright. Le runner GitHub Ubuntu 24.04 utilise sa liste de miroirs
`/etc/apt/apt-mirrors.txt` : avant Playwright, la CI remplace la seule entrée Azure de
priorité 1 par le dépôt Ubuntu principal en HTTPS. Les priorités, autres miroirs et
sources deb822/signatures sont conservés ; un format inattendu échoue explicitement.
Ce correctif est propre au runner éphémère ; aucun APT du PC local n'est configuré.
Exécuter `npm ci --ignore-scripts`, puis
`npx playwright install chromium` (Linux CI : `--with-deps`). Il reste requis pour
les changements des prototypes ; ses captures sont dans `artifacts/browser/`.

Le rapport JSON passé à `gate` suit le format testé dans `tests/review-gate.test.cjs`.
Il est conservé hors des sources dans `artifacts/`, avec sorties des commandes et rapports.
La CLI exige HEAD et un arbre propre. Une entrée manquante ou négative retourne un code 1.
Les fixtures d'approbation des tests sont synthétiques et ne valent jamais revue du projet.

**Limite de confiance :** cette barrière locale valide la cohérence d'un rapport déclaré.
Elle n'authentifie pas les agents, ne déduit pas les suites obligatoires du diff et ne
prouve pas le contenu des pièces jointes. Elle n'autorise aucun merge ni déploiement.
Une protection technique exigerait identités et statuts imposés par la plateforme.
Le propriétaire a choisi de fonctionner sans ce verrou : l'intégration dépend de la
vérification des preuves et du respect des règles Git d'AGENTS.md par le coordinateur.

## Organisation des contrôles L1

Le workflow `.github/workflows/ci.yml` exécute actuellement syntaxe, tests du cadre,
des prototypes, du miroir CI et de la proposition de schémas L0 via check, puis navigateur,
à chaque push et pull request, sans filtre de chemins.
Il fonctionne sur Ubuntu avec jeton en lecture, sans secret applicatif ni déploiement.
Les actions sont épinglées à leur SHA et les captures conservées trois jours.
Les contrôles applicatifs ci-dessous s'ajouteront à mesure de leur implémentation.

Sur chaque push : syntaxe/lint, types, contrats, unités et intégrations concernées.
Une modification partagée ou des contrôles déclenche toute la suite. Sur la candidate :
suite complète permanente, intégrations PostgreSQL réelle isolée, E2E web/API/MCP,
build des trois images, contrôles de secrets, trois statuts de revue applicables.
Une non-applicabilité UI est un statut explicite du réviseur, pas un contrôle absent.
La liste des commandes et noms de statuts sera fixée dans la configuration de la
plateforme retenue ; le workflow actuel ne prétend pas exécuter des services absents.

Politique Git validée par le propriétaire le 23 octobre 2026, après refus de protection
GitHub (403, Pro ou dépôt public demandé) : dépôt privé sans protection payante,
`master` figée, sans fusion, push, réécriture, suppression, renommage ni déploiement.
`develop` est la branche par défaut et d'intégration ; chaque tâche part de cette branche,
avec pull request vers `develop`. La première intégration de la CI amorce cette organisation.

Le coordinateur vérifie la cible de la PR, le SHA exact, la suite complète verte et les
verdicts indépendants sans blocage. Il avance `develop` uniquement en fast-forward vers
ce SHA, sans squash/rebase, puis vérifie le résultat distant et le maintien du SHA de
`master`. La CI tourne aussi après intégration. Une nouvelle candidate invalide les revues.
Les règles, seuils et workflows restent soumis à revue indépendante ; aucune auto-approbation.
La convention ne bloque pas techniquement un push ou une fusion sur GitHub ; ne jamais
la présenter comme une protection de plateforme. Aucun achat ni changement de visibilité.

Après succès uniquement : images identifiées par SHA et digest, déploiement sérialisé
par exécutant persistant sur le réseau du serveur Ubuntu, indépendant du PC fixe,
sans SSH public. Secrets injectés à l'exécution, pas dans images/logs/dépôt.
Santé et parcours minimal après livraison ; retour aux images compatibles en cas d'échec.
Tester migrations aller/retour et restauration isolée avant toute donnée personnelle.
Un retour d'image n'est pas une restauration de base. Aucune approbation humaine routinière.

## Petite tâche représentative L0-PILOT

Objet : la barrière de revue elle-même, sans service, UI ou donnée personnelle.
Le test nominal vérifie une candidate complète ; les tests négatifs injectent échec,
absence de preuve, auto-approbation, péremption et troisième cycle infructueux.
Après commit local, faire exécuter `check` à trois agents distincts en lecture seule,
recueillir leurs verdicts et motiver la non-applicabilité UI. Tester la CLI avec un
rapport réel et une copie contenant un contrôle échoué (code 1 attendu).
Conserver SHA, commandes et résultats dans `artifacts/` ; le compte rendu humain
distingue démonstration locale, revues réelles et intégration distante non exécutée.
