const express = require("express");
const {
  body,
  validationResult
} = require("express-validator");

const authService =
  require("../services/auth.service");

const {
  requireAuth
} = require("../middleware/auth");

const {
  authLimiter
} = require("../middleware/security");

const router = express.Router();

function validationErrors(
  req,
  res,
  next
) {
  const errors =
    validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed.",
      details: errors.array()
    });
  }

  next();
}

function setAuthCookie(
  res,
  token
) {
  const production =
    process.env.NODE_ENV ===
    "production";

  res.cookie(
    "access_token",
    token,
    {
      httpOnly: true,
      secure: production,
      sameSite:
        production
          ? "strict"
          : "lax",
      maxAge:
        7 * 24 * 60 * 60 * 1000,
      path: "/"
    }
  );
}

router.post(
  "/register",
  authLimiter,
  [
    body("email")
      .isEmail()
      .withMessage(
        "A valid email is required."
      )
      .normalizeEmail(),

    body("password")
      .isLength({ min: 12 })
      .withMessage(
        "Password must contain at least 12 characters."
      ),

    body("name")
      .optional()
      .isLength({ max: 100 })
      .withMessage(
        "Name is too long."
      )
  ],
  validationErrors,
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await authService.register(
          req.body,
          req
        );

      setAuthCookie(
        res,
        result.token
      );

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
      .withMessage(
        "A valid email is required."
      )
      .normalizeEmail(),

    body("password")
      .notEmpty()
      .withMessage(
        "Password is required."
      )
  ],
  validationErrors,
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await authService.login(
          req.body,
          req
        );

      setAuthCookie(
        res,
        result.token
      );

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
    authService.audit(
      req.user.id,
      "AUTH_LOGOUT",
      req
    );

    res.clearCookie(
      "access_token",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite:
          process.env.NODE_ENV ===
          "production"
            ? "strict"
            : "lax",
        path: "/"
      }
    );

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
