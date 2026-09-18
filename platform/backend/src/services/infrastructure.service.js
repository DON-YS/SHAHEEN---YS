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
