/**
 * Client Environment Configuration
 * 
 * In production (e.g. Vercel deployment), defaults to https://speedbuzzer.onrender.com
 * or the custom VITE_BACKEND_URL environment variable if provided.
 * 
 * When unset in local development, defaults to empty string so Vite proxy handles
 * /api and /socket.io routes directly to localhost:3001.
 */
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/+$/, '')
  || (import.meta.env.PROD ? 'https://speedbuzzer.onrender.com' : '');

export const API_BASE_URL = `${BACKEND_URL}/api`;

