'use strict';

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');

const env                   = require('./config/env');
const { defaultLimiter }    = require('./middlewares/rateLimiter.middleware');
const { errorHandler, notFound } = require('./middlewares/error.middleware');

// ── Route modules ──────────────────────────────────────────────────
const authRoutes        = require('./modules/auth/auth.routes');
const patientRoutes     = require('./modules/patients/patient.routes');
const appointmentRoutes = require('./modules/appointments/appointment.routes');

const app = express();

// ══════════════════════════════════════════════════════════════════
//  SECURITY LAYER
// ══════════════════════════════════════════════════════════════════

// 1. HTTP security headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc:   ["'none'"],
        objectSrc:  ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // relax for API usage
  }),
);

// 2. CORS — only whitelisted origins are allowed
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    },
    methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:   ['Content-Type', 'Authorization'],
    credentials:      true,
    maxAge:           600, // pre-flight cache 10 min
  }),
);

// 3. Global rate limiter — 100 req / 15 min / IP
app.use('/api/', defaultLimiter);

// ══════════════════════════════════════════════════════════════════
//  BODY PARSING
// ══════════════════════════════════════════════════════════════════
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ══════════════════════════════════════════════════════════════════
//  HTTP LOGGER
// ══════════════════════════════════════════════════════════════════
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ══════════════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════════════

/** Health-check (public) */
app.get('/health', (_req, res) =>
  res.json({ success: true, status: 'OK', timestamp: new Date().toISOString() }),
);

app.use('/api/auth',         authRoutes);
app.use('/api/patients',     patientRoutes);
app.use('/api/appointments', appointmentRoutes);

// ══════════════════════════════════════════════════════════════════
//  ERROR HANDLING  (must be last)
// ══════════════════════════════════════════════════════════════════
app.use(notFound);
app.use(errorHandler);

module.exports = app;
