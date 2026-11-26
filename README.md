# SGC Fiscalité
App statique (PWA) de suivi des obligations et échéances fiscales en Tunisie : mensuelles, trimestrielles, annuelles, taxation d'office / contrôles, calendrier fiscal. Même design et même architecture que SGC Échéancier.

## Publication GitHub (code public, données privées)
1. Dépôt PUBLIC `sgc-fiscalite` : *Add file → Upload files*, glisser tout le contenu du dossier (y compris `logos/`, `icons/`, `.nojekyll`), *Commit changes*. *Settings → Pages → Deploy from a branch → main / (root)*.
2. Dépôt PRIVÉ `sgc-fiscalite-data` avec un README. Jeton fine-grained limité à ce dépôt, *Contents : Read and write*.
3. Dans l'app : Plus → Synchronisation, renseigner dépôt + jeton + mot de passe de l'espace. Sur le téléphone : « Rejoindre » avec le code de liaison.
4. Mises à jour : renvoyer les fichiers modifiés dans le dépôt du CODE uniquement, attendre ~1 min, Ctrl+F5.

## À savoir
- Logos : fichiers provisoires dans `logos/` (mêmes noms que SGC Échéancier). Remplacer par les vrais logos SGC.
- Dates : issues des agendas DGI 2026. Celles marquées « à confirmer » (employeur, impôt sur la fortune) et les délais de contrôle sont à vérifier avec les textes en vigueur.
- Notifications : uniquement app ouverte.
