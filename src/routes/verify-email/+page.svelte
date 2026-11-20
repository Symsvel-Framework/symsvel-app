<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { ApiError, api } from '../../lib/api/client';
  import { uiLanguage } from '../../lib/api/locales';
  import { authLabels } from '../../lib/i18n/auth';

  let confirmed = $state(false);
  let hasToken = $state(false);
  let busy = $state(false);
  let resendBusy = $state(false);
  let email = $state('');
  let error = $state('');
  let feedback = $state('');
  const language = $derived($uiLanguage ?? (typeof navigator === 'undefined' ? 'en' : navigator.language));
  const t = $derived(authLabels(language));

  onMount(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
    if (!token) return;
    hasToken = true;
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      error = t.verificationFailed;
      return;
    }
    busy = true;
    void api<{ status: string }>('/apiopen/auth/email-verification/complete', {
      public: true, method: 'POST', body: JSON.stringify({ token })
    }).then(() => { confirmed = true; }).catch(() => {
      error = t.verificationFailed;
    }).finally(() => { busy = false; });
  });

  async function resend(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (resendBusy) return;
    error = '';
    feedback = '';
    resendBusy = true;
    try {
      await api<{ status: string }>('/apiopen/auth/email-verification/request', {
        public: true,
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), locale: language.startsWith('fr') ? 'fr' : 'en' })
      });
      feedback = t.resendAccepted;
    } catch (cause) {
      error = cause instanceof ApiError && cause.status === 400 ? t.verificationFailed : t.genericError;
    } finally {
      resendBusy = false;
    }
  }
</script>

<svelte:head><title>{t.verificationTitle} | SymSvel App</title><meta name="referrer" content="no-referrer" /></svelte:head>
<main class="auth-shell">
  <section class="auth-card">
    <header><strong>SymSvel</strong><span>App</span></header>
    <h1>{t.verificationTitle}</h1>
    {#if busy}<p role="status">{t.verificationBusy}</p>{/if}
    {#if confirmed}<p role="status">{t.verificationSuccess}</p>{/if}
    {#if error}<p class="alert" role="alert">{error}</p>{/if}
    {#if !hasToken}
      <h2>{t.resendTitle}</h2>
      <p>{t.resendDescription}</p>
      {#if feedback}<p role="status">{feedback}</p>{/if}
      <form class="form" onsubmit={resend}>
        <label for="resend-email">{t.email}</label>
        <input id="resend-email" type="email" autocomplete="email" bind:value={email} required />
        <button type="submit" disabled={resendBusy}>{resendBusy ? t.resendBusy : t.resendButton}</button>
      </form>
    {/if}
    <p><a href={resolve('/login')}>{t.backToLogin}</a></p>
  </section>
</main>
