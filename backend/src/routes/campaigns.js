import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { HttpError, notFound } from '../errors.js';
import { audit } from '../services/audit.js';
import { campaignStatuses, idSchema, pagination, pageResult, allowSort, assertStatusTransition } from '../utils.js';
import { requireRoles } from '../middleware/auth.js';

const campaignInput = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).default(''),
  status: z.enum(campaignStatuses).default('DRAFT')
});
const campaignUpdate = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(campaignStatuses).optional()
}).refine((value) => Object.keys(value).length > 0, 'At least one field must be supplied');

export const campaignsRouter = Router();

campaignsRouter.get('/', async (request, response, next) => {
  try {
    const { page, pageSize, offset } = pagination(request.query);
    const status = request.query.status ? z.enum(campaignStatuses).parse(request.query.status) : null;
    const search = request.query.search ? z.string().trim().max(160).parse(request.query.search) : null;
    const sort = allowSort(request.query.sort, ['created_at', 'updated_at', 'name', 'status'], 'updated_at');
    const direction = request.query.direction === 'asc' ? 'ASC' : 'DESC';
    const { where, params } = campaignScope(request.user, { status, search });
    const count = await query(`SELECT count(*) FROM campaigns c WHERE ${where}`, params);
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    const { rows } = await query(
      `SELECT c.id, c.name, c.description, c.status, c.created_at, c.updated_at,
         creator.display_name AS created_by_name,
         count(ca.user_id)::int AS assignee_count
       FROM campaigns c
       JOIN users creator ON creator.id = c.created_by
       LEFT JOIN campaign_assignments ca ON ca.campaign_id = c.id
       WHERE ${where}
       GROUP BY c.id, creator.display_name
       ORDER BY c.${sort} ${direction}, c.id DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      [...params, pageSize, offset]
    );
    response.json(pageResult(rows, count.rows[0].count, { page, pageSize }));
  } catch (error) { next(error); }
});

campaignsRouter.get('/:id', async (request, response, next) => {
  try {
    const id = idSchema.parse(request.params.id);
    const { where, params } = campaignScope(request.user);
    const { rows } = await query(
      `SELECT c.id, c.name, c.description, c.status, c.created_at, c.updated_at,
         creator.display_name AS created_by_name,
         COALESCE(json_agg(json_build_object('id', u.id, 'displayName', u.display_name, 'email', u.email, 'role', u.role)
           ORDER BY u.display_name) FILTER (WHERE u.id IS NOT NULL), '[]'::json) AS assignees
       FROM campaigns c
       JOIN users creator ON creator.id = c.created_by
       LEFT JOIN campaign_assignments ca ON ca.campaign_id = c.id
       LEFT JOIN users u ON u.id = ca.user_id
       WHERE c.id = $${params.length + 1} AND ${where}
       GROUP BY c.id, creator.display_name`,
      [...params, id]
    );
    if (!rows[0]) throw notFound();
    response.json({ data: rows[0] });
  } catch (error) { next(error); }
});

campaignsRouter.post('/', requireRoles('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const input = campaignInput.parse(request.body);
    if (input.status !== 'DRAFT') throw new HttpError(400, 'Campaigns must be created in DRAFT status');
    const { rows } = await query(
      `INSERT INTO campaigns (tenant_id, name, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, status, created_at, updated_at`,
      [request.user.tenant_id, input.name, input.description, input.status, request.user.id]
    );
    await audit({ tenantId: request.user.tenant_id, actorUserId: request.user.id, action: 'CAMPAIGN_CREATED', entityType: 'CAMPAIGN', entityId: rows[0].id, metadata: { name: rows[0].name }, ipAddress: request.ip });
    response.status(201).json({ data: rows[0] });
  } catch (error) { next(error); }
});

campaignsRouter.patch('/:id', requireRoles('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const id = idSchema.parse(request.params.id);
    const input = campaignUpdate.parse(request.body);
    const current = await campaignForTenant(id, request.user.tenant_id);
    if (!current) throw notFound();
    if (input.status) assertStatusTransition(current.status, input.status);

    const { rows } = await query(
      `UPDATE campaigns
       SET name = COALESCE($1, name), description = COALESCE($2, description), status = COALESCE($3::campaign_status, status)
       WHERE id = $4 AND tenant_id = $5
       RETURNING id, name, description, status, created_at, updated_at`,
      [input.name ?? null, input.description ?? null, input.status ?? null, id, request.user.tenant_id]
    );
    await audit({ tenantId: request.user.tenant_id, actorUserId: request.user.id, action: 'CAMPAIGN_UPDATED', entityType: 'CAMPAIGN', entityId: id, metadata: { beforeStatus: current.status, afterStatus: rows[0].status }, ipAddress: request.ip });
    response.json({ data: rows[0] });
  } catch (error) { next(error); }
});

campaignsRouter.delete('/:id', requireRoles('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const id = idSchema.parse(request.params.id);
    const { rows } = await query('DELETE FROM campaigns WHERE id = $1 AND tenant_id = $2 RETURNING id, name', [id, request.user.tenant_id]);
    if (!rows[0]) throw notFound();
    await audit({ tenantId: request.user.tenant_id, actorUserId: request.user.id, action: 'CAMPAIGN_DELETED', entityType: 'CAMPAIGN', entityId: id, metadata: { name: rows[0].name }, ipAddress: request.ip });
    response.status(204).end();
  } catch (error) { next(error); }
});

campaignsRouter.post('/:id/assignees', requireRoles('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const campaignId = idSchema.parse(request.params.id);
    const userId = idSchema.parse(request.body?.userId);
    const campaign = await campaignForTenant(campaignId, request.user.tenant_id);
    if (!campaign) throw notFound();
    const user = await query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND is_active', [userId, request.user.tenant_id]);
    if (!user.rows[0]) throw new HttpError(400, 'Assignee must be an active user in your tenant');
    const assigned = await query(
      'INSERT INTO campaign_assignments (campaign_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING campaign_id, user_id, assigned_at',
      [campaignId, userId]
    );
    if (!assigned.rows[0]) throw new HttpError(409, 'User is already assigned to this campaign');
    await audit({ tenantId: request.user.tenant_id, actorUserId: request.user.id, action: 'CAMPAIGN_ASSIGNEE_ADDED', entityType: 'CAMPAIGN', entityId: campaignId, metadata: { userId }, ipAddress: request.ip });
    response.status(201).json({ data: assigned.rows[0] });
  } catch (error) { next(error); }
});

campaignsRouter.delete('/:id/assignees/:userId', requireRoles('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const campaignId = idSchema.parse(request.params.id);
    const userId = idSchema.parse(request.params.userId);
    const deleted = await query(
      `DELETE FROM campaign_assignments ca USING campaigns c
       WHERE ca.campaign_id = c.id AND ca.campaign_id = $1 AND ca.user_id = $2 AND c.tenant_id = $3
       RETURNING ca.campaign_id`,
      [campaignId, userId, request.user.tenant_id]
    );
    if (!deleted.rows[0]) throw notFound('Assignment not found');
    await audit({ tenantId: request.user.tenant_id, actorUserId: request.user.id, action: 'CAMPAIGN_ASSIGNEE_REMOVED', entityType: 'CAMPAIGN', entityId: campaignId, metadata: { userId }, ipAddress: request.ip });
    response.status(204).end();
  } catch (error) { next(error); }
});

function campaignScope(user, { status, search } = {}) {
  const params = [user.tenant_id];
  const predicates = ['c.tenant_id = $1'];
  if (user.role === 'USER') {
    params.push(user.id);
    predicates.push(`EXISTS (SELECT 1 FROM campaign_assignments visible_ca WHERE visible_ca.campaign_id = c.id AND visible_ca.user_id = $${params.length})`);
  }
  if (status) {
    params.push(status);
    predicates.push(`c.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    predicates.push(`(c.name ILIKE $${params.length} OR c.description ILIKE $${params.length})`);
  }
  return { where: predicates.join(' AND '), params };
}

async function campaignForTenant(id, tenantId) {
  const { rows } = await query('SELECT id, status FROM campaigns WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  return rows[0];
}
