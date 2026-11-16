import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./client')>();
	return { ...actual, api: vi.fn() };
});

import { api, ApiError } from './client';
import { appApi, currentApp, loginApp, logoutApp } from './session';

const mockedApi = vi.mocked(api);
const tokens = {
	access_token: 'a'.repeat(43),
	refresh_token: 'b'.repeat(43),
	expires_at: '2099-01-01T00:00:00+00:00',
	refresh_expires_at: '2099-02-01T00:00:00+00:00',
	token_type: 'Bearer'
};

describe('ephemeral App session', () => {
	beforeEach(async () => {
		vi.resetAllMocks();
		await logoutApp();
		vi.resetAllMocks();
	});

	it('verifies login, checks identity and revokes on logout', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce({ id: 7, context: 'app' });
		expect(await loginApp('admin@example.test', 'password')).toEqual({ id: 7, context: 'app' });
		mockedApi.mockResolvedValueOnce({ id: 7, context: 'app' });
		expect(await currentApp()).toEqual({ id: 7, context: 'app' });
		mockedApi.mockResolvedValueOnce(undefined);
		await logoutApp();
		expect(mockedApi).toHaveBeenLastCalledWith('/api/auth/logout', {
			method: 'POST',
			accessToken: tokens.access_token,
			body: JSON.stringify({ refresh_token: tokens.refresh_token })
		});
		expect(await currentApp()).toBeNull();
	});

	it('never restores a login response arriving after logout', async () => {
		const deferred = Promise.withResolvers<typeof tokens>();
		mockedApi.mockResolvedValueOnce(deferred.promise);
		const pending = loginApp('admin@example.test', 'password');
		await logoutApp();
		deferred.resolve(tokens);
		await expect(pending).rejects.toThrow('superseded');
		expect(await currentApp()).toBeNull();
	});

	it('rotates expiring tokens before checking App identity', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		const renewed = { ...tokens, access_token: 'c'.repeat(43), refresh_token: 'd'.repeat(43) };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'app' });
		await loginApp('admin@example.test', 'password');
		mockedApi.mockResolvedValueOnce(renewed).mockResolvedValueOnce({ id: 7, context: 'app' });
		expect(await currentApp()).toEqual({ id: 7, context: 'app' });
		expect(mockedApi).toHaveBeenCalledWith('/apiopen/auth/refresh', {
			method: 'POST',
			public: true,
			body: JSON.stringify({ refresh_token: expiring.refresh_token })
		});
		expect(mockedApi).toHaveBeenLastCalledWith('/api/auth/me', {
			accessToken: renewed.access_token
		});
	});

	it('shares one refresh across concurrent App checks', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		const renewed = { ...tokens, access_token: 'c'.repeat(43), refresh_token: 'd'.repeat(43) };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'app' });
		await loginApp('admin@example.test', 'password');
		const deferred = Promise.withResolvers<typeof tokens>();
		mockedApi.mockResolvedValueOnce(deferred.promise);
		const first = currentApp();
		const second = currentApp();
		deferred.resolve(renewed);
		mockedApi.mockResolvedValue({ id: 7, context: 'app' });
		expect(await Promise.all([first, second])).toEqual([
			{ id: 7, context: 'app' },
			{ id: 7, context: 'app' }
		]);
		expect(mockedApi.mock.calls.filter(([path]) => path === '/apiopen/auth/refresh')).toHaveLength(1);
	});

	it('never restores a refresh response arriving after logout', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		const renewed = { ...tokens, access_token: 'c'.repeat(43), refresh_token: 'd'.repeat(43) };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'app' });
		await loginApp('admin@example.test', 'password');
		const deferred = Promise.withResolvers<typeof tokens>();
		mockedApi.mockResolvedValueOnce(deferred.promise);
		const pending = currentApp();
		mockedApi.mockResolvedValueOnce(undefined);
		await logoutApp();
		deferred.resolve(renewed);
		expect(await pending).toBeNull();
		expect(await currentApp()).toBeNull();
	});

	it('rejects an already expired login token', async () => {
		mockedApi.mockResolvedValueOnce({
			...tokens,
			expires_at: '2000-01-01T00:00:00+00:00'
		});
		await expect(loginApp('admin@example.test', 'password')).rejects.toThrow(
			'Invalid authentication response'
		);
		expect(await currentApp()).toBeNull();
	});

	it('closes the session when refresh fails', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'app' });
		await loginApp('admin@example.test', 'password');
		mockedApi.mockRejectedValueOnce(new Error('invalid_session'));
		expect(await currentApp()).toBeNull();
		expect(await currentApp()).toBeNull();
		expect(mockedApi.mock.calls.filter(([path]) => path === '/apiopen/auth/refresh')).toHaveLength(1);
	});

	it('rejects an expired refresh token at login', async () => {
		mockedApi.mockResolvedValueOnce({
			...tokens,
			refresh_expires_at: '2000-01-01T00:00:00+00:00'
		});
		await expect(loginApp('admin@example.test', 'password')).rejects.toThrow(
			'Invalid authentication response'
		);
		expect(mockedApi).toHaveBeenCalledTimes(1);
	});

	it('rejects a refresh response with an expired access token', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'app' });
		await loginApp('admin@example.test', 'password');
		mockedApi.mockResolvedValueOnce({ ...tokens, expires_at: '2000-01-01T00:00:00+00:00' });
		expect(await currentApp()).toBeNull();
		expect(await currentApp()).toBeNull();
	});

	it('does not request a refresh when its expiration has passed', async () => {
		const expiring = {
			...tokens,
			expires_at: new Date(Date.now() + 1_000).toISOString(),
			refresh_expires_at: new Date(Date.now() + 2_000).toISOString()
		};
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'app' });
		await loginApp('admin@example.test', 'password');
		vi.useFakeTimers();
		try {
			vi.setSystemTime(Date.now() + 3_000);
			expect(await currentApp()).toBeNull();
			expect(mockedApi.mock.calls.filter(([path]) => path === '/apiopen/auth/refresh')).toHaveLength(
				0
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it('attaches the current App token to module requests', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce({ id: 7, context: 'app' });
		await loginApp('admin@example.test', 'password');
		mockedApi.mockResolvedValueOnce({ data: [1, 2] });
		expect(await appApi('/api/admins')).toEqual({ data: [1, 2] });
		expect(mockedApi).toHaveBeenLastCalledWith('/api/admins', {
			credentials: 'omit',
			accessToken: tokens.access_token
		});
	});

	it('rejects unauthenticated and public module calls', async () => {
		await expect(appApi('/api/admins')).rejects.toMatchObject({ status: 401 });
		await expect(appApi('/api/users')).rejects.toThrow('authenticated App path');
		await expect(appApi('/api/admins', { public: true })).rejects.toThrow('authenticated App path');
		await expect(appApi('/api/admins', { accessToken: 'injected' })).rejects.toThrow(
			'authenticated App path'
		);
		expect(mockedApi).not.toHaveBeenCalled();
	});

	it('invalidates the session after a module request receives 401', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce({ id: 7, context: 'app' });
		await loginApp('admin@example.test', 'password');
		mockedApi.mockRejectedValueOnce(new ApiError('Expired', 401, 'unauthorized'));
		await expect(appApi('/api/admins')).rejects.toMatchObject({ status: 401 });
		expect(await currentApp()).toBeNull();
	});

	it('does not return a module response after logout', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce({ id: 7, context: 'app' });
		await loginApp('admin@example.test', 'password');
		const deferred = Promise.withResolvers<{ data: number[] }>();
		const requestStarted = Promise.withResolvers<void>();
		mockedApi.mockImplementationOnce(() => {
			requestStarted.resolve();
			return deferred.promise;
		});
		const pending = appApi('/api/admins');
		const rejected = expect(pending).rejects.toMatchObject({ status: 401 });
		await requestStarted.promise;
		mockedApi.mockResolvedValueOnce(undefined);
		await logoutApp();
		deferred.resolve({ data: [1] });
		await rejected;
		expect(await currentApp()).toBeNull();
	});

	it('rejects a null login response without requesting identity', async () => {
		mockedApi.mockResolvedValueOnce(null);
		await expect(loginApp('admin@example.test', 'password')).rejects.toThrow(
			'Invalid authentication response'
		);
		expect(mockedApi).toHaveBeenCalledTimes(1);
	});

	it('rejects a null identity without retaining tokens', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce(null);
		await expect(loginApp('admin@example.test', 'password')).rejects.toThrow('Invalid App identity');
		expect(await currentApp()).toBeNull();
	});

	it('rejects a null refresh response and closes the session', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'app' });
		await loginApp('admin@example.test', 'password');
		mockedApi.mockResolvedValueOnce(null);
		expect(await currentApp()).toBeNull();
	});

	it('rejects manually injected Authorization headers on module calls', async () => {
		await expect(
			appApi('/api/admins', { headers: { Authorization: 'Bearer injected' } })
		).rejects.toThrow('authenticated App path');
		expect(mockedApi).not.toHaveBeenCalled();
	});

	it('rejects a mismatched App identity', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce({ id: 7, context: 'app' });
		await expect(loginApp('admin@example.test', 'password')).rejects.toThrow('Invalid App identity');
		expect(await currentApp()).toBeNull();
	});
});
