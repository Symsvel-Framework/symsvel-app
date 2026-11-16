<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { api, ApiError } from '../../lib/api/client';
  import { uiLanguage } from '../../lib/api/locales';
  import { authLabels } from '../../lib/i18n/auth';
  import { passwordStrength } from '../../lib/password/strength';

  let token = $state<string | null>(null);
  let loaded = $state(false);
  let completed = $state(false);
  let password = $state('');
  let confirmation = $state('');
  let busy = $state(false);
  let error = $state('');
  const language = $derived($uiLanguage ?? (typeof navigator === 'undefined' ? 'en' : navigator.language));
  const t = $derived(authLabels(language));
  const strength = $derived(passwordStrength(password));

  onMount(() => {
    const candidate = new URLSearchParams(window.location.search).get('token');
    token = candidate && /^[A-Za-z0-9_-]{43}$/.test(candidate) ? candidate : null;
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
    loaded = true;
  });

  async function complete(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!token || busy) return;
    error = '';
    if (password !== confirmation) {
      error = t.resetMismatch;
      return;
    }
    if (!strength.valid) {
      error = t.resetInvalidPassword;
      return;
    }
    busy = true;
    try {
      await api<{ status: 'completed' }>('/apiopen/auth/password-reset/complete', {
        public: true, method: 'POST', body: JSON.stringify({ token, password })
      });
      password = '';
      confirmation = '';
      token = null;
      completed = true;
    } catch (cause) {
      error = cause instanceof ApiError && cause.status === 400 ? t.resetInvalidToken : t.genericError;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>{t.resetTitle} | SymSvel App</title><meta name="referrer" content="no-referrer" /></svelte:head>
<main class="auth-shell">
  <section class="auth-card">
    <header><strong>SymSvel</strong><span>App</span></header>
    <h1>{t.resetTitle}</h1>
    {#if completed}
      <p role="status">{t.resetSuccess}</p>
    {:else if loaded && !token}
      <p class="alert" role="alert">{t.resetInvalidToken}</p>
    {:else if loaded}
      {#if error}<p class="alert" role="alert">{error}</p>{/if}
      <form class="form" onsubmit={complete}>
        <label for="reset-password">{t.newPassword}</label>
        <input id="reset-password" type="password" autocomplete="new-password" maxlength="1024" bind:value={password} required />
        <small>{t.resetPasswordRule}</small>
        <meter min="0" max="4" value={strength.score} aria-label={t.passwordStrength} />
        <small aria-live="polite">{t.passwordStrength}: {t.strengthLevels[strength.score]}</small>
        <small>{t.strengthHint}</small>
        <label for="reset-confirm">{t.confirmPassword}</label>
        <input id="reset-confirm" type="password" autocomplete="new-password" maxlength="1024" bind:value={confirmation} required />
        <button type="submit" disabled={busy}>{t.resetButton}</button>
      </form>
    {/if}
    <p><a href={resolve('/login')}>{t.backToLogin}</a></p>
  </section>
</main>

<style>
  meter { display: block; width: 100%; height: 13px; }
  small { color: #667085; }
</style>
