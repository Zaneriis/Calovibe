# Interfaces techniques L1

Contrat de départ pour les vrais services, à revoir avec L0-CONVERGENCE avant code.
Ce document ne prétend pas livrer les services et ne modifie pas les31 contrats
alimentaires. Backend, web et MCP ont leurs builds et images distincts ; seul le
backend accède aux données applicatives. Les maquettes restent des références.

| Interface | Comportement à implémenter et vérifier |
|---|---|
| GET /health/live |200 minimal, processus en vie seulement, sans secret ni configuration ; aucun accès métier |
| GET /health/ready | Interne ;200 si dépendances nécessaires disponibles,503 sinon ; ne pas présenter le simple live comme disponibilité complète |
| GET /api/_technical/status | Route privée backend ; session valide ou jeton API valable, lecture autorisée ;200 `{schemaVersion:"0.1.0",status:"ready",version:"<SHA>"}` ;401 non authentifié,403 identité/droit refusé |
| GET /auth/login | Backend initie OIDC Code/PKCE avec transaction bornée, state/nonce uniques et callback fixe ; pas de redirectUri libre |
| GET /auth/callback | Code/transaction à usage unique ; vérifier state, PKCE, nonce, issuer, signature, audience, expiration ; associer propriétaire par issuer/sub avant session |
| GET /api/session | Session web valide :200 `{authenticated:true,csrfToken:"<lié à la session>"}` ;401 sinon. Ne jamais renvoyer jetons OIDC, identifiant de session ou secret |
| POST /auth/logout | Session+CSRF+Origin exact requis ; invalider côté serveur et expirer cookie ;204 ; aucune déconnexion par GET |
| POST /mcp | SDK officiel, Streamable HTTP2026-07-28, découverte/challenge conformes ADR02, jeton audience MCP exclusif ; aucun token API admis en entrée |
| Outil calovibe_service_status | Entrée `{}` ; lecture seulement. Délégation native avec jeton aval audience API distincte, même sujet et droits en intersection ; appel réel de /api/_technical/status ; sortie structurée conforme au résultat API. Aucun accès SQL ni repli sur compte plus puissant |

Le seul outil annoncé dans ce premier socle est ce statut technique. Les31
outils alimentaires ne sont pas listés avec de fausses réponses en attendant L2.
Un outil absent/inconnu reçoit l’erreur protocolaire normale, pas une fixture.

Session : identifiant opaque stocké haché côté PostgreSQL, cookie
`__Host-calovibe-session` Secure/HttpOnly/SameSite=Lax/Path=/ sans Domain ; rotation
à connexion, expiration serveur30min inactivité/12h absolues, déconnexion réelle.
Les mutations cookie vérifient CSRF lié à la session et Origin exact ; refuser une
requête mélangeant Cookie de session et Bearer. Une expiration ne rejoue aucune
écriture et ne détruit pas le brouillon/date/repas conservés par le client.

URLs d’issuer, origine web et ressources API/MCP : explicites, stables, distinctes
et vérifiées à l’exécution. Pas de remplacement silencieux d’issuer entre navigateur
et serveur. Le développement doit fournir un parcours local documenté et les tests
HTTPS avec une CA propre au banc ; pas d’installation dans le magasin global du PC,
de domaine de production inventé, de désactivation TLS présentée comme validation.
La solution de proxy/DNS local est un détail technique à qualifier par le développeur
dans ce contrat de sécurité, sans exposition administrative publique.

PostgreSQL : migrations SQL versionnées, transaction et verrou de migration,
rôle runtime sans DDL/superutilisateur, propriétaire issuer/sub et tables techniques
session/transactionOIDC uniquement. Pas de runtime DDL. Réseau privé, aucun port
base publié. Le web/MCP n’ont ni identifiants ni accès base applicative.

Images : build par service, version SHA, utilisateur sans privilèges, secrets montés
à l’exécution, fermeture HTTP/transport/pool à SIGTERM, santé réelle. Compose de
test utilise projet/ports/volumes propres, cleanup ciblé ; redémarrer conserve les
données du projet explicitement persistant. Pas de prune global ni volume personnel.

Preuves L1 : installation/builds, démarrage des vraies entrées, refus anonymes et
identités non propriétaires, OAuth/session/CSRF/expiration/logout, réel MCP→API,
indisponibilité base503, arrêt propre, secrets absents des images/assets/logs,
et parcours web rendu clair/sombre petit/grand/clavier. Tests ne prouvant pas ces
comportements ne doivent pas être présentés comme une livraison L1.
