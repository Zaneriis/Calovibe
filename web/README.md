# Front web

`mockups/` conserve les références de design et leurs tests ; elles ne sont pas
le code de la future application React connectée.

Après installation verrouillée à la racine : `npm run build` ici,
ou `npm run build:web` à la racine. `dist/` contient l’aperçu autonome (`index.html`
et `lucide.js`), utilisable sans les sources ni les sorties backend/MCP.
`npm run preview` reconstruit cet aperçu puis le sert sur http://127.0.0.1:4173.
Il contient des données d’exemple temporaires. `npm run test:browser` vérifie
les parcours et le rendu de l’aperçu construit.

Une installation npm commune est requise ; les builds sont indépendants,
les futures images Docker par service ne sont pas encore implémentées.
