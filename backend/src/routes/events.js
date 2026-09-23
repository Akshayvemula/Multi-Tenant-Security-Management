import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { notFound } from '../errors.js';
import { audit } from '../services/audit.js';
import { eventSeverities, eventStatuses, idSchema, pagination, pageResult, allowSort } from '../utils.js';
import { requireRoles } from '../middleware/auth.js';

const eventInput = z.object({
  eventType: z.string().trim().min(2).max(100),
  severity: z.enum(eventSeverities),
  status: z.enum(eventStatuses).default('OPEN'),
  description: z.string().trim().min(2).max(5000),
  occurredAt: z.coerce.date().optional()
});
const eventUpdate = z.object({
  eventType: z.string().trim().min(2).max(100).optional(),
  severity: z.enum(eventSeverities).optional(),
  status: z.enum(eventStatuses).optional(),
  description: z.string().trim().min(2).max(5000).optional(),
  occurredAt: z.coerce.date().optional()
}).refine((value) => Object.keys(value).length > 0, 'At least one field must be supplied');

export const eventsRouter = Router();

eventsRouter.get('/', async (request, response, next) => {
  try {
    const { page, pageSize, offset } = pagination(request.query);
    const severity = request.query.severity ? z.enum(eventSeverities).parse(request.query.severity) : null;
    const status = request.query.status ? z.enum(eventStatuses).parse(request.query.status) : null;
    const search = request.query.search ? z.string().trim().max(160).parse(request.query.search) : null;
    const sort = allowSort(request.query.sort, ['occurred_at', 'created_at', 'severity', 'status'], 'occurred_at');
    const direction = request.query.direction === 'asc' ? 'ASC' : 'DESC';
    const { where, params } = eventScope(request.user.tenant_id, { severity, status, search });
    const count = await query(`SELECT count(*) FROM security_events e WHERE ${where}`, params);
    const { rows } = await query(
      `SELECT e.id, e.event_type, e.severity, e.status, e.description, e.occurred_at, e.created_at, e.updated_at,
         u.display_name AS created_by_name
       FROM security_events e LEFT JOIN users u ON u.id = e.created_by
       WHERE ${where}
       ORDER BY e.${sort} ${direction}, e.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );
    response.json(pageResult(rows, count.rows[0].count, { page, pageSize }));
  } catch (error) { next(error); }
});

eventsRouter.post('/', requireRoles('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const input = eventInput.parse(request.body);
    const { rows } = await query(
      `INSERT INTO security_events (tenant_id, event_type, severity, status, description, occurred_at, created_by)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), $7)
       RETURNING id, event_type, severity, status, description, occurred_at, created_at, updated_at`,
      [request.user.tenant_id, input.eventType, input.severity, input.status, input.description, input.occurredAt ?? null, request.user.id]
    );
    await audit({ tenantId: request.user.tenant_id, actorUserId: request.user.id, action: 'SECURITY_EVENT_CREATED', entityType: 'SECURITY_EVENT', entityId: rows[0].id, metadata: { severity: rows[0].severity }, ipAddress: request.ip });
    response.status(201).json({ data: rows[0] });
  } catch (error) { next(error); }
});

eventsRouter.patch('/:id', requireRoles('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const id = idSchema.parse(request.params.id);
    const input = eventUpdate.parse(request.body);
    const { rows } = await query(
      `UPDATE security_events
       SET event_type = COALESCE($1, event_type), severity = COALESCE($2::event_severity, severity),
           status = COALESCE($3::event_status, status), description = COALESCE($4, description),
           occurred_at = COALESCE($5, occurred_at)
       WHERE id = $6 AND tenant_id = $7
       RETURNING id, event_type, severity, status, description, occurred_at, created_at, updated_at`,
      [input.eventType ?? null, input.severity ?? null, input.status ?? null, input.description ?? null, input.occurredAt ?? null, id, request.user.tenant_id]
    );
    if (!rows[0]) throw notFound();
    await audit({ tenantId: request.user.tenant_id, actorUserId: request.user.id, action: 'SECURITY_EVENT_UPDATED', entityType: 'SECURITY_EVENT', entityId: id, metadata: { status: rows[0].status, severity: rows[0].severity }, ipAddress: request.ip });
    response.json({ data: rows[0] });
  } catch (error) { next(error); }
});

function eventScope(tenantId, { severity, status, search }) {
  const params = [tenantId];
  const predicates = ['e.tenant_id = $1'];
  if (severity) { params.push(severity); predicates.push(`e.severity = $${params.length}`); }
  if (status) { params.push(status); predicates.push(`e.status = $${params.length}`); }
  if (search) { params.push(`%${search}%`); predicates.push(`(e.event_type ILIKE $${params.length} OR e.description ILIKE $${params.length})`); }
  return { where: predicates.join(' AND '), params };
}
