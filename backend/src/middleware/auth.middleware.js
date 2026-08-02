import { verifyAccessToken } from '../utils/token.js';
import { unauthorized, forbidden } from '../utils/AppError.js';

/** Verifies the Bearer access token and attaches req.user = { id, role }. */
export function authenticate(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(unauthorized('Authentication required'));
    }

    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(unauthorized('Access token expired'));
    if (err.name === 'JsonWebTokenError') return next(unauthorized('Invalid access token'));
    return next(err);
  }
}

/** Restricts a route to one or more roles. Must run after authenticate(). */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(forbidden('Insufficient permissions'));
    }
    return next();
  };
}

export default { authenticate, authorize };
