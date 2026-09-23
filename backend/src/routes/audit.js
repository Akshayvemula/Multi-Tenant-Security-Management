import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { pagination, pageResult } from '../utils.js';
import { requireRoles } from '../middleware/auth.js';

export const auditRouter = Router();

auditRouter.get('/', requireRoles('ADMIN'), async (request, response, next) => {
  try {
    const { page, pageSize, offset } = pagination(request.query);
    const action = request.query.action ? z.string().trim().max(100).parse(request.query.action) : null;
    const params = [request.user.tenant_id];
    let where = 'a.tenant_id = $1';
    if (action) { params.push(action); where += ` AND a.action = $${params.length}`; }
    const count = await query(`SELECT count(*) FROM audit_logs a WHERE ${where}`, params);
    const { rows } = await query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.ip_address, a.created_at,
         u.display_name AS actor_name, u.email AS actor_email
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE ${where} ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );
    response.json(pageResult(rows, count.rows[0].count, { page, pageSize }));
  } catch (error) { next(error); }
});

