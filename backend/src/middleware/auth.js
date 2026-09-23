import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError, forbidden } from '../errors.js';

export async function authenticate(request, _response, next) {
  try {
    const header = request.get('authorization');
    if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Authentication is required');
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(payload.sub)) throw new HttpError(401, 'Invalid token');

    // Re-load authorization context on every request. Tenant and role are never
    // accepted from the frontend or trusted merely because they appeared in a JWT.
    const { rows } = await query(
      `SELECT u.id, u.tenant_id, u.email, u.display_name, u.role, t.name AS tenant_name
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [payload.sub]
    );
    if (!rows[0]) throw new HttpError(401, 'Account is unavailable');
    request.user = rows[0];
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    return next(new HttpError(401, 'Invalid or expired access token'));
  }
}

export const requireRoles = (...roles) => (request, _response, next) =>
  roles.includes(request.user?.role) ? next() : next(forbidden());

