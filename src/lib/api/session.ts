import { api, ApiError, type ApiRequestInit } from './client';

export type AppIdentity = { id: number; context: 'app' };
type LoginTokens = {
	access_token: string;
	refresh_token: string;
	expires_at: string;
	refresh_expires_at: string;
	token_type: 'Bearer';
};

export type SecondFactorChallenge = {
	second_factor_required: true;
	challenge: string;
	challenge_expires_at: string;
	enrollment_required: boolean;
	totp_secret?: string;
	provisioning_uri?: string;
};
export class SecondFactorRequired extends Error {
	constructor() {
		super('Additional authentication required');
		this.name = 'SecondFactorRequired';
	}
}
let pendingSecondFactor: SecondFactorChallenge | null = null;
export function pendingAppSecondFactor(): SecondFactorChallenge | null {
	return pendingSecondFactor && Date.parse(pendingSecondFactor.challenge_expires_at) > Date.now()
		? pendingSecondFactor
		: null;
}
function validSecondFactor(value: unknown): value is SecondFactorChallenge {
	if (!value || typeof value !== 'object') return false;
	const data = value as Partial<SecondFactorChallenge>;
	return data.second_factor_required === true &&
		typeof data.challenge === 'string' && /^[A-Za-z0-9_-]{43}$/.test(data.challenge) &&
		typeof data.challenge_expires_at === 'string' &&
		Number.isFinite(Date.parse(data.challenge_expires_at)) &&
		Date.parse(data.challenge_expires_at) > Date.now() &&
		typeof data.enrollment_required === 'boolean';
}

let session: LoginTokens | null = null;
let sessionGeneration = 0;
let pendingRefresh: {
	generation: number;
	tokens: LoginTokens;
	promise: Promise<LoginTokens | null>;
} | null = null;

async function accessTokens(): Promise<LoginTokens | null> {
	const current = session;
	const generation = sessionGeneration;
	if (!current) return null;
	if (Date.parse(current.expires_at) > Date.now() + 30_000) return current;
	if (Date.parse(current.refresh_expires_at) <= Date.now()) {
		if (generation === sessionGeneration && session === current) session = null;
		return null;
	}
	if (pendingRefresh?.generation === generation && pendingRefresh.tokens === current) {
		return pendingRefresh.promise;
	}
	const refresh = (async (): Promise<LoginTokens | null> => {
		try {
			const next = await api<LoginTokens>('/apiopen/auth/refresh', {
				method: 'POST',
				public: true,
				body: JSON.stringify({ refresh_token: current.refresh_token })
			});
			if (generation !== sessionGeneration || session !== current) return null;
			if (
				!next ||
				next.token_type !== 'Bearer' ||
				!next.access_token ||
				!next.refresh_token ||
				!Number.isFinite(Date.parse(next.expires_at)) ||
				!Number.isFinite(Date.parse(next.refresh_expires_at)) ||
				Date.parse(next.expires_at) <= Date.now() ||
				Date.parse(next.refresh_expires_at) <= Date.now()
			) {
				session = null;
				return null;
			}
			session = next;
			return next;
		} catch {
			if (generation === sessionGeneration && session === current) session = null;
			return null;
		}
	})();
	pendingRefresh = { generation, tokens: current, promise: refresh };
	try {
		return await refresh;
	} finally {
		if (pendingRefresh?.promise === refresh) pendingRefresh = null;
	}
}

/**
 * Ephemeral App session. No localStorage, sessionStorage or persistent JS cookies.
 * A full reload intentionally requires a new login until the server-side cookie
 * transport has been validated.
 */
export async function loginApp(email: string, password: string): Promise<AppIdentity> {
	const generation = ++sessionGeneration;
	pendingRefresh = null;
	session = null;
	pendingSecondFactor = null;
	const tokens = await api<LoginTokens | SecondFactorChallenge>('/apiopen/auth/login', {
		method: 'POST',
		public: true,
		body: JSON.stringify({ email, password })
	});
	if (generation !== sessionGeneration) throw new Error('Authentication request superseded');
	if (validSecondFactor(tokens)) {
		pendingSecondFactor = tokens;
		throw new SecondFactorRequired();
	}
	if (
		!tokens ||
		tokens.token_type !== 'Bearer' ||
		!tokens.access_token ||
		!tokens.refresh_token ||
		!Number.isFinite(Date.parse(tokens.expires_at)) ||
		!Number.isFinite(Date.parse(tokens.refresh_expires_at)) ||
		Date.parse(tokens.expires_at) <= Date.now() ||
		Date.parse(tokens.refresh_expires_at) <= Date.now()
	) {
		throw new Error('Invalid authentication response');
	}
	if (generation !== sessionGeneration) throw new Error('Authentication request superseded');
	try {
		const identity = await api<AppIdentity>('/api/auth/me', {
			accessToken: tokens.access_token
		});
		if (
			!identity ||
			identity.context !== 'app' ||
			!Number.isInteger(identity.id) ||
			identity.id < 1
		) {
			throw new Error('Invalid App identity');
		}
		if (generation !== sessionGeneration) throw new Error('Authentication request superseded');
		session = tokens;
		return identity;
	} catch (error) {
		if (generation === sessionGeneration) session = null;
		throw error;
	}
}

