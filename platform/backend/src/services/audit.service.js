const db = require('../config/database');

function writeAudit({
  userId = null,
  action,
  resourceType = null,
  resourceId = null,
  ipAddress = null,
  userAgent = null,
  metadata = {}
}) {
  const stmt = db.prepare(`
    INSERT INTO audit_logs
      (user_id, action, resource_type, resource_id, ip_address, user_agent, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    userId,
    action,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    JSON.stringify(metadata || {})
  );
}

function listAuditLogs(userId, limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

  return db.prepare(`
    SELECT id, action, resource_type, resource_id,
           ip_address, metadata_json, created_at
    FROM audit_logs
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(userId, safeLimit);
}

module.exports = { writeAudit, listAuditLogs };
