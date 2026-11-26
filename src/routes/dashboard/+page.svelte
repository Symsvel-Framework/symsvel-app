<script lang="ts">
  import { getProjectBrand } from '../../lib/branding';
  import { uiLanguage } from '../../lib/api/locales';
  import { authLabels } from '../../lib/i18n/auth';
  import { generatedTranslation } from '../../lib/i18n/generated-translations';
  const brandName = getProjectBrand();
  const language = $derived($uiLanguage ?? (typeof navigator === 'undefined' ? 'en' : navigator.language));
  const t = $derived(authLabels(language));
  const title = $derived(generatedTranslation(language, 'app.system.dashboard.title') ?? t.dashboard);
  const loggedIn = $derived(generatedTranslation(language, 'app.system.dashboard.loggedIn') ?? t.loggedIn);
</script>

<svelte:head><title>{title} | {$brandName} App</title></svelte:head>
<section class="welcome"><h1>{title}</h1><p>{loggedIn}</p></section>
