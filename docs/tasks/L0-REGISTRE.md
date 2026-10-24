# L0-REGISTRE — état vérifié et convergence

Statut : préparation documentaire de coordination ; aucun lot clos par cette fiche.
Auteur : coordinateur `/root`, exclu des approbations de son changement.
Branche : `codex/l0-registre`, depuis `develop` à
`7d154f552535d4b63e74b4ffc63614b4df6f062c`.
Worktree : `C:\Users\Leo14\Documents\ChatGPT\Calovibe`.

## Périmètre et dépendances

Propriété exclusive : `docs/DECISIONS-L0.md`, `docs/tasks/L0-COORDINATION.md` et cette fiche.
Les contrats API/MCP, leurs tests et fichiers de dépendances restent à leur développeur.
Ne modifier aucune exigence, règle Git, revue, seuil ou workflow.

Références intégrées : coordination PR3, correction CI PR7, données PR4,
propositions ADR01 PR5 et ADR02 PR6. Leurs SHA et preuves restent dans les PR.
Les contrats d'interface PR8 ont été intégrés au commit
`1778c6aa96d43785fcdb0ecb8b6c16bd234c38a7`, puis repris dans cette branche en
fast-forward avant finalisation du registre. Les qualifications MCP/runtime et
les services ne sont pas déclarés livrés. Pas de rebase.

## Critères et vérification avant rédaction

| Critère | Nominal, erreur et limite à vérifier |
|---|---|
| État exact et traçable | Relier chaque livraison aux fichiers et à sa PR intégrée ; vérifier SHA et CI ; ne pas confondre branche candidate et `develop` |
| Décisions honnêtes | Distinguer exigences humaines, recommandations techniques revues et qualifications non exécutées ; aucune validation humaine inventée |
| Dépendances sans cercle | L0 reste ouvert pour ses qualifications ; journal métier L2 et santé/services L1 ne deviennent pas des prérequis artificiels de L0 |
| Accès réels | Docker installé mais service sans droits de démarrage ; Ubuntu/domaine/secrets non fournis ; Hermès externe intact |
| Contrats communs cohérents | Refléter seulement la portée d'idempotence et les conventions effectivement revues et intégrées ; aucune variante inventée par le registre |
| Contrôles préservés | Diff limité à documentation, suite complète et navigateur du SHA final ; aucune politique changée |

Lecture croisée des fichiers, PR et preuves ; `git diff --check`, suite requise courante
et CI sur le SHA final. Pas de nouveau comportement exécutable : aucun test artificiel
de prose. La non-applicabilité UI et la qualité des preuves sont jugées par des agents
distincts du coordinateur ; les avis originaux postérieurs au commit restent dans la PR.

## Livraison

Candidate, commandes réellement exécutées, PR, verdicts et limites : à publier après
convergence, sur SHA exact. Aucun résultat de future qualification ou de production
n'est revendiqué. Blocages et corrections de ce registre : aucun à ce stade.
