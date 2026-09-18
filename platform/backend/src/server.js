/**
 * SHAHEEN-YS Backend Server
 * Entry point for the platform API
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const { helmetConfig, globalLimiter, authLimiter } = require('./middleware/security');

// Ensure DB is initialized
require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Security =====
app.use(helmetConfig);

// ===== CORS =====
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ===== Body Parsers =====
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ===== Rate Limiting =====
app.use('/api/', globalLimiter);

// ===== Health Check =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SHAHEEN-YS',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ===== Routes =====
app.use('/api/auth', authLimiter, require('./routes/auth'));

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ===== Start =====
const server = app.listen(PORT, () => {
  console.log(`✅ SHAHEEN-YS Backend running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

module.exports = app;
