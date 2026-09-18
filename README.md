#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

PROJECT="$HOME/SHAHEEN-YS"
PHASE="Phase 1"
LOG_DIR="$PROJECT/platform/docs/logs"
LOG_FILE="$LOG_DIR/phase1-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$LOG_DIR"

exec > >(tee -a "$LOG_FILE") 2>&1

echo
echo "============================================================"
echo "              SHAHEEN - YS | PHASE 1"
echo "          Foundation / Authentication / Security"
echo "============================================================"
echo

if [ ! -d "$PROJECT" ]; then
    echo "[ERROR] Project directory not found:"
    echo "        $PROJECT"
    echo
    echo "Clone the repository first, then run this script again."
    exit 1
fi

cd "$PROJECT"

echo "[1/12] Creating Phase 1 directory structure..."

mkdir -p \
    platform/backend/src/routes \
    platform/backend/src/controllers \
    platform/backend/src/middleware \
    platform/backend/src/models \
    platform/backend/src/services \
    platform/backend/src/utils \
    platform/backend/src/config \
    platform/frontend \
    platform/admin \
    platform/database \
    platform/security \
    platform/docs \
    platform/docs/logs

find platform -type d -empty -exec touch "{}/.gitkeep" \;

echo "[OK] Directory structure created."

echo
echo "[2/12] Creating backend package.json..."

cat > platform/backend/package.json <<'EOF'
{
  "name": "shaheen-ys-backend",
  "version": "1.0.0",
  "private": true,
  "description": "SHAHEEN - YS Cloud Infrastructure Platform backend",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --coverage"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "better-sqlite3": "^12.4.1",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^17.2.2",
    "express": "^5.1.0",
    "express-rate-limit": "^8.1.0",
    "express-validator": "^7.2.1",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^7.0.6"
  },
  "devDependencies": {
    "jest": "^30.1.3",
    "nodemon": "^3.1.10"
  }
}
EOF

echo "[OK] package.json created."

echo
echo "[3/12] Creating environment template..."

cat > platform/backend/.env.example <<'EOF'
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

DATABASE_PATH=./data/shaheen-ys.db

JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
SESSION_SECRET=CHANGE_THIS_TO_ANOTHER_LONG_RANDOM_SECRET

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

CLOUD_PROVIDER=
CLOUD_API_TOKEN=
CLOUD_REGION=
EOF

echo "[OK] .env.example created."

echo
echo "[4/12] Creating security middleware..."

cat > platform/backend/src/middleware/security.js <<'EOF'
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later."
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again later."
  }
});

function securityMiddleware(app) {
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  app.use(generalLimiter);
}

module.exports = {
  securityMiddleware,
  generalLimiter,
  authLimiter
};
EOF

echo "[OK] Security middleware created."

echo
echo "[5/12] Creating SQLite database layer..."

mkdir -p platform/backend/data

cat > platform/backend/src/config/database.js <<'EOF'
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const databasePath = process.env.DATABASE_PATH || "./data/shaheen-ys.db";

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
EOF

echo "[OK] Database layer created."

echo
echo "[6/12] Creating authentication service..."

cat > platform/backend/src/services/auth.service.js <<'EOF'
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

const JWT_SECRET =
  process.env.JWT_SECRET || "development-only-change-this-secret";

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

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function audit(userId, action, req, metadata = {}) {
  const stmt = db.prepare(`
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
  `);

  stmt.run(
    createId(),
    userId || null,
    action,
    req?.ip || null,
    req?.headers?.["user-agent"] || null,
    JSON.stringify(metadata),
    new Date().toISOString()
  );
}

async function register({ email, password, name }, req) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(normalizedEmail);

  if (existing) {
    const error = new Error("Email already registered.");
    error.status = 409;
    throw error;
  }

  const passwordHash = await hashPassword(password);
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

  const user = db
    .prepare(`
      SELECT id, email, name, role, provider, email_verified,
             created_at, updated_at
      FROM users
      WHERE id = ?
    `)
    .get(id);

  audit(id, "AUTH_REGISTER", req);

  return {
    user,
    token: createToken(user)
  };
}

