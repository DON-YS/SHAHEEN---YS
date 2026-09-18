#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${HOME}/SHAHEEN-YS"
BACKEND="${ROOT}/platform/backend"
SRC="${BACKEND}/src"

log(){ printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
die(){ printf '\n[ERROR] %s\n' "$*" >&2; exit 1; }

[ -d "$ROOT" ] || die "Project directory not found: $ROOT"
[ -d "$BACKEND" ] || die "Phase 1 backend not found: $BACKEND"

cd "$ROOT"

log "SHAHEEN - YS | PHASE 2"
log "Building the authenticated infrastructure control API foundation."

mkdir -p \
  "$SRC/routes" \
  "$SRC/controllers" \
  "$SRC/services" \
  "$SRC/models" \
  "$SRC/utils" \
  "$SRC/config" \
  "$BACKEND/data" \
  "$ROOT/platform/docs" \
  "$ROOT/platform/logs"

# -------------------------------------------------------------------
# Phase 2 database migration
# -------------------------------------------------------------------
cat > "$SRC/config/phase2-migration.js" <<'EOF'
const db = require('./database');

db.exec(`
CREATE TABLE IF NOT EXISTS infrastructure_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  region TEXT,
  image TEXT,
  size TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_infra_user_id
  ON infrastructure_resources(user_id);

CREATE INDEX IF NOT EXISTS idx_infra_status
  ON infrastructure_resources(status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
  ON audit_logs(created_at);
`);
EOF

# -------------------------------------------------------------------
# Audit service
# -------------------------------------------------------------------
cat > "$SRC/services/audit.service.js" <<'EOF'
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
EOF

# -------------------------------------------------------------------
# Infrastructure service
# -------------------------------------------------------------------
cat > "$SRC/services/infrastructure.service.js" <<'EOF'
const db = require('../config/database');

const ALLOWED_PROVIDERS = new Set([
  'linode',
  'kubevirt',
  'crossplane',
  'generic'
]);

const ALLOWED_TYPES = new Set([
  'vm',
  'instance',
  'server',
  'cluster',
  'network',
  'storage'
]);

const ALLOWED_STATUS = new Set([
  'pending',
  'provisioning',
  'ready',
  'failed',
  'deleting',
  'deleted'
]);

function validateInput(input, partial = false) {
  const data = input || {};

  if (!partial || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
      throw new Error('name must contain at least 2 characters');
    }
  }

  if (!partial || data.provider !== undefined) {
    if (!ALLOWED_PROVIDERS.has(data.provider)) {
      throw new Error(`unsupported provider: ${data.provider}`);
    }
  }

  if (!partial || data.resourceType !== undefined) {
    if (!ALLOWED_TYPES.has(data.resourceType)) {
      throw new Error(`unsupported resource type: ${data.resourceType}`);
    }
  }

  if (data.status !== undefined && !ALLOWED_STATUS.has(data.status)) {
    throw new Error(`unsupported status: ${data.status}`);
  }

  if (data.config !== undefined && (typeof data.config !== 'object' || Array.isArray(data.config))) {
    throw new Error('config must be a JSON object');
  }
}

