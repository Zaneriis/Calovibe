# CI-L0DATA-APT-01 — miroir Ubuntu du runner CI

Statut : candidate préparée ; revue indépendante et CI réelle sur SHA exact requises avant intégration.
Lot : maintenance du contrôle L1-CI ; aucun contrat métier ou service livré.

## Résultat et isolation

Le run DATA [39965270110, tentative 1](https://github.com/Zaneriis/Calovibe/actions/runs/39965270110/attempts/1) a passé ses 67 tests, puis atteint la limite de dix minutes pendant les téléchargements APT Azure (fonts et glib), avant le navigateur. Utiliser le dépôt Ubuntu principal sur le runner éphémère, en conservant l'installation Playwright avec dépendances, les tests navigateur et leurs captures.

- Dépendance : develop db7c222f87db4321eeb1fb24e6de8ac4acac49bf, cadre CI existant ; tâche indépendante du contrat DATA.
- Auteur : agent développeur /root/ci_apt_mirror ; modèle demandé GPT-6.1 Sol, raisonnement high ; paramètres effectifs non attestés par les outils de ce contexte.
- Branche : codex/ci-apt-mirror ; worktree : C:\Users\Leo14\.codex\worktrees\ci-apt-mirror\Calovibe.
- Propriété : .github/workflows/ci.yml, scripts/configure-apt-mirror.cjs, tests/ci-mirror.test.cjs, scripts/check.cjs, portée du contrôle dans docs/DEVELOPPEMENT-AUTONOME.md et cette fiche. Package/lock et branches DATA exclus.
- Canal : liste /etc/apt/apt-mirrors.txt du seul runner Ubuntu 24.04 éphémère. Aucun accès aux sources APT du PC utilisateur, données personnelles ou production.

## Acceptation et vérification prévue avant code

| Critère / scénario | Preuve requise |
|---|---|
| Nominal : remplacer la seule URL Azure de priorité 1 dans apt-mirrors.txt par https://archive.ubuntu.com/ubuntu/ | Exécution CLI sur fixture temporaire ; comparaison complète de la liste attendue, priorités et autres miroirs conservés ; fichier ubuntu.sources voisin intact, suites/composants/Signed-By inchangés |
| Limites : liste fidèle au script runner-images officiel, fins de ligne LF et CRLF conservées ; seconde exécution sans modification | Tests CLI de non-régression et d'idempotence |
| Erreurs : fichier absent, priorité ou ligne Azure inattendue | Code non nul, diagnostic explicite et contenu existant intact |
| La CLI ne touche que le fichier explicitement fourni | Fixture voisine intacte ; aucune valeur de chemin système par défaut |
| Le correctif précède l'installation réelle des dépendances sans affaiblir les contrôles | Diff du workflow, limite 10 min, with-deps, navigateur et captures inchangés ; revue indépendante des contrôles |
| Le runner Ubuntu installe réellement APT et Chromium puis réussit les parcours/captures | CI GitHub verte sur SHA exact et journaux de l'installation |
| Suite permanente complète et absence de régression | npm ci --ignore-scripts, npm run check, npm run test:browser, git diff --check |

Pas de changement UI : non-applicabilité à confirmer par un réviseur distinct ; la suite navigateur existante reste requise. Le test sur fixture protège la transformation, pas la disponibilité réseau d'un miroir. La CI réelle reste indispensable. Aucun conteneur, dépendance nouvelle, retry masquant l'échec ou délai augmenté.

## Livraison et blocage

PR cible develop ; SHA, résultats et liens CI à consigner dans la PR après commit, sans modifier une candidate déjà revue. Le développeur n'approuve et n'intègre pas sa PR.
Blocage stable CI-L0DATA-APT-01 : 2 tentatives infrastructure échouées avant correctif ; 0 correction code testée au début de cette tâche. Ne pas remettre le compteur à zéro lors d'un nouvel essai.

Sources officielles consultées le 23 octobre 2026 : [gestion des paquets](https://ubuntu.com/server/docs/how-to/software/package-management/) (deb822 sur Ubuntu 24.04) et [archive Ubuntu](https://ubuntu.com/project/docs/how-ubuntu-is-made/concepts/package-archive/) (miroirs, suites, composants et source security).

Limite explicitement acceptée pour revue : cible unique apt-mirrors.txt au format actuel de [runner-images/configure-apt-sources.sh](https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/configure-apt-sources.sh), consulté directement le 23 octobre 2026. Ce script configure mirror+file dans ubuntu.sources et trois miroirs avec priorités 1, 2, 3. Un changement de ce format fera échouer explicitement notre étape et nécessitera une adaptation revue. Aucun parseur APT général ni modification de ubuntu.sources.
