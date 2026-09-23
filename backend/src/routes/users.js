import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db.js';
import { HttpError, notFound } from '../errors.js';
import { audit } from '../services/audit.js';
import { idSchema, pagination, pageResult, roles } from '../utils.js';
import { requireRoles } from '../middleware/auth.js';

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const createUser = z.object({
  email,
  password: z.string().min(10).max(128),
  displayName: z.string().trim().min(2).max(120),
  role: z.enum(roles).default('USER')
});
const updateUser = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(roles).optional(),
  isActive: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, 'At least one field must be supplied');

export const usersRouter = Router();

usersRouter.get('/me', (request, response) => response.json({ data: publicUser(request.user) }));

usersRouter.get('/', requireRoles('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const { page, pageSize, offset } = pagination(request.query);
    const role = request.query.role ? z.enum(roles).parse(request.query.role) : null;
    const search = request.query.search ? z.string().trim().max(160).parse(request.query.search) : null;
    const params = [request.user.tenant_id];
    const predicates = ['tenant_id = $1'];
    if (role) { params.push(role); predicates.push(`role = $${params.length}`); }
    if (search) { params.push(`%${search}%`); predicates.push(`(display_name ILIKE $${params.length} OR email ILIKE $${params.length})`); }
    const where = predicates.join(' AND ');
    const count = await query(`SELECT count(*) FROM users WHERE ${where}`, params);
    const { rows } = await query(
      `SELECT id, email, display_name, role, is_active, created_at, updated_at
       FROM users WHERE ${where} ORDER BY display_name ASC, id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );
    response.json(pageResult(rows, count.rows[0].count, { page, pageSize }));
  } catch (error) { next(error); }
});

usersRouter.post('/', requireRoles('ADMIN'), async (request, response, next) => {
  try {
    const input = createUser.parse(request.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const { rows } = await query(
      `INSERT INTO users (tenant_id, email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, display_name, role, is_active, created_at`,
      [request.user.tenant_id, input.email, passwordHash, input.displayName, input.role]
    );
    await audit({ tenantId: request.user.tenant_id, actorUserId: request.user.id, action: 'USER_CREATED', entityType: 'USER', entityId: rows[0].id, metadata: { role: rows[0].role }, ipAddress: request.ip });
    response.status(201).json({ data: rows[0] });
  } catch (error) { next(error); }
});

usersRouter.patch('/:id', requireRoles('ADMIN'), async (request, response, next) => {
  try {
    const id = idSchema.parse(request.params.id);
    const input = updateUser.parse(request.body);
    if (id === request.user.id && (input.role || input.isActive === false)) {
      throw new HttpError(400, 'You cannot change your own role or deactivate your own account');
    }
    const { rows } = await query(
      `UPDATE users SET display_name = COALESCE($1, display_name), role = COALESCE($2::user_role, role),
       is_active = COALESCE($3, is_active)
       WHERE id = $4 AND tenant_id = $5
       RETURNING id, email, display_name, role, is_active, created_at, updated_at`,
      [input.displayName ?? null, input.role ?? null, input.isActive ?? null, id, request.user.tenant_id]
    );
    if (!rows[0]) throw notFound();
    await audit({ tenantId: request.user.tenant_id, actorUserId: request.user.id, action: 'USER_UPDATED', entityType: 'USER', entityId: id, metadata: { role: rows[0].role, isActive: rows[0].is_active }, ipAddress: request.ip });
    response.json({ data: rows[0] });
  } catch (error) { next(error); }
});

function publicUser(user) {
  return { id: user.id, email: user.email, displayName: user.display_name, role: user.role, isActive: user.is_active, tenantId: user.tenant_id, tenantName: user.tenant_name };
}

