<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { Path } from '$app/types';
  import { currentApp, logoutApp } from '../../lib/api/session';
  import { uiLanguage } from '../../lib/api/locales';
  import { authLabels } from '../../lib/i18n/auth';
  import { generatedTranslation } from '../../lib/i18n/generated-translations';

  let ready = $state(false);
  let userId = $state<number | null>(null);
  const language = $derived($uiLanguage ?? (typeof navigator === 'undefined' ? 'en' : navigator.language));
  const t = $derived(authLabels(language));
  // Host-only dashboard copy belongs to App.system, not to Auth.
  const host = $derived({
    dashboard: generatedTranslation(language, 'app.system.dashboard.title') ?? t.dashboard,
    loggedIn: generatedTranslation(language, 'app.system.dashboard.loggedIn') ?? t.loggedIn,
    profile: generatedTranslation(language, 'app.users.profile.title') ?? (language.toLowerCase().startsWith('fr') ? 'Mon profil' : 'My profile')
  });

  onMount(() => {
    let mounted = true;
    void currentApp().then((identity) => {
      if (!mounted) return;
      if (!identity) {
        void goto(resolve('/login'), { replaceState: true });
        return;
      }
      userId = identity.id;
      ready = true;
    });
    return () => { mounted = false; };
  });

  async function logout(): Promise<void> {
    ready = false;
    await logoutApp();
    await goto(resolve('/login'), { replaceState: true });
  }
</script>

<svelte:head><title>{host.dashboard} | SymSvel App</title></svelte:head>
{#if ready}
  <div class="bo-shell">
    <aside class="bo-sidebar"><div class="bo-brand">SymSvel App</div></aside>
    <div class="bo-main">
      <header class="bo-topbar">
        <span>{host.dashboard} #{userId}</span>
        <div class="app-account-actions">
          <a href={resolve('/profile' as Path)}>{host.profile}</a>
          <button type="button" onclick={logout}>{t.signOut}</button>
        </div>
      </header>
      <main class="bo-content"><section class="welcome"><h1>{host.dashboard}</h1><p>{host.loggedIn}</p></section></main>
    </div>
  </div>
{:else}
  <main class="auth-shell"><p role="status">{t.verifyingSession}</p></main>
{/if}

<style>
  .app-account-actions { display: flex; align-items: center; gap: 16px; }
  .app-account-actions a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
</style>
