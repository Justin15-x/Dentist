'use strict';

const { body, param } = require('express-validator');

// ── Reusable rules ─────────────────────────────────────────────────
const uuidParam = (name = 'id') =>
  param(name).isUUID(4).withMessage(`El parámetro '${name}' debe ser un UUID v4 válido.`);

// ── Create / full-update patient ───────────────────────────────────
const patientRules = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('El nombre completo es requerido.')
    .isLength({ max: 255 }).withMessage('El nombre no puede superar 255 caracteres.'),

  body('email')
    .optional({ nullable: true })
    .trim()
    .isEmail().withMessage('Formato de email inválido.')
    .normalizeEmail(),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+?[\d\s\-()\u002B]{7,20}$/).withMessage('Número de teléfono inválido.'),

  body('date_of_birth')
    .optional({ nullable: true })
    .isISO8601().withMessage('Fecha de nacimiento inválida (use formato YYYY-MM-DD).')
    .toDate(),

  body('treatment_description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('La descripción del tratamiento no puede superar 2000 caracteres.'),

  body('total_cost')
    .notEmpty().withMessage('El costo total del tratamiento es requerido.')
    .isFloat({ min: 0 }).withMessage('El costo total debe ser un número positivo.')
    .toFloat(),

  body('total_paid')
    .optional()
    .isFloat({ min: 0 }).withMessage('El monto pagado debe ser un número positivo.')
    .toFloat(),
];

// ── Register a payment ─────────────────────────────────────────────
const paymentRules = [
  uuidParam('id'),

  body('amount_paid')
    .notEmpty().withMessage('El monto a pagar es requerido.')
    .isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0.')
    .toFloat(),

  body('payment_method')
    .optional({ nullable: true })
    .isIn(['cash', 'card', 'transfer', 'other'])
    .withMessage("Método de pago inválido. Opciones: 'cash', 'card', 'transfer', 'other'."),

  body('notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Las notas no pueden superar 500 caracteres.'),
];

// ── UUID param only ────────────────────────────────────────────────
const uuidParamRules = (name = 'id') => [uuidParam(name)];

module.exports = { patientRules, paymentRules, uuidParamRules };
