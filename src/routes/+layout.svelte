<script lang="ts">
	import { provideProjectBrand } from '../lib/branding';
	import { page } from '$app/state';
	import AppShell from '../lib/components/AppShell.svelte';
	import { isPublicAppRoute } from '../lib/app/public-routes';
	import favicon from '#lib/assets/favicon.svg';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	const brandName = provideProjectBrand();
	const publicRoute = $derived(isPublicAppRoute(page.route.id ?? page.url.pathname));
	const pageTitle = $derived(!['/login', '/dashboard', '/forgot-password', '/reset-password', '/verify-email'].includes(page.route.id ?? ''));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#if pageTitle}<title>{$brandName} App</title>{/if}
</svelte:head>

{#if publicRoute}
	{@render children()}
{:else}
	<AppShell>{@render children()}</AppShell>
{/if}
