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

## Intégration continue GitHub-hosted (22/11/2026)

La CI de ce dépôt public utilise désormais **Ubuntu 24.04 sur les runners GitHub**, sans dépendance au Docker du mainteneur. Le workflow actif est `.github/workflows/ci.yml` ; il installe Node.js 24, lance `npm ci`, installe Chromium avec `npx playwright install --with-deps chromium` et conserve les contrôles Svelte/TypeScript, lint, build, tests unitaires et Playwright.  L'ancienne version `ci.yml.stub` est inactive.

La publication par tag (`.github/workflows/release.yml`) utilise elle aussi GitHub-hosted. Les runners auto-hébergés sont réservés à `symsvel-packages` et `symsvel-recipes`, qui restent privés. Une CI verte ne remplace pas les crash-tests locaux.


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

## Fallback français des libellés d'interface (17/11/2026)

Les libellés intégrés de l'interface sont sélectionnés à partir de la langue d'interface (code ISO du navigateur ou du compte). Lorsque la locale n'a pas de dictionnaire intégré, les libellés français sont utilisés ; l'anglais reste disponible explicitement pour `en`. Le fallback ne modifie ni la langue ISO du site ni celle du compte et n'impose pas l'existence de traductions avant l'installation. Le repli doit être réalisé à la clé lors de l'introduction des dictionnaires dynamiques ; l'éditeur BO des traductions et le chargement fichier/BDD ne sont pas fournis par cette seule correction.

Vérifications : tests de sélection FR/EN/autres locales et tests de build/CI. La validation finale nécessite les crash-tests locaux sur le parcours Setup, BO et App.

### Compatibilité Svelte de la jauge de récupération (17/11/2026)

La route `/reset-password` ferme explicitement la balise HTML non vide `<meter></meter>` ; la forme `<meter />` générait un avertissement de compilation Svelte 5 lors des scénarios Playwright. Cette correction ne change pas le calcul de robustesse ni les règles de mot de passe. Le parcours d'inscription Users dispose de la correction correspondante dans son module propriétaire. Les CI et le CT utilisateur restent la validation finale.


## Dictionnaires statiques de traductions (17/11/2026)

Le dictionnaire `src/lib/i18n/generated/<lang>.ts` est publié localement par SymSvel Tooling depuis Languages, puis inclus dans les builds SvelteKit par `src/lib/i18n/generated-translations.ts` (`import.meta.glob`). Les fichiers générés sont facultatifs, y compris lors d'une installation vierge ; le fallback à la clé prend le dictionnaire français disponible, puis les libellés intégrés. La langue ISO du compte ne change pas. `authLabels()` lit désormais les clés `auth.*` du dictionnaire généré pour ses libellés textuels. Les textes des modules supplémentaires doivent suivre le même contrat. Aucun accès Redis/BDD n'est requis pour rendre ces fichiers statiques et il faut rebuild via Git/CD après leur mise à jour.


## App : connexion avec module 2FA optionnel (17/11/2026)

Si `symsvel-framework/module-two-factor` est installé, `/apiopen/auth/login` peut répondre HTTP 202 avec un challenge temporaire. Le client conserve celui-ci en mémoire et la page de connexion dirige vers `/two-factor`, route apportée par le module Svelte uniquement au moment de sa synchronisation. Sans module, la connexion normale est conservée. `completeAppSecondFactor` valide le challenge via `/apiopen/auth/second-factor` puis confirme l'identité via `/api/auth/me` avant d'accepter la session.

Aucun refresh token n'est persisté dans le navigateur ; aucun code TOTP n'est mémorisé au-delà de la saisie. Les codes de secours ne sont visibles qu'après l'enrôlement initial. Vérifier au CT l'installation BO seul, App et les routes optionnelles, avec politiques 2FA indépendantes.

## QR TOTP du module TwoFactor (18/11/2026)

Le module TwoFactor propose un QR d'enrôlement basé sur l'URI
`provisioning_uri`, dessiné **localement dans le navigateur** à l'aide de
`qrcode@^1.5.4` et `@types/qrcode@^1.5.5` fournis par l'hôte App.
Le secret TOTP reste dans le challenge temporaire pré-session ; aucun service
externe ne reçoit la clé et aucun jeton n'est ajouté à un stockage persistant.
La saisie manuelle reste possible si le QR ne peut pas être affiché.

Pour les projets avec App, lancer `symsvel update app` avant de synchroniser
la nouvelle version du module TwoFactor afin de mettre à jour le lock npm
et reconstruire l'interface. Vérifier au CT le scan et la saisie du code.

## Traductions des composants et modules (18/11/2026)

Les textes système sont fournis par le composant sous `src/lib/translations/system/<lang>.ts` ; les textes des modules par Tooling sous `src/lib/translations/<module>/<lang>.ts`. La convention est `<scope>.<module|system>.<key>`. Le helper préfère `src/lib/translations/generated` et conserve une lecture des anciens `src/lib/i18n/generated` durant la migration. Chargement statique au build, fallback français à la clé, aucune requête runtime.

