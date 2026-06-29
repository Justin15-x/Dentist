'use strict';

const { body, param, query } = require('express-validator');

const uuidParam = (name = 'id') =>
  param(name).isUUID(4).withMessage(`El parámetro '${name}' debe ser un UUID v4 válido.`);

// ── Create / full-update appointment ──────────────────────────────
const appointmentRules = [
  body('patient_id')
    .notEmpty().withMessage('El ID del paciente es requerido.')
    .isUUID(4).withMessage('patient_id debe ser un UUID v4 válido.'),

  body('appointment_date')
    .notEmpty().withMessage('La fecha de la cita es requerida.')
    .isISO8601().withMessage('Fecha inválida (use formato YYYY-MM-DD).')
    .toDate(),

  body('appointment_time')
    .notEmpty().withMessage('La hora de la cita es requerida.')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Hora inválida (use formato HH:MM en 24 h).'),

  body('reason')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('El motivo no puede superar 500 caracteres.'),

  body('status')
    .optional()
    .isIn(['scheduled', 'completed', 'cancelled', 'no_show'])
    .withMessage("Estado inválido. Opciones: 'scheduled', 'completed', 'cancelled', 'no_show'."),

  body('notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Las notas no pueden superar 1000 caracteres.'),
];

// ── List query filters (optional) ──────────────────────────────────
const listQueryRules = [
  query('date')
    .optional()
    .isISO8601().withMessage('El filtro de fecha debe ser ISO 8601 (YYYY-MM-DD).'),

  query('status')
    .optional()
    .isIn(['scheduled', 'completed', 'cancelled', 'no_show'])
    .withMessage('Estado de filtro inválido.'),

  query('patient_id')
    .optional()
    .isUUID(4).withMessage('patient_id de filtro debe ser un UUID v4 válido.'),
];

const uuidParamRules = (name = 'id') => [uuidParam(name)];

module.exports = { appointmentRules, listQueryRules, uuidParamRules };
