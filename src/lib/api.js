/**
 * apiBase — resolves the correct base URL for backend API calls.
 *
 * Web (Vercel):   VITE_API_BASE is not set → empty string → relative paths work as-is.
 * Mobile (Capacitor native shell): WebView serves from capacitor://localhost, so relative
 * paths like /api/... would 404. VITE_API_BASE is set to the production Vercel URL at
 * build time (via .env.mobile) so all fetch calls become absolute and reach the backend.
 */
export const apiBase = import.meta.env.VITE_API_BASE ?? ''
