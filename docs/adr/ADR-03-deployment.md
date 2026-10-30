# ADR03 — accès et déploiement

État vérifié le30 octobre2026. Décision : développer et vérifier localement/CI,
sans prétendre avoir déployé sur Ubuntu. Le propriétaire a indiqué un Ubuntu
personnel avec Docker et accès SSH depuis son PC sur le LAN ; aucun accès serveur,
domaine, secret ou inventaire matériel n’est fourni dans le dépôt ou la session.
Contrôle local limité : aucun fichier ~/.ssh/config ; aucune connexion tentée ni
clé privée lue. Cela ne prouve pas l’absence d’un accès ailleurs sur le PC.

Manquent pour la production : cible Ubuntu/LAN et identité d’accès autorisée,
CPU/RAM/disque/versions réelles, domaine/DNS et proxy/TLS, secrets et exécutant
persistant, volumes/sauvegardes et procédure de récupération. Demander ces éléments
quand une livraison déployable sera prête, sous forme de question contextualisée.
Ne pas inventer d’adresse, scanner le réseau ou exposer SSH/admin pour avancer.

Docker Desktop local a été redémarré normalement le30 octobre ; pipe absent puis
sonde moteur sans réponse interrompue. Aucun reset, arrêt WSL global ou volume
supprimé. La CI Linux Docker reste la preuve requise pour les vrais services.
Les anciens essais locaux réussis ne garantissent pas sa disponibilité actuelle.

Choix imposés par le cahier : trois images applicatives identifiables par SHA,
PostgreSQL privé et données persistantes, HTTPS, secrets à l’exécution, déploiement
automatique après tous contrôles/revues sur develop, jamais master, santé puis
retour à une version compatible en cas d’échec. Aucune dépense autorisée nouvelle.
Le canal de déploiement et ses accès restent à implémenter/vérifier à L1/L8 ;
aucune production, sauvegarde ou restauration validée par ce document.
