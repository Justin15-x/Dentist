'use strict';

const { Router } = require('express');

const ctrl                        = require('./appointment.controller');
const { authenticate }            = require('../../middlewares/auth.middleware');
const { validate }                = require('../../middlewares/validate.middleware');
const {
  appointmentRules,
  listQueryRules,
  uuidParamRules,
} = require('./appointment.validator');

const router = Router();

// All appointment routes require authentication
router.use(authenticate);

// ── IMPORTANT: specific routes BEFORE param routes ─────────────────

// POST /api/appointments/reminders/dispatch
// (Servicio de Terceros — Nodemailer + Twilio simulado)
router.post('/reminders/dispatch', ctrl.dispatchReminders);

// ── CRUD ───────────────────────────────────────────────────────────
// GET    /api/appointments?date=&status=&patient_id=
router.get ('/', listQueryRules, validate, ctrl.getAll);

// GET    /api/appointments/:id
router.get ('/:id', uuidParamRules(), validate, ctrl.getById);

// POST   /api/appointments
router.post('/', appointmentRules, validate, ctrl.create);

// PUT    /api/appointments/:id
router.put ('/:id', [...uuidParamRules(), ...appointmentRules], validate, ctrl.update);

// DELETE /api/appointments/:id
router.delete('/:id', uuidParamRules(), validate, ctrl.remove);

module.exports = router;