Les libellés d'authentification de l'App, y compris les niveaux de robustesse, appartiennent au module Auth. L'hôte conserve son helper et son fallback embarqué mais utilise les clés canoniques `app.auth.*`, dont les fichiers source proviennent de `symsvel-module-auth/app/src/lib/translations` via Tooling.

### Dictionnaires et formatage

`src/lib/translations/**` est exclu de Prettier, car ces fichiers sont des exports TypeScript de données JSON strictes analysées par Tooling. Les dictionnaires synchronisés depuis les modules et les fichiers générés par Languages ne doivent pas être réécrits en objets JavaScript à clés non citées. Les autres sources du projet restent formatées normalement.

### Propriété des textes natifs de l'App

Le tableau de bord hôte est indépendant des modules : ses libellés sont désormais dans `src/lib/translations/system/{fr,en}.ts`, aux clés `app.system.dashboard.*`. Les actions de connexion, déconnexion et vérification de session restent propres au module Auth (`app.auth.*`). Le composant conserve ses textes existants comme fallback et ne demande aucune API runtime.


### Validation CI de la branche de traduction (18/11/2026)

La CI complète de `feat/translations-sources` a terminé avec succès sur les runners locaux. Le déclencheur temporaire de cette branche a été retiré du workflow, en conservant les déclencheurs habituels `dev`, `main` et PR. Les tests d'installation et crash-tests XT restent indispensables avant le merge.

### Compatibilité de la migration du dashboard App

Les anciennes personnalisations de `auth.dashboard` et `auth.loggedIn` ont été déplacées en BDD par Languages vers `app.system.dashboard.title` et `app.system.dashboard.loggedIn`. Le helper App consulte également les anciennes clés des fichiers `lib/i18n/generated` durant la transition, en donnant toujours priorité aux surcharges canoniques. Cela évite une disparition temporaire des personnalisations avant republication locale.

### CI de la compatibilité du dashboard App (18/11/2026)

La dernière CI de `feat/translations-sources`, comprenant le repli des anciennes clés `auth.dashboard` et `auth.loggedIn`, est verte. Le déclencheur de la branche de travail a été retiré ; les règles habituelles de CI `dev`/`main` sont restaurées. Les crash-tests XT et l'installation multi-dépôts restent nécessaires.

## Accès au profil App (19/11/2026)

Le dashboard de l'App fournit désormais un lien vers `/profile` du module
natif Users, lorsque le dashboard authentifié est rendu. Le module
Users possède l'écran, ses libellés et l'API de profil ; le dashboard
n'implémente pas de gestion des comptes ni de logique de validation.
Ce lien est une étape minimale avant la conception du shell App complet,
explicitement reportée après la stabilisation du BO.

Comme les tokens App sont conservés en mémoire, la navigation client Svelte
doit être testée sur XT sans provoquer de rechargement complet du document.
Un rechargement explicite peut encore imposer une nouvelle connexion selon
la politique de session App existante. CI + CT requis.

## Branding public (19/11/2026)

La connexion et le dashboard lisent le nom du projet depuis
`GET /apiopen/project`, via `api(..., { public: true })`.
Le Back ne publie que `data.name` validé ; l'App ne consulte jamais
`.symsvel/project.json` ou les données privées du Setup. En
l'absence de réponse, le repli est `SymSvel`. L'intitulé affiché
et le titre des pages natives sont adaptés sans serveur Node et sans
rebuild du Svelte statique pour un changement de nom.

Le rendu Svelte échappe systématiquement le texte. Ce correctif
ne prend pas encore en charge la personnalisation des images, ni
un shell App complet, qui reste différé après stabilisation du BO.
CT XT nécessaire, notamment sur les origines CORS App et un nom Unicode.

### Validation Unicode du titre (19/11/2026)

Le validateur de nom public teste les codes Unicode des caractères
(`codePointAt`) pour refuser les contrôles ASCII, sans expression
régulière contenant ces caractères. Le même contrat de sécurité et
le repli `SymSvel` sont préservés. Correction pour `no-control-regex`
en CI, sans modifier l'API, la session ou le rendu du projet.

## Licence MIT et contributions

Ce dépôt est distribué sous [licence MIT](LICENSE). Le code peut être utilisé, modifié et redistribué, y compris dans des projets commerciaux ou propriétaires, dans les conditions de cette licence (notamment la conservation de la notice de copyright et de licence).

**Contribuer :** créer un fork, puis proposer une pull request vers `dev` lorsque cette branche existe, sinon vers la branche par défaut. Expliquer la modification et fournir les tests et la documentation concernés. Les mainteneurs conservent la maîtrise des revues, des validations (CI et crash-tests), de l'intégration et des releases officielles. Une PR ne garantit pas son acceptation.

**Versions officielles :** seules les versions diffusées par l'organisation [Symsvel-Framework](https://github.com/Symsvel-Framework) sont officielles. Les forks sont libres sous MIT, mais ne doivent pas être présentés comme officiellement approuvés par les mainteneurs. Cette distinction n'ajoute aucune restriction aux droits accordés par la licence MIT sur le code.
