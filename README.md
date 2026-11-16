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

Les pages natives `/login`, `/verify-email` et `/dashboard` consomment les endpoints Auth App. Le lien `/register` est fourni par le **module Users** via Tooling lorsque App est installée. Les textes FR/EN des pages sont externalisés dans `src/lib/i18n/auth.ts`. L'URL d'e-mail côté Settings `auth.app_verify_email_url` doit pointer vers `https://app.exemple.test/verify-email`, sans query string ; le jeton est temporairement lu à l'arrivée, retiré immédiatement de l'historique et envoyé par POST public, puis détruit.

Comme pour le BO, les tokens d'accès/refresh sont **en mémoire JavaScript seulement**, sans localStorage ni cookies JS : le rechargement complet demande une nouvelle connexion. Il s'agit d'un transport transitoire, non validé pour la production, dans l'attente du canal HttpOnly/Secure et des règles CORS/CSRF. Les tests unitaires portés depuis le client BO exercent cette isolation, le renouvellement et les courses de session. CI, compilation du module Users synchronisé et crash-tests HTTP/SGBD réels sont nécessaires avant clôture.

### Correction du workflow de formatage et des tests (16/11/2026)

Le runner App peut lire le dépôt, mais sa connexion GitHub Actions n'a pas de droit `push` (HTTP 403). Le job n'essaie plus de pousser automatiquement ses corrections Prettier : il formate **uniquement dans son workspace éphémère** avant les contrôles. Les sources doivent être formatées et commitées par le mainteneur lorsque nécessaire ; l'absence de push en CI ne doit pas masquer un échec fonctionnel.

Deux assertions copiées depuis le client BO ont été adaptées à la véritable séparation App : `appApi` rejette `/apiopen/*` (pas `/api/users`), et le client refuse explicitement une identité `context:bo`. Aucun contrat de sécurité runtime n'est assoupli.
