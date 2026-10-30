# MCP

Emplacement du serveur MCP et de ses futurs sources et Dockerfile.
`tests/` possède la référence SDK HTTP actuelle : identités et réponses synthétiques,
aucun serveur métier ou authentification Calovibe de production.

Après installation verrouillée à la racine : `npm run build` dans ce dossier,
ou `npm run build:mcp` à la racine. Sortie actuelle : `dist/mcp-tools.json`,
catalogue autonome de 31 outils typés, construit depuis les contrats partagés.
Ce build ne construit ni le backend ni le web et ne démarre aucun service.
`npm test` lance les tests de référence MCP.

Documentation transversale : [contrat](../docs/contracts/API-MCP.md),
[référence et limites](../docs/contracts/MCP-REFERENCE.md).
