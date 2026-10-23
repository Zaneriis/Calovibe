# Ordonnancement autonome de Calovibe

Décision du propriétaire du 23 octobre 2026 : un coordinateur, autant de développeurs que
de tâches réellement indépendantes, et des réviseurs indépendants. Aucun plafond métier
fixé à deux développeurs. Les capacités des outils et de la machine bornent la concurrence.
AGENTS.md, CAHIER-DES-CHARGES.md et BACKLOG.md restent les sources de vérité.
Le profil de modèles Équilibré est validé par le propriétaire et décrit dans
[MODELES-AGENTS.md](MODELES-AGENTS.md). Il s'applique aux agents de développement,
pas au futur fournisseur d'analyse photo.

## État de départ à revérifier

- Dépôt privé : https://github.com/Zaneriis/Calovibe ; branche par défaut et intégration : develop.
- master figée au commit 45e938bd4082880ea7670462d1a7b8351028026b ; jamais fusionner, pousser,
  réécrire, supprimer, renommer ou déployer depuis cette branche.
- Cadre et CI initiale intégrés sur develop, avec preuve d'échec volontaire puis reprise.
  CI : syntaxe, 29 tests actuels du cadre/prototypes et parcours Chromium, sans code métier.
- L0 applicatif non terminé : ADR-01/02 ouvertes, schémas et contrats API/MCP à livrer et vérifier.
  Les propositions de DECISIONS-L0.md ne sont pas des décisions validées par le propriétaire.
- L1 : CI réalisée, services, authentification, base et Compose non réalisés. L2–L8 non réalisés.
- Docker CLI présente mais moteur Linux inaccessible lors du dernier contrôle. Revérifier,
  démarrer le moteur installé si possible sans opération destructive ; ne pas bloquer L0 là-dessus.
- Hermès est un client externe : aucun accès ni modification. Tester le MCP avec un client de référence.
- Ubuntu et son réseau sont nécessaires au déploiement réel, pas au développement Docker local.
  Domaine, accès production et secrets ne sont pas configurés. Aucun achat autorisé.

Ce constat est daté : lire l'état Git, les PR, les suites et les ADR réelles avant d'agir.
Ne pas déduire la réalisation d'un lot de la présence d'un document ou d'une maquette.

## Répartition et capacité

Le coordinateur vérifie les dépendances, propose les décisions techniques, stabilise les
contrats communs, attribue les tâches et ordonne les intégrations. « Fixer les contrats »
signifie produire une version cohérente et revue ; cela ne valide pas une décision utilisateur
encore ouverte ni un coût. Il ne réécrit pas les retours des réviseurs et ne s'auto-approuve pas
s'il écrit lui-même une partie du changement. Il est le seul agent qui avance develop.

Un développeur par tâche prête : dépendances satisfaites, critères explicites, contrat connu
ou travail limité à une proposition, périmètre possédé sans concurrence. Deux fichiers
différents ne suffisent pas à garantir l'indépendance : vérifier aussi schémas, migrations,
API, composants, dépendances, fixtures et ressources de test. Un fichier de dépendances ou
de CI partagé a un seul propriétaire à la fois, même pour deux fonctionnalités distinctes.

Le nombre de développeurs actifs est le minimum entre tâches indépendantes prêtes et
capacité disponible après prise en compte du coordinateur, des revues et des ressources.
Lire les limites effectives de la session ; ne pas supposer pouvoir lancer tous les rôles
simultanément. Les revues peuvent s'exécuter successivement par des agents distincts.
Libérer ou réserver des créneaux dès qu'une PR est prête ; ne pas saturer les créneaux par
de nouveaux développeurs au détriment des validations. Pas d'agent inactif pour une tâche bloquée.

Pour L0, on peut paralléliser des études à périmètres séparés (choix techniques et inventaire
des contraintes de contrat, par exemple). Les considérer comme propositions, puis faire
converger et revoir avant de figer les contrats. Ne pas lancer les fonctionnalités L2 en
attendant les décisions L0. Après L0, suivre les dépendances des lots du backlog.

## Fiche et suivi de chaque tâche

Avant le code, le coordinateur crée une fiche dans docs/tasks/ avec :

| Champ | Contenu requis |
|---|---|
| ID et résultat | lot du backlog, résultat observable, statut |
| Dépendances | tâches/ADR/contrats, satisfaits ou bloquants |
| Propriété | auteur, fichiers/dossiers attribués, exclusions et contrat/version consommé |
| Isolation | branche, chemin absolu du worktree, SHA de develop de départ |
| Vérification | canaux exposés, nominal/erreur/limites, critères reliés aux tests/preuves ou non-applicabilité revue |
| Livraison | PR vers develop, SHA candidat, commandes exécutées/résultats, liens CI |
| Revues | identités distinctes, rôle, SHA, verdict, preuves et blocages stables |
| Correction | ID de chaque blocage, cycles infructueux, diagnostic au troisième |

