const express = require('express');
const { listAuditLogs } = require('../services/audit.service');

const router = express.Router();

router.get('/', (req, res) => {
  const logs = listAuditLogs(req.user.id, req.query.limit);
  res.json({ logs });
});

module.exports = router;
