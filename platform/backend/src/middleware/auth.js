/**
 * SHAHEEN-YS Authentication Middleware
 * Protects routes requiring authentication
 */
const { verifyToken } = require('../services/authService');

function requireAuth(req, res, next) {
  const token = req.cookies?.token || extractBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function extractBearer(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

module.exports = { requireAuth, requireAdmin };
