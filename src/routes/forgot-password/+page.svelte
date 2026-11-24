<script lang="ts">
  import { getProjectBrand } from '../../lib/branding';
  const brandName = getProjectBrand();
  import { resolve } from '$app/paths';
  import { api } from '../../lib/api/client';
  import { uiLanguage } from '../../lib/api/locales';
  import { authLabels } from '../../lib/i18n/auth';

  let email = $state('');
  let busy = $state(false);
  let accepted = $state(false);
  let error = $state('');
  const language = $derived($uiLanguage ?? (typeof navigator === 'undefined' ? 'en' : navigator.language));
  const t = $derived(authLabels(language));

  async function requestReset(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    busy = true;
    error = '';
    try {
      await api<{ status: 'accepted' }>('/apiopen/auth/password-reset/request', {
        public: true,
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          locale: language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
        })
      });
      accepted = true;
    } catch {
      error = t.genericError;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>{t.resetRequestTitle} | {$brandName} App</title></svelte:head>
<main class="auth-shell">
  <section class="auth-card">
    <header><strong>{$brandName}</strong><span>App</span></header>
    <h1>{t.resetRequestTitle}</h1>
    <p>{t.resetRequestHint}</p>
    {#if error}<p class="alert" role="alert">{error}</p>{/if}
    {#if accepted}<p role="status">{t.resetRequestAccepted}</p>{/if}
    {#if !accepted}
      <form class="form" onsubmit={requestReset}>
        <label for="recovery-email">{t.email}</label>
        <input id="recovery-email" type="email" autocomplete="email" bind:value={email} required maxlength="254" />
        <button type="submit" disabled={busy}>{t.resetRequestButton}</button>
      </form>
    {/if}
    <p><a href={resolve('/login')}>{t.backToLogin}</a></p>
  </section>
</main>