async function login({ email, password }, req) {
  const normalizedEmail = email.trim().toLowerCase();

  const userRecord = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(normalizedEmail);

  if (!userRecord || !userRecord.password_hash) {
    const error = new Error("Invalid email or password.");
    error.status = 401;
    throw error;
  }

  const valid = await verifyPassword(
    password,
    userRecord.password_hash
  );

  if (!valid) {
    audit(
      userRecord.id,
      "AUTH_LOGIN_FAILED",
      req
    );

    const error = new Error("Invalid email or password.");
    error.status = 401;
    throw error;
  }

  const user = {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    role: userRecord.role,
    provider: userRecord.provider,
    email_verified: userRecord.email_verified,
    created_at: userRecord.created_at,
    updated_at: userRecord.updated_at
  };

  audit(user.id, "AUTH_LOGIN", req);

  return {
    user,
    token: createToken(user)
  };
}

function getUserById(id) {
  return db
    .prepare(`
      SELECT id, email, name, role, provider, email_verified,
             created_at, updated_at
      FROM users
      WHERE id = ?
    `)
    .get(id);
}

module.exports = {
  register,
  login,
  getUserById,
  audit
};
EOF

echo "[OK] Authentication service created."

echo
echo "[7/12] Creating authentication middleware..."

cat > platform/backend/src/middleware/auth.js <<'EOF'
const jwt = require("jsonwebtoken");
const authService = require("../services/auth.service");

const JWT_SECRET =
  process.env.JWT_SECRET || "development-only-change-this-secret";

function extractToken(req) {
  const cookieToken = req.cookies?.access_token;

  if (cookieToken) {
    return cookieToken;
  }

  const authorization = req.headers.authorization || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return null;
}

function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        error: "Authentication required."
      });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = authService.getUserById(payload.sub);

    if (!user) {
      return res.status(401).json({
        error: "User no longer exists."
      });
    }

    req.user = user;
    req.auth = payload;

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired authentication token."
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required."
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Administrator access required."
    });
  }

  next();
}

module.exports = {
  extractToken,
  requireAuth,
  requireAdmin
};
EOF

echo "[OK] Authentication middleware created."

echo
echo "[8/12] Creating authentication routes..."

cat > platform/backend/src/routes/auth.routes.js <<'EOF'
const express = require("express");
const { body, validationResult } = require("express-validator");

const authService = require("../services/auth.service");
const { requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/security");

const router = express.Router();

function validationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed.",
      details: errors.array()
    });
  }

  next();
}

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

router.post(
  "/register",
  authLimiter,
  [
    body("email")
      .isEmail()
      .withMessage("A valid email is required.")
      .normalizeEmail(),

    body("password")
      .isLength({ min: 12 })
      .withMessage("Password must contain at least 12 characters."),

    body("name")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Name is too long.")
  ],
  validationErrors,
  async (req, res, next) => {
    try {
      const result = await authService.register(req.body, req);

      setAuthCookie(res, result.token);

      res.status(201).json({
        success: true,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/login",
  authLimiter,
  [
    body("email")
      .isEmail()
      .withMessage("A valid email is required.")
      .normalizeEmail(),

    body("password")
      .notEmpty()
      .withMessage("Password is required.")
  ],
  validationErrors,
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body, req);

      setAuthCookie(res, result.token);

      res.json({
        success: true,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/logout",
  requireAuth,
  (req, res) => {
    authService.audit(req.user.id, "AUTH_LOGOUT", req);

    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "strict"
          : "lax",
      path: "/"
    });

    res.json({
      success: true
    });
  }
);

router.get(
  "/me",
  requireAuth,
  (req, res) => {
    res.json({
      authenticated: true,
      user: req.user
    });
  }
);

module.exports = router;
EOF

echo "[OK] Authentication routes created."

echo
echo "[9/12] Creating Express server..."

cat > platform/backend/src/server.js <<'EOF'
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const {
  securityMiddleware
} = require("./middleware/security");

require("./config/database");

const authRoutes = require("./routes/auth.routes");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

securityMiddleware(app);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by CORS.")
      );
    },
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({
  extended: false,
  limit: "1mb"
}));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    project: "SHAHEEN - YS",
    phase: "Phase 1",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found."
  });
});

