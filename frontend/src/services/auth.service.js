import { apiRequest } from './api-client';

/** Auth API endpoints. Returns the unwrapped `data` payload. */
export const AuthService = {
  /** @param {{name:string,email:string,password:string}} payload @returns {Promise<AuthSession>} */
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload, auth: false }),

  /** @param {{email:string,password:string}} payload @returns {Promise<AuthSession>} */
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),

  /** @param {string} refreshToken */
  logout: (refreshToken) => apiRequest('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),

  /** @param {string} email */
  forgotPassword: (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),

  /** @param {{token:string,password:string}} payload */
  resetPassword: (payload) => apiRequest('/auth/reset-password', { method: 'POST', body: payload, auth: false }),

  /** @returns {Promise<{user: AuthUser}>} */
  me: () => apiRequest('/auth/me', { method: 'GET', auth: true }),
};

export default AuthService;
