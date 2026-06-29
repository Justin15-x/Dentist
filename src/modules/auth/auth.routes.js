'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');

const controller  = require('./auth.controller');
const { validate }     = require('../../middlewares/validate.middleware');
const { authLimiter }  = require('../../middlewares/rateLimiter.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = Router();

// ── Validation rules ───────────────────────────────────────────────
const emailRule    = body('email').isEmail().withMessage('Email inválido.').normalizeEmail();
const passwordRule = body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.');
const nameRule     = body('full_name').trim().notEmpty().withMessage('El nombre completo es requerido.')
                       .isLength({ max: 255 }).withMessage('El nombre no puede superar 255 caracteres.');

const refreshRule  = body('refresh_token').notEmpty().withMessage('refresh_token es requerido.');

// ── Routes ─────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', authLimiter, [nameRule, emailRule, passwordRule], validate, controller.register);

// POST /api/auth/login
router.post('/login', authLimiter, [emailRule, passwordRule], validate, controller.login);

// POST /api/auth/logout  (requires valid session)
router.post('/logout', authenticate, controller.logout);

// POST /api/auth/refresh
router.post('/refresh', authLimiter, [refreshRule], validate, controller.refreshToken);

module.exports = router;