app.use((err, req, res, next) => {
  console.error("[ERROR]", err);

  const status =
    Number.isInteger(err.status) && err.status >= 400
      ? err.status
      : 500;

  res.status(status).json({
    error:
      status === 500
        ? "Internal server error."
        : err.message
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(
    `[SHAHEEN-YS] Backend listening on ${HOST}:${PORT}`
  );
});

function shutdown(signal) {
  console.log(`[SHAHEEN-YS] Received ${signal}. Shutting down...`);

  server.close(() => {
    console.log("[SHAHEEN-YS] Server stopped.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
EOF

echo "[OK] Express server created."

echo
echo "[10/12] Creating Phase 1 documentation..."

cat > platform/docs/PHASE1.md <<'EOF'
# SHAHEEN - YS — Phase 1

## Foundation, Authentication, Security and Database

Phase 1 establishes the initial backend foundation for the SHAHEEN - YS Cloud Infrastructure Platform.

## Objectives

- Establish the backend project structure.
- Establish the authentication foundation.
- Establish local SQLite persistence.
- Establish audit logging.
- Establish HTTP security middleware.
- Establish request rate limiting.
- Establish CORS configuration.
- Establish environment configuration.
- Establish authenticated API routes.
- Establish the health endpoint.
- Prepare the project for subsequent infrastructure phases.

## Backend Stack

- Node.js
- Express
- SQLite
- better-sqlite3
- JWT
- bcrypt
- Helmet
- CORS
- express-rate-limit
- express-validator
- dotenv

## Authentication

The Phase 1 authentication foundation provides:

- Local account registration.
- Password hashing with bcrypt.
- Login.
- JWT authentication.
- HTTP-only authentication cookie.
- Bearer-token extraction.
- Current-user endpoint.
- Logout.
- Admin middleware foundation.

## Database

The initial database contains:

### users

Stores:

- User ID
- Email
- Password hash
- Name
- Role
- Authentication provider
- Provider ID
- Email verification state
- Creation timestamp
- Update timestamp

### audit_logs

Stores:

- Audit ID
- User ID
- Action
- IP address
- User agent
- Metadata
- Timestamp

## Security Foundation

Phase 1 introduces:

- Helmet security headers.
- Global API rate limiting.
- Authentication-specific rate limiting.
- Input validation.
- HTTP-only authentication cookies.
- SameSite cookie protection.
- Production secure-cookie behavior.
- CORS allow-list.
- Password hashing.
- JWT authentication.

## API

### Health

`GET /health`

Returns backend health information.

### Register

`POST /api/auth/register`

Creates a local account.

### Login

`POST /api/auth/login`

Authenticates an account.

### Logout

`POST /api/auth/logout`

Terminates the local authentication cookie.

### Current User

`GET /api/auth/me`

Returns the authenticated user.

## Environment

Copy:

`.env.example`

to:

`.env`

Never commit real credentials, API tokens, private keys or production secrets.

## Phase 1 Status

Foundation implementation established.

The following advanced capabilities remain future work:

- OAuth production integrations.
- Email verification.
- Password recovery.
- Refresh-token rotation.
- CSRF strategy for browser authentication.
- MFA.
- Production secret management.
- Cloud-provider integration.
- Crossplane control-plane integration.
- KubeVirt VM orchestration.
- Infrastructure approval workflows.
- Production frontend.
- Production administration console.
- Billing integration.
- Distributed workers.
- Observability.
- Production deployment automation.

## Next Phase

Phase 2 can build upon this foundation to introduce the platform control layer and infrastructure orchestration architecture.
EOF

echo "[OK] PHASE1.md created."

echo
echo "[11/12] Creating security documentation..."

cat > platform/security/SECURITY.md <<'EOF'
# SHAHEEN - YS Security Foundation

## Phase 1 Security Controls

The project currently establishes the following baseline controls:

- Password hashing using bcrypt.
- HTTP-only authentication cookies.
- SameSite cookie configuration.
- Secure cookies in production.
- JWT authentication.
- Authentication rate limiting.
- General API rate limiting.
- Helmet security headers.
- CORS origin allow-listing.
- Request validation.
- Audit logging.
- Environment-based secret configuration.

## Secret Handling

Never commit:

- `.env`
- API keys
- Cloud provider tokens
- OAuth client secrets
- SMTP passwords
- Stripe secrets
- JWT production secrets
- Private keys

Use environment variables or an appropriate secret-management system.

## Production Hardening

Before production deployment, implement and verify:

- Strong randomly generated secrets.
- HTTPS.
- Secure cookie configuration.
- CSRF protection appropriate to the authentication architecture.
- OAuth callback validation.
- Email verification.
- Password recovery controls.
- MFA where required.
- Secret rotation.
- Dependency auditing.
- Centralized logging.
- Monitoring and alerting.
- Database backup strategy.
- Infrastructure access controls.
EOF

echo "[OK] SECURITY.md created."

echo
echo "[12/12] Creating Git protection files..."

cat > platform/backend/.gitignore <<'EOF'
node_modules/
.env
.env.*
!.env.example
data/*.db
data/*.db-shm
data/*.db-wal
coverage/
npm-debug.log*
EOF

cat > platform/.gitignore <<'EOF'
**/node_modules/
**/.env
**/.env.*
!**/.env.example
**/coverage/
**/*.db
**/*.db-shm
**/*.db-wal
EOF

echo "[OK] Git protection files created."

echo
echo "============================================================"
echo "                 PHASE 1 VERIFICATION"
echo "============================================================"
echo

echo "[CHECK] Project:"
pwd

echo
echo "[CHECK] Required directories:"
for dir in \
    platform/backend/src/routes \
    platform/backend/src/controllers \
    platform/backend/src/middleware \
    platform/backend/src/models \
    platform/backend/src/services \
    platform/backend/src/utils \
    platform/backend/src/config \
    platform/frontend \
    platform/admin \
    platform/database \
    platform/security \
    platform/docs
do
    if [ -d "$dir" ]; then
        echo "  [OK] $dir"
    else
        echo "  [FAIL] $dir"
    fi
done

echo
echo "[CHECK] Required files:"
for file in \
    platform/backend/package.json \
    platform/backend/.env.example \
    platform/backend/src/config/database.js \
    platform/backend/src/services/auth.service.js \
    platform/backend/src/middleware/auth.js \
    platform/backend/src/middleware/security.js \
    platform/backend/src/routes/auth.routes.js \
    platform/backend/src/server.js \
    platform/docs/PHASE1.md \
    platform/security/SECURITY.md
do
    if [ -f "$file" ]; then
        echo "  [OK] $file"
    else
        echo "  [FAIL] $file"
    fi
done

echo
echo "[CHECK] Sensitive files:"
for file in \
    platform/backend/.env \
    platform/backend/data/shaheen-ys.db
do
    if [ -e "$file" ]; then
        echo "  [NOTICE] $file exists locally and is protected by .gitignore."
    else
        echo "  [OK] $file not present."
    fi
done

echo
echo "[CHECK] Node.js:"
if command -v node >/dev/null 2>&1; then
    node --version
else
    echo "  [NOTICE] Node.js is not installed in the current Termux environment."
fi

echo
echo "[CHECK] npm:"
if command -v npm >/dev/null 2>&1; then
    npm --version
else
    echo "  [NOTICE] npm is not installed in the current Termux environment."
fi

echo
echo "============================================================"
echo "              PHASE 1 FILE STRUCTURE"
echo "============================================================"
echo

find platform \
    -maxdepth 4 \
    -type f \
    -not -path "*/node_modules/*" \
    -not -path "*/data/*.db*" \
    | sort

echo
echo "============================================================"
echo "                  PHASE 1 COMPLETE"
echo "============================================================"
echo
echo "Project: SHAHEEN - YS"
echo "Phase:   Phase 1"
echo "Status:  Foundation created"
echo
echo "Documentation:"
echo "  platform/docs/PHASE1.md"
echo "  platform/security/SECURITY.md"
echo
echo "Backend:"
echo "  platform/backend/"
echo
echo "Log:"
echo "  $LOG_FILE"
echo
echo "IMPORTANT:"
echo "The backend dependencies have NOT been installed automatically."
echo "This prevents Termux from unexpectedly compiling native packages."
echo
echo "For Ubuntu/server development, run:"
echo
echo "  cd ~/SHAHEEN-YS/platform/backend"
echo "  cp .env.example .env"
echo "  npm install"
echo "  npm start"
echo
echo "Health endpoint:"
echo "  http://127.0.0.1:3000/health"
echo
echo "============================================================"
echo

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[GIT] Repository detected."
    echo
    git status --short
else
    echo "[NOTICE] Git repository not detected."
fi

echo
echo "[DONE] Phase 1 generation finished successfully."
echo
