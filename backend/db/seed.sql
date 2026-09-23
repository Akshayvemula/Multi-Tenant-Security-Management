-- The development-only passwords below are bcrypt hashes for the values in
-- .env.example: AdminPass123!, ManagerPass123!, and UserPass123!.

INSERT INTO tenants (id, name, slug) VALUES
  (1, 'Apex Sentinel', 'apex-sentinel'),
  (2, 'Northstar Labs', 'northstar-labs')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('tenants', 'id'), 2, true);

INSERT INTO users (id, tenant_id, email, password_hash, display_name, role) VALUES
  (1, 1, 'admin@apex.test', '$2a$10$9PRC1xzeCKrtZPNHEBWE.OLz9o46ymnOa2YOlTLnozouW4P9FbcF2', 'Avery Admin', 'ADMIN'),
  (2, 1, 'manager@apex.test', '$2a$10$WhjW3AKYT4HI33yapEkrBOazY42P7ptubRiWlRHFEi04.QncxXDvO', 'Morgan Manager', 'MANAGER'),
  (3, 1, 'user@apex.test', '$2a$10$00z3jeISQPyJ1ebWsiZUS.yDkAZbCGszfklVKnw8HfBN3znEfbfHq', 'Uma User', 'USER'),
  (4, 2, 'admin@northstar.test', '$2a$10$9PRC1xzeCKrtZPNHEBWE.OLz9o46ymnOa2YOlTLnozouW4P9FbcF2', 'Nora Northstar', 'ADMIN')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('users', 'id'), 4, true);

INSERT INTO campaigns (id, tenant_id, name, description, status, created_by) VALUES
  (101, 1, 'Q3 Phishing Simulation', 'Baseline phishing resilience exercise.', 'ACTIVE', 1),
  (102, 1, 'Endpoint Hardening', 'Verify endpoint protection rollout.', 'DRAFT', 2),
  (201, 2, 'Northstar Incident Drill', 'Tenant B resource for isolation testing.', 'ACTIVE', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('campaigns', 'id'), 201, true);

INSERT INTO campaign_assignments (campaign_id, user_id) VALUES (101, 2), (101, 3), (102, 3)
ON CONFLICT DO NOTHING;

INSERT INTO security_events (tenant_id, event_type, severity, status, description, occurred_at, created_by) VALUES
  (1, 'Suspicious login', 'HIGH', 'OPEN', 'Multiple failed sign-in attempts detected.', NOW() - INTERVAL '2 hours', 1),
  (1, 'Endpoint alert', 'CRITICAL', 'INVESTIGATING', 'Malware signature detected on a managed endpoint.', NOW() - INTERVAL '1 day', 2),
  (1, 'Policy exception', 'LOW', 'RESOLVED', 'Approved exception for legacy service account.', NOW() - INTERVAL '3 days', 1),
  (2, 'Data egress', 'CRITICAL', 'OPEN', 'Tenant B-only event for isolation testing.', NOW() - INTERVAL '1 hour', 4)
ON CONFLICT DO NOTHING;