/**
 * Complete a single-use 2FA challenge. No App token is stored until the
 * identity has been checked using the normal Auth endpoint.
 */
export async function completeAppSecondFactor(code: string): Promise<string[]> {
	const pending = pendingAppSecondFactor();
	if (!pending) throw new Error('No active second-factor challenge.');
	const generation = sessionGeneration;
	const tokens = await api<LoginTokens & { recovery_codes?: string[] }>(
		'/apiopen/auth/second-factor', {
			method: 'POST',
			public: true,
			body: JSON.stringify({ challenge: pending.challenge, code })
		}
	);
	if (generation !== sessionGeneration) throw new Error('Authentication request superseded');
	if (!tokens || tokens.token_type !== 'Bearer' ||
		!tokens.access_token || !tokens.refresh_token ||
		!Number.isFinite(Date.parse(tokens.expires_at)) ||
		!Number.isFinite(Date.parse(tokens.refresh_expires_at)) ||
		Date.parse(tokens.expires_at) <= Date.now() ||
		Date.parse(tokens.refresh_expires_at) <= Date.now()) {
		throw new Error('Invalid second-factor response');
	}
	const identity = await api<AppIdentity>('/api/auth/me', { accessToken: tokens.access_token });
	if (generation !== sessionGeneration || identity.context !== 'app' ||
		!Number.isInteger(identity.id) || identity.id < 1) {
		throw new Error('Invalid App identity after 2FA');
	}
	session = {
		access_token: tokens.access_token,
		refresh_token: tokens.refresh_token,
		expires_at: tokens.expires_at,
		refresh_expires_at: tokens.refresh_expires_at,
		token_type: tokens.token_type
	};
	pendingSecondFactor = null;
	return Array.isArray(tokens.recovery_codes) ? tokens.recovery_codes : [];
}

export async function currentApp(): Promise<AppIdentity | null> {
	const current = await accessTokens();
	const generation = sessionGeneration;
	if (!current) return null;
	try {
		const identity = await api<AppIdentity>('/api/auth/me', {
			accessToken: current.access_token
		});
		if (generation !== sessionGeneration || session !== current) return null;
		if (identity.context !== 'app' || !Number.isInteger(identity.id) || identity.id < 1) {
			session = null;
			return null;
		}
		return identity;
	} catch {
		if (generation === sessionGeneration && session === current) session = null;
		return null;
	}
}

export async function logoutApp(): Promise<void> {
	++sessionGeneration;
	pendingRefresh = null;
	const previous = session;
	session = null;
	if (!previous) return;
	try {
		await api<void>('/api/auth/logout', {
			method: 'POST',
			accessToken: previous.access_token,
			body: JSON.stringify({ refresh_token: previous.refresh_token })
		});
	} catch {
		// Fail closed locally even when the network cannot revoke the server token.
	}
}

/**
 * Authenticated App module requests. Never expose token handling to individual modules.
 * Refresh is shared with currentApp(); a failed authorization invalidates this session.
 */
export async function appApi<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
	if (
		!path.startsWith('/api/') ||
		init.public ||
		init.accessToken ||
		init.credentials ||
		new Headers(init.headers).has('Authorization')
	) {
		throw new Error('appApi requires an authenticated App path');
	}
	const tokens = await accessTokens();
	if (!tokens) throw new ApiError('Authentication required.', 401, 'unauthorized');
	const generation = sessionGeneration;
	try {
		const result = await api<T>(path, {
			...init,
			credentials: 'omit',
			accessToken: tokens.access_token
		});
		if (generation !== sessionGeneration || session !== tokens) {
			throw new ApiError('Session changed.', 401, 'unauthorized');
		}
		return result;
	} catch (error) {
		if (
			error instanceof ApiError &&
			error.status === 401 &&
			generation === sessionGeneration &&
			session === tokens
		) {
			session = null;
		}
		throw error;
	}
}
