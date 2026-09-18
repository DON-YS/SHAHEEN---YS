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
