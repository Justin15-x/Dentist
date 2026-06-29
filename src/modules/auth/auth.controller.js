'use strict';

const { supabaseAnon } = require('../../config/supabase');

// ── Register ───────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;

    const { data, error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (error) {
      const err  = new Error(error.message);
      err.statusCode = 400;
      throw err;
    }

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Revise su correo electrónico para verificar la cuenta.',
      data: {
        id:    data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Login ──────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Never reveal whether the email or password was wrong specifically
      const err = new Error('Credenciales inválidas.');
      err.statusCode = 401;
      throw err;
    }

    res.json({
      success: true,
      data: {
        user: {
          id:        data.user.id,
          email:     data.user.email,
          full_name: data.user.user_metadata?.full_name ?? null,
        },
        access_token:  data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at:    data.session.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Logout ─────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    // req.db is the authenticated client set by auth middleware
    const { error } = await req.db.auth.signOut();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 400;
      throw err;
    }

    res.json({ success: true, message: 'Sesión cerrada correctamente.' });
  } catch (err) {
    next(err);
  }
};

// ── Refresh Token ──────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      const err = new Error('Refresh token inválido o expirado.');
      err.statusCode = 401;
      throw err;
    }

    res.json({
      success: true,
      data: {
        access_token:  data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at:    data.session.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, refreshToken };
