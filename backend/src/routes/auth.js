import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db.js';
import { config } from '../config.js';
import { HttpError } from '../errors.js';
import { audit } from '../services/audit.js';
import { authenticate } from '../middleware/auth.js';

const loginSchema = z.object({
  tenantSlug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128)
});

export const authRouter = Router();

authRouter.post('/login', async (request, response, next) => {
  try {
    const { tenantSlug, email, password } = loginSchema.parse(request.body);
    const { rows } = await query(
      `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.display_name, u.role, u.is_active, t.name AS tenant_name
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE t.slug = $1 AND lower(u.email) = lower($2)`,
      [tenantSlug, email]
    );
    const user = rows[0];
    const valid = user?.is_active && await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new HttpError(401, 'Invalid tenant, email, or password');

    const accessToken = jwt.sign({ sub: Number(user.id) }, config.jwtSecret, { algorithm: 'HS256', expiresIn: config.jwtExpiresIn });
    await audit({ tenantId: user.tenant_id, actorUserId: user.id, action: 'AUTH_LOGIN', entityType: 'USER', entityId: user.id, ipAddress: request.ip });
    response.json({ accessToken, user: publicUser(user) });
  } catch (error) { next(error); }
});

authRouter.get('/me', authenticate, (request, response) => response.json({ user: publicUser(request.user) }));

function publicUser(user) {
  return {
    id: user.id,
    tenantId: user.tenant_id,
    tenantName: user.tenant_name,
    email: user.email,
    displayName: user.display_name,
    role: user.role
  };
}