Le coordinateur maintient le tableau courant tâche/dépendances/propriétaire/statut/branche/
worktree/PR dans la description d'une PR de coordination ou un registre versionné dédié.
Lui seul écrit ce suivi commun ; les développeurs rendent leur compte rendu sur leur PR.
Les preuves de revue après commit sont conservées dans la PR, liées au SHA, sans les
réinsérer dans un nouveau commit qui invaliderait les approbations.
Avant une interruption, laisser assez de suivi durable pour reprendre sans cet historique
de conversation. Les rapports locaux ignorés dans artifacts/ ne suffisent pas seuls à une reprise.

## Isolation du travail

Créer chaque branche depuis le develop distant à jour, jamais depuis master. Pour chaque
tâche, créer un worktree propre et transmettre explicitement son chemin à l'agent ; toutes
ses commandes/éditions utilisent ce chemin. Les sous-agents peuvent partager le répertoire
du parent par défaut : leur simple création n'isole pas les fichiers.

Installer les dépendances verrouillées dans chaque worktree. Si des tests démarrent des
services, attribuer un nom de projet Compose, ports et volumes de test distincts. Ne pas
réutiliser une base ou des volumes contenant des données personnelles. Ne pas lancer en
concurrence des commandes qui modifient le même worktree ou index Git.

Un changement hors périmètre exige un retour au coordinateur, qui réattribue, sérialise
ou découpe la tâche. Un changement de contrat partagé suspend les consommateurs concernés
jusqu'à convergence. Aucun agent n'invente sa propre variante pour continuer.
Après intégration et sauvegarde des preuves, ne nettoyer que les worktrees identifiés,
propres et sans travail utile non poussé ; conserver les branches/PR nécessaires au diagnostic.

## Revues et corrections

Appliquer les entrées, preuves et blocages de DEVELOPPEMENT-AUTONOME.md. Réviseurs distincts
de l'auteur et du coordinateur qui a produit le changement : fonctionnel, qualité des tests,
UI/UX lorsqu'applicable. Une non-applicabilité UI est motivée par le réviseur ; elle ne
permet pas au développeur d'omettre un impact visible. Pas de rotation fictive des rôles
au sein d'un seul agent pour fabriquer l'indépendance.

Les réviseurs inspectent le commit immuable dans un contexte/worktree de lecture séparé
si des corrections reprennent ; ils ne modifient pas le worktree de l'auteur. L'auteur
corrige, ajoute le test de non-régression requis et publie un nouveau SHA ; refaire suite
complète et revues sur ce SHA. Trois cycles infructueux sur le même blocage : diagnostic
et arrêt de l'intégration concernée, sans baisser la règle. Les tâches indépendantes peuvent continuer.

## Plusieurs PR, une seule intégration à la fois

1. Le coordinateur choisit une PR prête selon ses dépendances et l'ordre qui limite les reprises.
2. Juste avant d'intégrer, relire develop distant et vérifier qu'il est ancêtre du SHA candidat.
   S'il a avancé, le développeur fusionne le develop actuel dans sa branche de tâche,
   résout les conflits et publie une nouvelle candidate. Ne jamais merger sa branche dans master.
3. Tout nouveau commit, même une fusion propre du develop actuel, invalide les anciennes
   approbations : refaire la suite complète, attendre la CI et recueillir les nouvelles revues.
4. Vérifier cible develop, auteur, SHA, contrôles complets et verdicts indépendants sans blocage.
   Avancer develop en fast-forward vers ce SHA exact, sans squash ni rebase après approbation.
   Un push refusé parce que develop a changé impose une nouvelle vérification, jamais un force-push.
5. Vérifier les refs distantes, master inchangée, PR reconnue intégrée et CI après intégration.
   Un échec après intégration suspend la livraison et les intégrations suivantes jusqu'au diagnostic
   et à une correction revue ; ne pas réécrire l'historique ni masquer l'échec.

Les PR peuvent être développées et revues en parallèle. Une seule opération d'intégration
est en cours ; aucun développeur ne pousse sur develop. L'absence de protection GitHub
reste une limite acceptée, jamais une dispense de vérification. Le déploiement reste un
circuit distinct, sérialisé et conditionné par les contrôles/revues du cahier des charges.

## Autonomie et critères d'arrêt

Exécuter les tâches réversibles nécessaires, commandes Git ordinaires, tests, PR et
corrections sans permission de routine. Respecter les permissions réelles de l'environnement,
les authentifications interactives et les revues automatiques ; ne pas contourner un refus.
Remonter seulement une décision humaine nécessaire, un accès indispensable, une dépense
non décidée, une action destructive sur les données ou un changement d'exposition administrative.
Continuer les travaux indépendants quand un blocage ne concerne qu'un lot.

Sans outils d'agents ou sans isolation vérifiable, signaler la limite et travailler
séquentiellement sur ce qui reste possible ; ne pas prétendre avoir lancé une équipe.
Ne pas créer d'ordonnanceur, de framework d'agents ou de service permanent dans Calovibe.
Cette organisation pilote le développement, elle n'ajoute aucun agent conversationnel au produit.
