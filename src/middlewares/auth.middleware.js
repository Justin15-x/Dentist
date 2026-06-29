'use strict';

const { createAuthClient } = require('../config/supabase');

/**
 * Authentication middleware.
 *
 * 1. Extracts the Bearer token from the Authorization header.
 * 2. Creates an RLS-respecting Supabase client for this request.
 * 3. Verifies the token with Supabase Auth.
 * 4. Attaches to req:
 *      req.user  → Supabase User object (id, email, metadata…)
 *      req.db    → Authenticated Supabase client (respects RLS policies)
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Se requiere token de autorización (Bearer <token>).',
      });
    }

    const token = authHeader.split(' ')[1];

    // Build a per-request authenticated client
    const db = createAuthClient(token);

    // Validate token with Supabase Auth
    const { data: { user }, error } = await db.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado. Inicie sesión nuevamente.',
      });
    }

    req.user = user;
    req.db   = db;   // RLS-aware client — carry through to services
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };
