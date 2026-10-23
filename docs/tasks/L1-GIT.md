# L1-GIT — master figée et intégration sur develop

Décision humaine du 23 octobre 2026 : fonctionner sans GitHub Pro ni protection de branche ;
interdire formellement toute fusion vers master dans AGENTS.md. Mise en œuvre : master figée,
develop pour intégration et branche par défaut. Aucun achat, aucune donnée métier concernée.

Périmètre : AGENTS.md, références de validation, README, cible de la PR CI et branche par défaut.
Dépendances : CI du cadre déjà éprouvée (L1-CI), pas de service métier requis.
La politique change ; sa revue indépendante est obligatoire avant intégration.

## Acceptation et preuves prévues avant modification

- Interdiction explicite de fusion/push/réécriture/suppression/renommage de master ; pas de déploiement depuis master.
- Tous les documents de validation désignent develop et reconnaissent l'absence de verrou GitHub.
- Suite complète et revues indépendantes du commit exact, avant fast-forward vers develop ;
  aucun squash/rebase qui changerait le SHA approuvé. Aucun test ou seuil retiré.
- PR CI redirigée vers develop ; master conserve le SHA 45e938bd4082880ea7670462d1a7b8351028026b.
- Après intégration, develop devient la branche par défaut et pointe sur la candidate revue.

Vérification : recherche des règles contradictoires, npm run check, npm run test:browser,
CI GitHub sur push/PR puis develop, revues fonctionnelle/UI/tests indépendantes ; API des
refs et du dépôt pour comparer master/develop et vérifier la branche par défaut.
Aucun nouveau test de code pour ce changement documentaire ; la CI existante reste entière.

Limite acceptée : AGENTS.md donne une consigne à l'agent, GitHub n'empêche pas un détenteur
des droits d'y désobéir. Aucun contrôle déclaratif ou revue locale ne doit prétendre le contraire.
La CI livrée ne déploie rien. Une future chaîne de déploiement devra cibler develop et vérifier
ses contrôles/revues selon le cahier des charges ; master reste exclue.
