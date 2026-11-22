# Intégration continue

Depuis le 22 novembre 2026, les workflows CI de ce dépôt public s'exécutent sur **GitHub-hosted Ubuntu 24.04** et non sur les runners Docker du mainteneur. `.github/workflows/ci.yml` conserve les tests et utilise Node.js 24 (SvelteKit, npm, Playwright et build statique). Déclencheurs : `push` sur `dev` et `main`, et pull requests vers `main`. Le fichier `ci.yml.stub` n'est qu'une archive inactive de la configuration historique.

Les runners auto-hébergés sont réservés aux dépôts privés d'infrastructure `symsvel-packages` et `symsvel-recipes`. Une CI verte n'exonère pas des crash-tests locaux exigés par SymSvel.
 

La branche `dev` est le terrain de développement ; `main` conserve la version stable.

Le workflow `.github/workflows/ci.yml` est déclenché par les `push` sur `dev` et `main`, ainsi que par les pull requests ciblant `main`. Les pull requests ciblant `dev` ne déclenchent pas de CI au titre de l'événement `pull_request` ; un `push` sur `dev` déclenche sa propre exécution. Les éventuels déclencheurs supplémentaires définis dans le workflow restent applicables.

Les jobs utilisent les runners auto-hébergés configurés dans le workflow. Une modification n'est validée qu'après exécution et réussite de la CI, puis les crash-tests locaux requis.

## Releases sur GitHub-hosted (22/11/2026)

Le workflow `.github/workflows/release.yml` s'exécute désormais sur **GitHub-hosted Ubuntu 24.04** pour les tags `vX.Y.Z`. Il conserve les validations existantes, Node.js 24 et Playwright avec installation des dépendances système, ainsi que la vérification du tag et la GitHub Release via `actions/github-script@v7`. L'autorisation `contents: write` reste requise pour publier. Aucun tag n'a été créé pendant la migration ; une release réelle devra être validée séparément.


La release déclenchée par un tag `vX.Y.Z` utilise maintenant `[self-hosted, linux, ARM64, symsvel]`. Le setup Node.js 24, les tests Playwright et la génération SvelteKit demeurent ; `npx playwright install chromium` réutilise le fonctionnement de la CI sans installer de paquets système. La publication GitHub génère des notes de changements réelles et vérifie le tag via `actions/github-script@v7`, sans dépendre du binaire `gh` (non garanti sur le runner). L'autorisation `contents: write` est maintenue, aucun tag n'est créé ici. Validation par release réelle et CT de l'artefact requise.

## Première release fonctionnelle (20/11/2026)

Le libellé historique « Aucun changement fonctionnel » est remplacé par des notes générées à partir des changements réels. La QA doit précéder la GitHub Release, déclenchée exclusivement par un tag Git vérifié. Le CT final sans `--dev` est distinct des quatre CT de développement.

## Correctif du workflow de publication App (20/11/2026)

Le premier tag `v1.1.0` a échoué dans le job de release : `npm run qa` exécute `prettier --check .` et a trouvé 20 fichiers non formatés. La CI des branches réussissait car son workflow exécute explicitement `npm run format` avant `npm run qa`. Le workflow de release applique désormais la **même préparation que la CI** avant ses contrôles, sans changer le build ni les dépendances. Le tag `v1.1.0` reste immuable : après CI verte et inspection du job, publier une nouvelle version corrective `v1.1.1`, sans déplacer ou supprimer le tag historique. Le statut de la release n'est acquis qu'après QA et publication GitHub réussies.
