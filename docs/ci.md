# Intégration continue

Depuis le 22/11/2026, la CI des dépôts publics SymSvel s'exécute sur **GitHub-hosted Ubuntu 24.04**, sans runner local. `.github/workflows/ci.yml` utilise Node.js 24, npm et Chromium/Playwright avec ses dépendances système ; déclencheurs : push sur `dev` et `main`, PR vers `main`. `ci.yml.stub` est une archive inactive.

Les runners auto-hébergés du mainteneur restent réservés aux dépôts privés `symsvel-packages` et `symsvel-recipes`. Les validations CI ne remplacent pas les crash-tests locaux.

## Releases sur GitHub-hosted (22/11/2026)

La publication de tags `vX.Y.Z` par `.github/workflows/release.yml` s'exécute sur GitHub-hosted Ubuntu 24.04. Elle conserve Node.js 24 et Playwright avec `--with-deps`, la vérification du tag, les contrôles existants et la création de GitHub Release via `actions/github-script@v7`. Aucun tag n'a été créé durant cette migration ; la validation d'une release réelle reste nécessaire.

## Première release fonctionnelle (20/11/2026)

Le libellé historique « Aucun changement fonctionnel » est remplacé par des notes générées à partir des changements réels. La QA doit précéder la GitHub Release, déclenchée exclusivement par un tag Git vérifié. Le CT final sans `--dev` est distinct des quatre CT de développement.

## Correctif du workflow de publication App (20/11/2026)

Le premier tag `v1.1.0` a échoué dans le job de release : `npm run qa` exécute `prettier --check .` et a trouvé 20 fichiers non formatés. La CI des branches réussissait car son workflow exécute explicitement `npm run format` avant `npm run qa`. Le workflow de release applique désormais la **même préparation que la CI** avant ses contrôles, sans changer le build ni les dépendances. Le tag `v1.1.0` reste immuable : après CI verte et inspection du job, publier une nouvelle version corrective `v1.1.1`, sans déplacer ou supprimer le tag historique. Le statut de la release n'est acquis qu'après QA et publication GitHub réussies.


### Variables publiques du client Vite (22/11/2026)

Les clients SvelteKit lisent `import.meta.env.PUBLIC_API_URL`. Vite ne publie
pas `PUBLIC_*` via `import.meta.env` par défaut ; le projet utilise
`envPrefix: ['VITE_', 'PUBLIC_']` dans `vite.config.ts` pour respecter
le préfixe public du contrat SymSvel. Les URL sont des données publiques,
jamais des secrets. Les CD de projets doivent passer `PUBLIC_API_URL`
pendant le build, et non au runtime du serveur statique.

## Branding public du projet

Le layout racine fournit un store par instance via `provideProjectBrand()`. Une requête anonyme à `/apiopen/project` est effectuée après hydratation. Les routes et composants appellent `getProjectBrand()` lors de leur initialisation, puis affichent `$brandName` dans les titres et les en-têtes. Login, dashboard, récupération et vérification d'adresse partagent le store lors des navigations. Le nom `SymSvel` sert uniquement de repli. La CI couvre la navigation et le repli par Playwright ; le CT doit vérifier le nom réel du projet après déploiement. Le build statique utilise `PUBLIC_API_URL` pour l'origine Back.

## Choix du mot de passe

Le composant natif `lib/password/PasswordFeedback.svelte` affiche en FR/EN les cinq critères de création (12 caractères Unicode minimum, majuscule, minuscule, chiffre et symbole ou ponctuation), rouge/vert avec marque textuelle, et une jauge indicative. `passwordStrength().valid` applique ces critères et les garde-fous UTF-8 (1024 octets maximum, sans NUL). Les tests unitaires couvrent les limites et les classes Unicode. Le parcours reset l'utilise ; les modules App doivent consommer le même composant. Auth reste l'autorité serveur ; aucun changement aux connexions avec un ancien mot de passe.

## Shell App et routes de modules

Le layout racine conserve le shell authentifié lors de la navigation entre les routes privées, y compris `/profile` fourni par Users. Les parcours publics (connexion, inscription, activation, récupération, confirmations et challenge 2FA) restent hors shell. Le shell hôte vérifie la session via `currentApp`, sans modifier la politique de session Auth en mémoire. Les modules ne fournissent que le contenu de leur page. Les tests de classification des routes et de navigation protègent ce contrat ; la CI Users vérifie le profil assemblé.

La route temporaire `/ct-remote`, utilisée pour le CT de mise à jour des composants, n’est plus distribuée. Le moteur natif retire le fichier installé s’il n’a pas été modifié localement ; les scénarios de mise à jour continuent d’utiliser leurs propres fixtures isolées dans Tooling.

## Point de montage confidentialité facultatif (28/11/2026)

Le layout app monte au plus une fois l'entrée native `src/lib/modules/gdpr/Runtime.svelte` lorsqu'elle est synchronisée par Tooling. Le glob Vite exact fonctionne aussi sans GDPR installé ; aucune importation statique obligatoire, aucun SDK, appel de consentement ou logique métier dans le layout. Le scope app est fixé par l'hôte et la langue provient de la langue UI App ou du navigateur, avec fallback FR. Le layout reste propriété de l'hôte : le module ne l'écrase pas. La CI hôte vérifie le build autonome ; la CI GDPR doit vérifier le build assemblé et le point de montage réel avant intégration. BO inchangé.
