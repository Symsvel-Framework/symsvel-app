<script lang="ts">
	import { provideProjectBrand } from '../lib/branding';
	import type { Component } from 'svelte';
	import { uiLanguage } from '../lib/api/locales';
	import { page } from '$app/state';
	import AppShell from '../lib/components/AppShell.svelte';
	import { isPublicAppRoute } from '../lib/app/public-routes';
	import favicon from '#lib/assets/favicon.svg';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	const brandName = provideProjectBrand();
	// Optional native GDPR entry, synchronized by Tooling, not a hard dependency.
	const PrivacyRuntime = import.meta.glob<Component<{ scope: 'app' | 'front'; language?: string }>>(
		'../lib/modules/gdpr/Runtime.svelte',
		{ eager: true, import: 'default' }
	)['../lib/modules/gdpr/Runtime.svelte'];
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

{#if PrivacyRuntime}
	<PrivacyRuntime scope="app" language={$uiLanguage ?? (typeof navigator === 'undefined' ? 'fr' : navigator.language)} />
{/if}
