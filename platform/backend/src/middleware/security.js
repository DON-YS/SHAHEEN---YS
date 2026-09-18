const helmet = require("helmet");
const rateLimit =
  require("express-rate-limit");

const generalLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error:
        "Too many requests. Please try again later."
    }
  });

const authLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error:
        "Too many authentication attempts. Please try again later."
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
