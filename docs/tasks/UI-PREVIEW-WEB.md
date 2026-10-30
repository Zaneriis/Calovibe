# UI-PREVIEW-WEB — aperçu web et navigation de dates

Demande humaine du 30 octobre 2026. Branche `codex/preview-web-dates`, base develop
`92c1ebe8d723d5e32f780a219456a99dc65865d7`. Auteur : coordinateur ; revues indépendantes
requises avant intégration. Le travail L1-SOCLE existant reste séparé et non commité.

Périmètre : les trois fragments de maquette, aperçu HTTP local, commande npm, README,
tests navigateur existants. Aucun service métier, accès distant ou donnée personnelle.
Cette correction des références UI ne clôt aucun lot applicatif L0–L3.

Critères avant code :

- Retirer le champ date redondant ; conserver frise, semaines précédente/suivante et
  retour Aujourd’hui. Le jour courant est calculé dans Europe/Paris, au démarrage
  et à chaque retour Aujourd’hui ; une date volontairement choisie reste sélectionnée.
- Un aperçu web unique et responsive, sans sélecteur des quatre variantes, avec
  bouton clair/sombre qui conserve date, repas et brouillon en cours.
- Charger Lucide depuis les dépendances locales verrouillées, sans CDN ; vérifier
  les pictos à l’accueil et après navigation/édition. Ne pas ajouter de nouveaux packs.
- Documenter lancement et limites : prototype avec données d’exemple, pas application
  connectée ni application mobile native. Conserver les quatre références de comparaison.

Vérification : suite complète `npm run check`, `npm run test:browser` étendue avec
horloge figée (minuit Paris et changement d’année), retour Aujourd’hui après changement
de jour, isolation des journées/eau, brouillons/annulation, thème au clavier et captures
petit/grand écran. L’aperçu HTTP réel doit charger Lucide sans injection du test ;
aucun placeholder d’icône non résolu ni erreur JavaScript. Réponse 404 aux chemins
inconnus ; écoute loopback seulement. Revues fonctionnelle, UI et tests sur commit exact.

Résultats locaux du 30 octobre : installation verrouillée Node24.22.1/npm11.13.0,
`npm run check` (256/256, lint/types/build) et parcours Chromium étendus réussis.
Captures `artifacts/browser/web-{light,dark}-{320,1024}.png` ; clair 320 et sombre
1024 inspectés par l’auteur. Icônes résolues à l’accueil et après navigation, sans
injection Lucide par le test de l’aperçu. Les parcours antérieurs restent exécutés.
La sandbox refuse les connexions loopback et ne voit pas Chromium installé ; les
exécutions finales sont réalisées hors sandbox, sans modifier les contrôles.

Limite distincte : `npm audit --json` signale un avis modéré existant dans le verrou,
`@hono/node-server` GHSA-rmxm-3fg6-px4f (serveStatic, versions <2.1.3). Ni cette
dépendance transitive ni son usage SDK ne sont modifiés par cette tâche ; l’aperçu
utilise node:http et une liste fermée de deux routes. Cet avis n’est pas ignoré :
si l’audit requis échoue en CI, l’intégration reste interdite et son correctif doit
être traité séparément. Aucun succès d’audit zéro ni livraison de production revendiqué.
