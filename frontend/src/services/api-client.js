import { useAuthStore } from '@/store/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {Array<{field: string, message: string}>} [errors] backend field errors
   */
  constructor(message, status = 500, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

/** Current tokens straight from the store (no localStorage parsing). */
function currentTokens() {
  const { accessToken, refreshToken } = useAuthStore.getState();
  return { accessToken, refreshToken };
}

let refreshPromise = null;

/**
 * Exchange the refresh token for a fresh pair, single-flight so concurrent
 * 401s share one refresh instead of stampeding. Persists the new session.
 * @returns {Promise<{accessToken: string}|null>} null when refresh fails
 */
async function refreshTokens() {
  const { refreshToken } = currentTokens();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new ApiError(body?.message ?? 'Session expired', res.status);
      }
      useAuthStore.getState().setSession({
        user: body.data.user,
        accessToken: body.data.accessToken,
        refreshToken: body.data.refreshToken,
      });
      return { accessToken: body.data.accessToken };
    })();
    refreshPromise.finally(() => {
      refreshPromise = null;
    });
  }

  try {
    return await refreshPromise;
  } catch {
    return null;
  }
}

/** Clear the session and bounce to the login page. */
function signOutLocally() {
  useAuthStore.getState().clearSession();
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}

/**
 * Fetch wrapper around the backend API.
 * Attaches the Bearer token, retries once after a token refresh on 401,
 * and unwraps the `{ success, message, data }` envelope.
 *
 * @param {string} path path below `/api/v1`, e.g. `/auth/login`
 * @param {{method?: string, body?: object, auth?: boolean}} [options]
 * @returns {Promise<any>} the `data` payload
 */
export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const { accessToken } = currentTokens();
  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Access token expired → try one refresh, then replay the request.
  if (res.status === 401 && auth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      headers.Authorization = `Bearer ${refreshed.accessToken}`;
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } else {
      signOutLocally();
      throw new ApiError('Session expired. Please sign in again.', 401);
    }
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(payload?.message ?? 'Request failed', res.status, payload?.errors ?? []);
  }
  return payload?.data;
}
