import { query } from '../db.js';

export async function audit({ tenantId, actorUserId = null, action, entityType, entityId = null, metadata = {}, ipAddress = null }) {
  await query(
    `INSERT INTO audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [tenantId, actorUserId, action, entityType, entityId, JSON.stringify(metadata), ipAddress]
  );
}

