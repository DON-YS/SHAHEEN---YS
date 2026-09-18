const jwt = require("jsonwebtoken");

const authService =
  require("../services/auth.service");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "development-only-change-this-secret";

function extractToken(req) {
  const cookieToken =
    req.cookies?.access_token;

  if (cookieToken) {
    return cookieToken;
  }

  const authorization =
    req.headers.authorization || "";

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

    const payload =
      jwt.verify(token, JWT_SECRET);

    const user =
      authService.getUserById(payload.sub);

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
