# Backend

Emplacement de l’API métier et de ses futurs sources, tests et Dockerfile.
Aujourd’hui, aucun runtime API ou accès SQL de production n’est livré.

Après `npm ci --ignore-scripts` à la racine : `npm run build` dans ce dossier,
ou `npm run build:backend` à la racine. Sortie actuelle :
`dist/api.openapi.json`, contrat API autonome construit depuis la source partagée.
Ce build ne construit ni le web ni MCP et ne démarre aucun service.

Règles transversales : [AGENTS](../AGENTS.md), [spécification](../docs/CAHIER-DES-CHARGES.md).
