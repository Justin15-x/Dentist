'use strict';

const env = require('../config/env');

/**
 * Global error handler.
 * - Logs the full error internally.
 * - Never leaks stack traces or internal details to the client in production.
 * Must be registered LAST in app.js (after all routes).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Internal log (replace console with Winston / Pino in production)
  console.error(
    `[ERROR] ${new Date().toISOString()} | ${req.method} ${req.originalUrl} | ${err.message}`,
  );

  if (env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const status  = err.statusCode || err.status || 500;
  const message =
    status === 500 && env.NODE_ENV === 'production'
      ? 'Ha ocurrido un error interno del servidor.'
      : (err.message || 'Ha ocurrido un error.');

  const body = { success: false, message };

  // Expose stack only in development
  if (env.NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  return res.status(status).json(body);
};

/**
 * 404 handler — catches any request that fell through all routes.
 * Must be registered BEFORE errorHandler and AFTER all routes.
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = { errorHandler, notFound };
