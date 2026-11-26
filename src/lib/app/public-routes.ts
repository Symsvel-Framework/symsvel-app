/** Public routes must remain accessible before an App session exists. */
export function isPublicAppRoute(path: string): boolean {
  return ['/', '/login', '/register', '/activate', '/forgot-password', '/reset-password', '/verify-email', '/verify-email-change', '/two-factor'].includes(path.replace(/\/$/, '') || '/');
}
