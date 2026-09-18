const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const databasePath =
  process.env.DATABASE_PATH || "./data/shaheen-ys.db";

const resolvedPath = path.isAbsolute(databasePath)
  ? databasePath
  : path.resolve(process.cwd(), databasePath);

fs.mkdirSync(path.dirname(resolvedPath), {
  recursive: true
});

const db = new Database(resolvedPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    provider TEXT,
    provider_id TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

  CREATE INDEX IF NOT EXISTS idx_audit_user
  ON audit_logs(user_id);

  CREATE INDEX IF NOT EXISTS idx_audit_created
  ON audit_logs(created_at);
`);

module.exports = db;
