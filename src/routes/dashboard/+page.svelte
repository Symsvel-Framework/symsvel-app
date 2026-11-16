<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { currentApp, logoutApp } from '../../lib/api/session';
  import { uiLanguage } from '../../lib/api/locales';
  import { authLabels } from '../../lib/i18n/auth';

  let ready = $state(false);
  let userId = $state<number | null>(null);
  const language = $derived($uiLanguage ?? (typeof navigator === 'undefined' ? 'en' : navigator.language));
  const t = $derived(authLabels(language));

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

<svelte:head><title>{t.dashboard} | SymSvel App</title></svelte:head>
{#if ready}
  <div class="bo-shell">
    <aside class="bo-sidebar"><div class="bo-brand">SymSvel App</div></aside>
    <div class="bo-main">
      <header class="bo-topbar">
        <span>{t.dashboard} #{userId}</span>
        <button type="button" onclick={logout}>{t.signOut}</button>
      </header>
      <main class="bo-content"><section class="welcome"><h1>{t.dashboard}</h1><p>{t.loggedIn}</p></section></main>
    </div>
  </div>
{:else}
  <main class="auth-shell"><p role="status">{t.verifyingSession}</p></main>
{/if}
