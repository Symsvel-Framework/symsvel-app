# SymSvel APP

Interface **application** SvelteKit du framework SymSvel. Ce dépôt fournit les sources natives de l'interface ; une fois installées dans un projet, les modifications locales appartiennent au projet.

## Installation dans un projet SymSvel

Depuis un environnement disposant de la CLI SymSvel :

```bash
symsvel create-project --components=app
```

Pour un projet de développement ou un crash-test, ajouter `--dev`. Le BO est toujours inclus lors de la création ; `--components=all` installe BO, App et Front. La CLI et le Tooling pilotent l'installation, la provenance et les mises à jour. Ne pas recréer manuellement ce dépôt avec `npx sv create` pour installer un composant SymSvel.

## Développement du dépôt

```bash
npm ci
npm run dev
npm run check
npm run lint
npm run build
npm run qa
```

Les scripts sont définis dans `package.json`. `npm run qa` exécute les contrôles statiques, le build, les tests unitaires et Playwright ; l'exécution locale de Playwright peut nécessiter ses navigateurs. Le build utilise l'adaptateur statique SvelteKit déclaré dans les dépendances.

## Mises à jour dans les projets

```bash
symsvel update app
```

La mise à jour native est orchestrée par Tooling, avec suivi des fichiers gérés et contrôle des conflits. Elle ne doit ni écraser les modifications locales conflictuelles ni manipuler les branches Git du projet. Voir [le contrat technique](https://github.com/Symsvel-Framework/symsvel-tooling/blob/feat/60-update-init-simplification/docs/component-updates-v1.md).

Les parcours complets de création, Setup Wizard, synchronisation des modules et mises à jour doivent encore être éprouvés sur XT avant validation finale des PR CLI #10 et Tooling #62.

## Intégration continue

Le workflow `.github/workflows/ci.yml` utilise le runner Docker auto-hébergé de l'organisation (labels `self-hosted`, `linux`, `ARM64`, `symsvel`). Node.js 24 est installé par `actions/setup-node`, puis `npm ci` installe les dépendances et `npx playwright install chromium` fournit le navigateur. Les bibliothèques système Chromium doivent être préinstallées dans l'image du runner : le job ne lance pas `--with-deps`.

La CI conserve `npm run qa` (Svelte/TypeScript, lint, build statique, tests unitaires et Playwright) et vérifie `build/index.html`, `build/.htaccess` et `build/robots.txt`. Le workflow hébergé d'origine est conservé dans `.github/workflows/ci.yml.stub`, inactif. La migration doit être confirmée par une CI GitHub Actions verte.

## Parcours de session App et vérification (16/11/2026)

L'application possède désormais le client HTTP natif `src/lib/api/client.ts` et les préférences indépendantes `ui_lang` / `translation_lang` dans `locales.ts`. Les appels sans authentification (`/apiopen/auth/login`, `/apiopen/auth/refresh`, `/apiopen/auth/email-verification/*` et l'inscription `/apiopen/users/register`) utilisent `api(...,{public:true})`, qui supprime Authorization et cookies. Les appels authentifiés passent exclusivement par `appApi('/api/...')` et la session éphémère de `session.ts`. Un jeton BO ne doit jamais être accepté sur App.

Les pages natives `/login`, `/verify-email` et `/dashboard` consomment les endpoints Auth App. Le lien `/register` est fourni par le **module Users** via Tooling lorsque App est installée. Les textes FR/EN des pages sont externalisés dans `src/lib/i18n/auth.ts`. Le lien de confirmation est construit automatiquement par Auth depuis le domaine `local_domain` enregistré au Setup, sous la forme `https://app.<domaine>/verify-email`. Il n'existe pas de paramètre Settings `auth.app_verify_email_url` à renseigner ; le jeton est temporairement lu à l'arrivée, retiré immédiatement de l'historique et envoyé par POST public, puis détruit.

Comme pour le BO, les tokens d'accès/refresh sont **en mémoire JavaScript seulement**, sans localStorage ni cookies JS : le rechargement complet demande une nouvelle connexion. Il s'agit d'un transport transitoire, non validé pour la production, dans l'attente du canal HttpOnly/Secure et des règles CORS/CSRF. Les tests unitaires portés depuis le client BO exercent cette isolation, le renouvellement et les courses de session. CI, compilation du module Users synchronisé et crash-tests HTTP/SGBD réels sont nécessaires avant clôture.

