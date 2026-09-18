/**
 * SHAHEEN-YS Auth Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const authService = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

// ===== Register =====
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 12 }).withMessage('Password must be at least 12 characters'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
], validate, async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const user = await authService.registerUser({
      email, password, name,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ message: 'Account created. Please verify your email.', user });
  } catch (err) { next(err); }
});

// ===== Login =====
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await authService.loginUser({
      email, password,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: 'Login successful', user });
  } catch (err) { next(err); }
});

// ===== Logout =====
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// ===== Current User =====
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
