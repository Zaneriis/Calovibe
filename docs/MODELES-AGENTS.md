# Modèles des agents — profil Équilibré

Profil choisi explicitement par le propriétaire le 23 octobre 2026 : Sol pour coordination,
développement et revues ; Luna pour les tâches simples ; Astra sur blocage difficile.
Cette décision concerne l'équipe qui développe Calovibe. Elle ne choisit pas le fournisseur
photo de l'application (ADR-05) et n'autorise aucun achat ni dépassement payant.

## Répartition de départ

| Rôle / tâche | Modèle demandé | Raisonnement recommandé |
|---|---|---|
| Coordinateur : dépendances, contrats, intégrations | GPT-6.1 Sol (`gpt-6.1-sol`) | high |
| Développement courant, périmètre et contrat connus | GPT-6.1 Sol (`gpt-6.1-sol`) | medium |
| Développement critique : données, concurrence, auth, migrations, calculs | GPT-6.1 Sol (`gpt-6.1-sol`) | high |
| Revues fonctionnelle et qualité des tests | GPT-6.1 Sol (`gpt-6.1-sol`) | high |
| Revue UI/UX : parcours et rendu réel | GPT-6.1 Sol (`gpt-6.1-sol`) | high, avec outils de rendu disponibles |
| Repérage, inventaire, édition mécanique bien bornée | GPT-6 Luna (`gpt-6-luna`) | medium ; high si la tâche le justifie |
| Blocage difficile exigeant une analyse plus approfondie | GPT-6 Astra (`gpt-6-astra`) | high, intervention ciblée |

Les niveaux sont un point de départ technique, pas une preuve de performance sur ce projet.
Luna n'est pas le seul juge d'une revue critique et ne prend pas une décision de sécurité,
de contrat ou d'intégration pour économiser des ressources. Une sortie Luna utilisée dans
un changement reste soumise aux mêmes tests et revues que toute autre contribution.

## Mise en œuvre et limites réelles

Au démarrage, choisir GPT-6.1 Sol pour le contexte coordinateur si le client le permet.
Un prompt ne change pas à lui seul le modèle de la session. Le coordinateur vérifie les
modèles et niveaux effectivement exposés par ses outils, sans inventer leur disponibilité.
Pour un sous-agent, demander le modèle/niveau explicitement lorsque le mécanisme l'autorise.
Si ce choix exige un contexte neuf, fournir une mission autonome : tâche, chemins du worktree,
sources de vérité, contrat, critères, commandes et format de retour ; ne pas supposer une
mémoire héritée. Consigner modèle/niveau demandés et effectifs lorsqu'ils sont vérifiables.

Si le profil n'est pas applicable dans ce client, signaler l'écart et conserver le modèle
déjà choisi seulement s'il convient à la tâche. Ne pas remplacer silencieusement un rôle
critique par un modèle plus faible ; si nécessaire, mettre ce rôle en attente et poursuivre
les tâches indépendantes. Ne pas modifier les réglages globaux du compte.

L'indépendance d'une revue repose sur des agents distincts, leur examen propre et les preuves
du commit exact ; des modèles différents ne garantissent pas cette indépendance. Il est
normal que plusieurs rôles utilisent Sol, chacun avec son contexte et ses responsabilités.

## Escalade, usage et retour d'expérience

Avant Astra, fournir l'ID du blocage, la reproduction, les tentatives et les hypothèses
restantes ; une analyse spécialisée et courte suffit souvent. Réutiliser son diagnostic
dans une correction normale avec tests et revues. Le recours à Astra ne remet pas à zéro
le compteur des trois cycles infructueux et ne donne aucune approbation de substitution.

Rester dans les modèles accessibles au compte et l'usage déjà autorisé. Ne pas acheter
de crédits, activer une facturation supplémentaire, une API payante ou un mode de vitesse
majoré. Le parallélisme partage les ressources/quota ; si une limite est atteinte, réduire
la concurrence ou attendre selon les outils, puis signaler la limite sans contourner l'accès.
Ne pas annoncer un coût par tâche ou une économie qui n'ont pas été mesurés.

Conserver dans les fiches/PR modèle et niveau vérifiables, durée, essais et corrections
utiles. Après quelques tâches représentatives, ajuster les niveaux dans le profil choisi
selon les résultats, sans réduire les exigences de validation ni modifier les familles
de modèles ou autorisations de dépense de sa propre initiative.

## Sources OpenAI consultées le 23 octobre 2026

- [Sous-agents](https://learn.chatgpt.com/docs/agent-configuration/subagents) : choix du
  modèle par tâche, paramètres de raisonnement et configuration effective.
- [Choix du modèle](https://developers.openai.com/api/docs/guides/model-selection) :
  compromis qualité/coût/latence et expérimentation sur tâches représentatives.
- [Usage et tarification Codex](https://learn.chatgpt.com/docs/pricing) : l'usage varie
  avec le modèle, le contexte, le raisonnement et les outils ; ne pas confondre quota
  de l'abonnement et tarification API, ni supposer le quota d'un compte inconnu.
