/**
 * SHAHEEN-YS Authentication Service
 * Handles: registration, login, JWT, password hashing
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const BCRYPT_ROUNDS = 12;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

const generateId = () => crypto.randomBytes(16).toString('hex');

async function registerUser({ email, password, name, ip, userAgent }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = generateId();

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, provider)
    VALUES (?, ?, ?, ?, 'email')
  `).run(id, email.toLowerCase(), name, passwordHash);

  logAudit({ userId: id, action: 'user.register', result: 'success', ip, userAgent });

  return { id, email: email.toLowerCase(), name };
}

async function loginUser({ email, password, ip, userAgent }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !user.password_hash) {
    logAudit({ userId: null, action: 'user.login', result: 'failed', ip, userAgent });
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    logAudit({ userId: user.id, action: 'user.login', result: 'failed', ip, userAgent });
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const token = generateToken(user.id, user.role);
  logAudit({ userId: user.id, action: 'user.login', result: 'success', ip, userAgent });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

function generateToken(userId, role = 'user') {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function logAudit({ userId, action, resource, result, ip, userAgent }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, resource, result, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, action, resource || null, result || null, ip || null, userAgent || null);
  } catch (err) {
    console.error('[AUDIT ERROR]', err.message);
  }
}

module.exports = { registerUser, loginUser, generateToken, verifyToken, logAudit };
