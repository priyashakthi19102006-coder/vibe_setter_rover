/**
 * VIBESETTER OS - API Client Service
 * ==================================
 * Robust, failsafe HTTP client wrapper with configurable base URL,
 * timeout handling, request interceptors, and deep fallback protection.
 * 
 * GUARANTEES:
 * - API failures never crash the entire React application.
 * - Handles offline backend states safely.
 * - Never throws invalid JSON parse exceptions on undefined fallbacks.
 */

/**
 * VIBESETTER OS - API Client Service
 * ==================================
 * Robust, failsafe HTTP client wrapper with configurable base URL,
 * timeout handling, request interceptors, and deep fallback protection.
 * 
 * GUARANTEES:
 * - API failures never crash the entire React application.
 * - Handles offline backend states safely.
 * - Never throws invalid JSON parse exceptions on undefined fallbacks.
 * - Auto-normalizes VITE_API_URL and VITE_API_BASE_URL.
 */

const rawApiUrl = (
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_API_BASE_URL || 
  'http://127.0.0.1:8000'
).toString().trim();

// Normalize API_BASE_URL to always include the trailing /api route prefix
export const API_BASE_URL = rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;

// Server root (without /api suffix)
export const SERVER_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '');

// Default WebSocket URL derived from the HTTP base URL
export const DEFAULT_WS_URL = `${SERVER_ROOT_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')}/ws/status`;

const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * Standard fetch wrapper with timeout and JSON handling
 * @param {string} endpoint - API route (e.g., '/rover/telemetry' or '/health')
 * @param {object} options - Request options (method, body, headers, etc.)
 * @param {any} mockFallback - Safe default data returned if backend is offline
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}, mockFallback = null) {
  // Normalize leading slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  const timeoutMs = options.timeout || 3500;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    });

    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`API Error [${response.status}]: ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(id);

    // If fallback is permitted and explicitly provided (not null and not undefined)
    if (USE_MOCK_FALLBACK && mockFallback !== null && mockFallback !== undefined) {
      console.warn(`[VIBESETTER API] ${endpoint} unreachable (${err.message}). Using safe fallback.`);
      try {
        if (typeof mockFallback === 'function') {
          return mockFallback();
        }
        return JSON.parse(JSON.stringify(mockFallback));
      } catch (parseErr) {
        return typeof mockFallback === 'object' ? { ...mockFallback } : mockFallback;
      }
    }

    // Re-throw if caller explicitly requested strict error handling (mockFallback === null)
    console.warn(`[VIBESETTER API] Request to ${endpoint} failed (${err.message}).`);
    throw err;
  }
}

export default {
  API_BASE_URL,
  SERVER_ROOT_URL,
  DEFAULT_WS_URL,
  apiRequest
};
