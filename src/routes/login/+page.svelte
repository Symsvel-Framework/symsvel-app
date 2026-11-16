<script lang="ts">
  import { goto } from '$app/navigation';
  import { base, resolve } from '$app/paths';
  import { ApiError } from '../../lib/api/client';
  import { uiLanguage } from '../../lib/api/locales';
  import { loginApp } from '../../lib/api/session';
  import { authLabels } from '../../lib/i18n/auth';

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let error = $state('');
  const language = $derived($uiLanguage ?? (typeof navigator === 'undefined' ? 'en' : navigator.language));
  const t = $derived(authLabels(language));

  async function signIn(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    busy = true;
    error = '';
    try {
      await loginApp(email.trim(), password);
      password = '';
      await goto(resolve('/dashboard'), { replaceState: true });
    } catch (cause) {
      error = cause instanceof ApiError && cause.status === 401 ? t.invalidCredentials : t.genericError;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>{t.signIn} | SymSvel App</title></svelte:head>
<main class="auth-shell">
  <section class="auth-card">
    <header><strong>SymSvel</strong><span>App</span></header>
    <h1>{t.signIn}</h1>
    <p>{t.signInDescription}</p>
    {#if error}<p class="alert" role="alert">{error}</p>{/if}
    <form class="form" onsubmit={signIn}>
      <label for="login-email">{t.email}</label>
      <input id="login-email" type="email" autocomplete="username" bind:value={email} required />
      <label for="login-password">{t.password}</label>
      <input id="login-password" type="password" autocomplete="current-password" bind:value={password} required />
      <button type="submit" disabled={busy}>{busy ? t.signInBusy : t.signInButton}</button>
    </form>
    <p><a href={base + '/register'}>{t.register}</a></p>
    <p><a href={resolve('/verify-email')}>{t.verifyEmail}</a></p>
  </section>
</main>
