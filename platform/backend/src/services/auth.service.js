const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../config/database");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "development-only-change-this-secret";

function createId() {
  return crypto.randomUUID();
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

async function register({ email, password, name }, req) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(normalizedEmail);

  if (existing) {
    const error =
      new Error("Email already registered.");

    error.status = 409;
    throw error;
  }

  const passwordHash =
    await bcrypt.hash(password, 12);

  const id = createId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (
      id,
      email,
      password_hash,
      name,
      role,
      provider,
      email_verified,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, 'user', 'local', 0, ?, ?)
  `).run(
    id,
    normalizedEmail,
    passwordHash,
    name?.trim() || null,
    now,
    now
  );

  const user = getUserById(id);

  audit(id, "AUTH_REGISTER", req);

  return {
    user,
    token: createToken(user)
  };
}

async function login({ email, password }, req) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const record = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(normalizedEmail);

  if (!record || !record.password_hash) {
    const error =
      new Error("Invalid email or password.");

    error.status = 401;
    throw error;
  }

  const valid =
    await bcrypt.compare(
      password,
      record.password_hash
    );

  if (!valid) {
    audit(record.id, "AUTH_LOGIN_FAILED", req);

    const error =
      new Error("Invalid email or password.");

    error.status = 401;
    throw error;
  }

  const user = getUserById(record.id);

  audit(user.id, "AUTH_LOGIN", req);

  return {
    user,
    token: createToken(user)
  };
}

function getUserById(id) {
  return db
    .prepare(`
      SELECT
        id,
        email,
        name,
        role,
        provider,
        email_verified,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
    `)
    .get(id);
}

function audit(
  userId,
  action,
  req,
  metadata = {}
) {
  db.prepare(`
    INSERT INTO audit_logs (
      id,
      user_id,
      action,
      ip_address,
      user_agent,
      metadata,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    createId(),
    userId || null,
    action,
    req?.ip || null,
    req?.headers?.["user-agent"] || null,
    JSON.stringify(metadata),
    new Date().toISOString()
  );
}

module.exports = {
  register,
  login,
  getUserById,
  audit
};
