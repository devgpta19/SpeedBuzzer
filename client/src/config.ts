/**
 * Client Environment Configuration
 * 
 * In production (e.g. Vercel deployment), set VITE_BACKEND_URL to your cloud backend
 * (e.g. https://speedbuzzer-api.koyeb.app).
 * 
 * When unset (local development), defaults to empty string so Vite proxy handles
 * /api and /socket.io routes directly to localhost:3001.
 */
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/+$/, '') || '';

export const API_BASE_URL = `${BACKEND_URL}/api`;
