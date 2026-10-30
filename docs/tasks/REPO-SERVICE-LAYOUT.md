# REPO-SERVICE-LAYOUT — dossiers et builds indépendants

Demande humaine du 30 octobre 2026 : un dossier par service, documentation générale
séparée, possibilité de tout construire indépendamment. Auteur : coordinateur.
Branche `codex/service-layout`, créée depuis develop92c1ebe puis avancée vers la
candidate UI e0f3531 pour conserver ses corrections ; aucune intégration sur develop.
Le fichier non suivi L1-SOCLE.md préexistant reste exclu.

Critères avant code :

- `backend/`, `web/`, `mcp/` possèdent README, manifeste et commande build propres.
- `docs/` reste transversal ; `shared/contracts/` possède les schémas communs sans
  duplication de leur source. Scripts/CI de coordination restent à la racine.
- Chaque build se lance depuis son dossier ou la racine, sans lancer ni construire
  les autres services. Les dépendances verrouillées s’installent une fois à la racine.
- Le build web produit un aperçu autonome avec Lucide local. Backend/MCP produisent
  les artefacts de contrat disponibles aujourd’hui, explicitement pas des services
  métier livrés. Les futurs runtimes et Dockerfiles appartiendront à leur dossier.
- Tous les contrôles actuels restent requis ; imports, liens actifs et captures sont
  actualisés. Aucun changement du contenu JSON des contrats, des règles métier, de
  l’authentification ou des versions de dépendances.

Vérification : builds individuels depuis une sortie absente, sans sorties des autres
composants ; servir et tester le web construit ; suite256 existante, lint/types/build,
parcours navigateur complets, test négatif d’entrée de build absente. Revues distinctes
fonctionnelle, UI (rendu inchangé attendu) et tests avant toute intégration. L’avis
Hono préexistant bloque toujours la CI, sans exemption ni installation forcée.

Résultats locaux : `scripts/check.cjs` sous Node24.22.1 réussit259/259 (les256
existants et trois builds isolés), lint/types/build commun réussis. Les trois
nouveaux tests refusent aussi une source manquante. Le navigateur existant passe
après déplacement, y compris l’aperçu servi depuis web/dist et les captures dans
artifacts/browser. Aucun JSON métier modifié ; verrou enrichi uniquement des
métadonnées/liens des trois espaces npm, sans changement de version externe.
