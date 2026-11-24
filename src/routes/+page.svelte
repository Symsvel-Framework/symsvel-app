<script lang="ts">
  import { getProjectBrand } from '../lib/branding';
  const brandName = getProjectBrand();
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  onMount(() => { void goto(resolve('/login'), { replaceState: true }); });
</script>

<main class="auth-shell"><p>{$brandName} App</p></main>
