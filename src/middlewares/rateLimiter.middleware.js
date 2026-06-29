'use strict';

const rateLimit = require('express-rate-limit');

const makeHandler = (message) => (_req, res) =>
  res.status(429).json({ success: false, message });

/**
 * General API limiter — 100 requests per 15 minutes per IP.
 * Applied globally to /api/* routes.
 */
const defaultLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         makeHandler('Demasiadas peticiones desde esta IP. Intente de nuevo en 15 minutos.'),
});

/**
 * Strict limiter for authentication endpoints — 10 requests per 15 minutes per IP.
 * Mitigates brute-force and credential-stuffing attacks.
 */
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         makeHandler('Demasiados intentos de autenticación. Intente de nuevo más tarde.'),
});

module.exports = { defaultLimiter, authLimiter };
