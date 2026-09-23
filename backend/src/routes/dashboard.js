import { Router } from 'express';
import { query } from '../db.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (request, response, next) => {
  try {
    const tenantId = request.user.tenant_id;
    const [metrics, activity] = await Promise.all([
      query(
        `SELECT
          (SELECT count(*) FROM users WHERE tenant_id = $1 AND is_active) AS users,
          (SELECT count(*) FROM campaigns WHERE tenant_id = $1) AS campaigns,
          (SELECT count(*) FROM security_events WHERE tenant_id = $1 AND status IN ('OPEN', 'INVESTIGATING')) AS open_events,
          (SELECT count(*) FROM security_events WHERE tenant_id = $1 AND severity = 'CRITICAL' AND status IN ('OPEN', 'INVESTIGATING')) AS critical_events`,
        [tenantId]
      ),
      query(
        `SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at, u.display_name AS actor_name
         FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
         WHERE a.tenant_id = $1 ORDER BY a.created_at DESC LIMIT 8`,
        [tenantId]
      )
    ]);
    response.json({ metrics: metrics.rows[0], recentActivity: activity.rows });
  } catch (error) { next(error); }
});