### Correction du workflow de formatage et des tests (16/11/2026)

Le runner App peut lire le dépôt, mais sa connexion GitHub Actions n'a pas de droit `push` (HTTP 403). Le job n'essaie plus de pousser automatiquement ses corrections Prettier : il formate **uniquement dans son workspace éphémère** avant les contrôles. Les sources doivent être formatées et commitées par le mainteneur lorsque nécessaire ; l'absence de push en CI ne doit pas masquer un échec fonctionnel.

Deux assertions copiées depuis le client BO ont été adaptées à la véritable séparation App : `appApi` rejette `/apiopen/*` (pas `/api/users`), et le client refuse explicitement une identité `context:bo`. Aucun contrat de sécurité runtime n'est assoupli.

### Tests navigateurs App (16/11/2026)

`src/routes/app-auth.e2e.ts` vérifie dans Chromium les écrans natifs avec réponses API simulées : connexion App, vérification de session avec Bearer App, déconnexion, refus de connexion, confirmation d'e-mail avec retrait du jeton d'URL, et renvoi anonyme d'une confirmation. La validation contrôle aussi les paramètres HTTP et l'absence d'Authorization sur les appels `/apiopen`. Ces tests s'ajoutent aux tests Vitest du client, mais ne remplacent pas les crash-tests avec le vrai backend et l'envoi SMTP.

### Navigation vers une route ajoutée par Users (16/11/2026)

La page native `/login` propose `/register` seulement après synchronisation du module Users. Le dépôt App hôte, qui se compile aussi indépendamment, ne connaît pas cette route dans les types SvelteKit. L'URL est construite avec `resolve('/')` (préfixe de déploiement natif) suivi de `register`. L'unique lien utilisant cette URL calculée désactive localement la règle ESLint `svelte/no-navigation-without-resolve` ; les autres liens internes gardent `resolve()` directement. On évite ainsi toute modification générale du lint ou des routes typées. Les CI App et Users assemblée doivent valider ce cas de module facultatif.

## Réinitialisation du mot de passe App (16/11/2026)

Les routes natives `/forgot-password` et `/reset-password` utilisent les nouveaux endpoints Auth publics `/apiopen/auth/password-reset/request` et `/apiopen/auth/password-reset/complete`. Une demande ne révèle pas l'existence du compte et ne peut envoyer de mail qu'à une adresse déjà vérifiée. Le lien HTTPS est défini côté Settings dans `auth.app_reset_url` : sa valeur doit cibler `https://app.exemple.test/reset-password` sans query string. À l'ouverture, le jeton à usage unique est retiré de l'historique du navigateur, puis transmis uniquement par POST public après double saisie du mot de passe (12 à 1024 octets, sans NUL). Auth révoque les sessions App existantes lors du changement de mot de passe.

Les messages FR/EN sont déclarés dans `src/lib/i18n/auth.ts` ; aucun appel ne nécessite ou ne crée une session avant la prochaine connexion. Les tests Playwright `app-reset.e2e.ts` contrôlent le formulaire, l'absence de Bearer, le secret retiré de l'URL et le message non énumérant. CI Svelte et CT avec la vraie BDD et SMTP restent nécessaires.

## Indicateur de robustesse sur les écrans de création de mot de passe (16/11/2026)

Le helper natif `src/lib/password/strength.ts` calcule sur la saisie un indicateur **descriptif** de diversité (longueur, catégories de caractères) et applique exactement le contrat serveur actuel : 12 à 1024 **octets UTF-8**, sans NUL. Le score de 0 à 4 n'est ni une estimation cryptographique ni une exigence supplémentaire ; la saisie n'est pas rejetée pour l'absence d'une majuscule ou d'un symbole. Les modules peuvent réutiliser ce helper dans leurs formulaires sans dupliquer les règles, avec libellés externalisés FR/EN. Vitest protège les limites, Unicode, NUL et score. CT navigateur et CI requis.

### Indicateur de mot de passe sur `/reset-password` (16/11/2026)

La page utilise le helper natif `passwordStrength()` (règle serveur inchangée : 12 à 1024 octets UTF-8, sans NUL) et présente une jauge de diversité traduite FR/EN. Les classes de caractères influencent l'indicateur uniquement, sans imposer une nouvelle contrainte serveur. La validation de formulaire emploie `strength.valid`, et les attributs HTML `minlength` en caractères ont été retirés pour éviter les divergences sur les saisies Unicode. CI et CT à vérifier.
