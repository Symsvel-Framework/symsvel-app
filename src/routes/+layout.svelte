<script lang="ts">
	import { provideProjectBrand } from '../lib/branding';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	const brandName = provideProjectBrand();
	const pageTitle = $derived(!['/login', '/dashboard', '/forgot-password', '/reset-password', '/verify-email'].includes(page.route.id ?? ''));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#if pageTitle}<title>{$brandName} App</title>{/if}
</svelte:head>

{@render children()}