function normalize(row) {
  if (!row) return null;

  let config = {};
  try {
    config = JSON.parse(row.config_json || '{}');
  } catch (_) {}

  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    resourceType: row.resource_type,
    region: row.region,
    image: row.image,
    size: row.size,
    status: row.status,
    externalId: row.external_id,
    config,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function create(userId, input) {
  validateInput(input);

  const result = db.prepare(`
    INSERT INTO infrastructure_resources
      (user_id, name, provider, resource_type, region, image, size, status, config_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    userId,
    input.name.trim(),
    input.provider,
    input.resourceType,
    input.region || null,
    input.image || null,
    input.size || null,
    JSON.stringify(input.config || {})
  );

  return getById(userId, result.lastInsertRowid);
}

function list(userId) {
  return db.prepare(`
    SELECT *
    FROM infrastructure_resources
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(userId).map(normalize);
}

function getById(userId, id) {
  const row = db.prepare(`
    SELECT *
    FROM infrastructure_resources
    WHERE id = ? AND user_id = ?
  `).get(id, userId);

  return normalize(row);
}

function updateStatus(userId, id, status, externalId = null) {
  if (!ALLOWED_STATUS.has(status)) {
    throw new Error(`unsupported status: ${status}`);
  }

  const result = db.prepare(`
    UPDATE infrastructure_resources
    SET status = ?,
        external_id = COALESCE(?, external_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(status, externalId, id, userId);

  if (!result.changes) return null;
  return getById(userId, id);
}

function remove(userId, id) {
  const result = db.prepare(`
    DELETE FROM infrastructure_resources
    WHERE id = ? AND user_id = ?
  `).run(id, userId);

  return result.changes > 0;
}

module.exports = {
  create,
  list,
  getById,
  updateStatus,
  remove,
  ALLOWED_PROVIDERS,
  ALLOWED_TYPES,
  ALLOWED_STATUS
};
EOF

# -------------------------------------------------------------------
# Infrastructure routes
# -------------------------------------------------------------------
cat > "$SRC/routes/infrastructure.routes.js" <<'EOF'
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const infrastructure = require('../services/infrastructure.service');
const { writeAudit } = require('../services/audit.service');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

function fail(res, err) {
  const message = err instanceof Error ? err.message : 'Request failed';
  return res.status(400).json({ error: message });
}

router.get('/', (req, res) => {
  res.json({ resources: infrastructure.list(req.user.id) });
});

router.get(
  '/:id',
  param('id').isInt({ min: 1 }),
  validate,
  (req, res) => {
    const resource = infrastructure.getById(req.user.id, Number(req.params.id));
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json({ resource });
  }
);

router.post(
  '/',
  [
    body('name').isString().trim().isLength({ min: 2, max: 100 }),
    body('provider').isIn(['linode', 'kubevirt', 'crossplane', 'generic']),
    body('resourceType').isIn(['vm', 'instance', 'server', 'cluster', 'network', 'storage']),
    body('region').optional().isString().isLength({ max: 100 }),
    body('image').optional().isString().isLength({ max: 200 }),
    body('size').optional().isString().isLength({ max: 100 }),
    body('config').optional().isObject()
  ],
  validate,
  (req, res) => {
    try {
      const resource = infrastructure.create(req.user.id, req.body);

      writeAudit({
        userId: req.user.id,
        action: 'resource.create',
        resourceType: resource.resourceType,
        resourceId: resource.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { provider: resource.provider }
      });

      res.status(201).json({ resource });
    } catch (err) {
      fail(res, err);
    }
  }
);

router.patch(
  '/:id/status',
  [
    param('id').isInt({ min: 1 }),
    body('status').isIn(['pending', 'provisioning', 'ready', 'failed', 'deleting', 'deleted']),
    body('externalId').optional().isString().isLength({ max: 200 })
  ],
  validate,
  (req, res) => {
    try {
      const resource = infrastructure.updateStatus(
        req.user.id,
        Number(req.params.id),
        req.body.status,
        req.body.externalId || null
      );

      if (!resource) return res.status(404).json({ error: 'Resource not found' });

      writeAudit({
        userId: req.user.id,
        action: 'resource.status.update',
        resourceType: resource.resourceType,
        resourceId: resource.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { status: resource.status }
      });

      res.json({ resource });
    } catch (err) {
      fail(res, err);
    }
  }
);

router.delete(
  '/:id',
  param('id').isInt({ min: 1 }),
  validate,
  (req, res) => {
    const id = Number(req.params.id);
    const resource = infrastructure.getById(req.user.id, id);

    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    infrastructure.remove(req.user.id, id);

    writeAudit({
      userId: req.user.id,
      action: 'resource.delete',
      resourceType: resource.resourceType,
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { provider: resource.provider }
    });

    res.json({ success: true });
  }
);

module.exports = router;
EOF

# -------------------------------------------------------------------
# Audit routes
# -------------------------------------------------------------------
cat > "$SRC/routes/audit.routes.js" <<'EOF'
const express = require('express');
const { listAuditLogs } = require('../services/audit.service');

const router = express.Router();

router.get('/', (req, res) => {
  const logs = listAuditLogs(req.user.id, req.query.limit);
  res.json({ logs });
});

module.exports = router;
EOF

# -------------------------------------------------------------------
# Update server
# -------------------------------------------------------------------
python3 - "$SRC/server.js" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

migration = "require('./config/phase2-migration');"
if migration not in s:
    marker = "require('dotenv').config();"
    s = s.replace(marker, marker + "\n" + migration, 1)

if "const infrastructureRoutes = require('./routes/infrastructure.routes');" not in s:
    marker = "const authRoutes = require('./routes/auth.routes');"
    s = s.replace(
        marker,
        marker + "\nconst infrastructureRoutes = require('./routes/infrastructure.routes');\nconst auditRoutes = require('./routes/audit.routes');",
        1
    )

if "app.use('/api/infrastructure'" not in s:
    marker = "app.use('/api/auth', authRoutes);"
    replacement = marker + """
app.use('/api/infrastructure', authMiddleware, infrastructureRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);"""
    s = s.replace(marker, replacement, 1)

p.write_text(s)
PY

# -------------------------------------------------------------------
# Phase 2 documentation
# -------------------------------------------------------------------
cat > "$ROOT/platform/docs/PHASE2.md" <<'EOF'
# SHAHEEN - YS — Phase 2

## Purpose

Phase 2 extends the Phase 1 authenticated backend into an infrastructure-control API foundation.

Implemented:

- authenticated infrastructure resources API
- SQLite infrastructure resource persistence
- provider abstraction values for Linode, KubeVirt, Crossplane and generic providers
- resource lifecycle states
- per-user resource isolation
- audit logging
- protected audit API
- validation and security middleware inherited from Phase 1

## API

Authentication:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Infrastructure:

- `GET /api/infrastructure`
- `GET /api/infrastructure/:id`
- `POST /api/infrastructure`
- `PATCH /api/infrastructure/:id/status`
- `DELETE /api/infrastructure/:id`

Audit:

- `GET /api/audit`

Health:

- `GET /health`

## Important

Phase 2 creates the control-plane API foundation only.

It does NOT automatically create real cloud servers, KubeVirt VMs, or Crossplane-managed infrastructure.

Those external-provider actions should be implemented behind an explicit provisioning/approval layer in a later phase.
EOF

cat > "$ROOT/platform/security/PHASE2-SECURITY.md" <<'EOF'
# Phase 2 Security Model

- Infrastructure endpoints require authentication.
- Every resource is scoped to the authenticated user.
- Audit events are persisted for create, status-update and delete operations.
- Provider execution is intentionally separated from database CRUD.
- No cloud credentials are embedded in source code.
- No real server creation is performed by this phase.
- External provider credentials should be supplied through protected environment/secret management.
- A future provisioning layer should require an explicit approval gate before destructive or billable actions.
EOF

# -------------------------------------------------------------------
# Verify syntax and modules
# -------------------------------------------------------------------
log "Running JavaScript syntax checks."

node --check "$SRC/config/phase2-migration.js"
node --check "$SRC/services/audit.service.js"
node --check "$SRC/services/infrastructure.service.js"
node --check "$SRC/routes/infrastructure.routes.js"
node --check "$SRC/routes/audit.routes.js"
node --check "$SRC/server.js"

log "Running dependency/module verification."

cd "$BACKEND"

node - <<'NODE'
require('dotenv').config();
require('./src/config/database');
require('./src/config/phase2-migration');
require('./src/services/audit.service');
require('./src/services/infrastructure.service');
require('./src/routes/infrastructure.routes');
require('./src/routes/audit.routes');
require('./src/server');
console.log('PHASE2_MODULE_VERIFICATION=OK');
NODE

log "Checking Phase 2 database tables."

node - <<'NODE'
const db = require('./src/config/database');
require('./src/config/phase2-migration');

const tables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type='table'
    AND name IN ('infrastructure_resources','audit_logs')
  ORDER BY name
`).all();

console.log(JSON.stringify(tables, null, 2));

if (tables.length !== 2) {
  process.exit(1);
}
NODE

log "Creating a non-destructive temporary API smoke test."

PORT=3099 node src/server.js > "$ROOT/platform/logs/phase2-healthcheck.log" 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/tmp/shaheen_phase2_health.json 2>/dev/null; then
    cat /tmp/shaheen_phase2_health.json
    break
  fi
  sleep 0.5
done

if ! curl -fsS "http://127.0.0.1:${PORT}/health" >/tmp/shaheen_phase2_health.json 2>/dev/null; then
  cat "$ROOT/platform/logs/phase2-healthcheck.log" || true
  die "Phase 2 health check failed."
fi

log "Phase 2 completed successfully."

cat <<EOF

============================================================
 SHAHEEN - YS | PHASE 2 COMPLETE
============================================================

Backend:
  $BACKEND

New API:
  GET    /api/infrastructure
  GET    /api/infrastructure/:id
  POST   /api/infrastructure
  PATCH  /api/infrastructure/:id/status
  DELETE /api/infrastructure/:id
  GET    /api/audit

Health:
  GET    /health

Next manual command:
  cd "$BACKEND" && npm start

Phase 2 intentionally does NOT create real cloud infrastructure.
Real Crossplane/KubeVirt/provider execution belongs behind a later
approval-controlled provisioning layer.

============================================================
EOF
