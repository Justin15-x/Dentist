'use strict';

const { Router } = require('express');

const ctrl                        = require('./patient.controller');
const { authenticate }            = require('../../middlewares/auth.middleware');
const { validate }                = require('../../middlewares/validate.middleware');
const { patientRules, paymentRules, uuidParamRules } = require('./patient.validator');

const router = Router();

// All patient routes require a valid session
router.use(authenticate);

// ── /api/patients ──────────────────────────────────────────────────
router.get ('              /',                                           ctrl.getAll);
router.post('              /', patientRules,         validate,           ctrl.create);
router.get ('          /:id',  uuidParamRules(),     validate,           ctrl.getById);
router.put ('          /:id', [...uuidParamRules(), ...patientRules],  validate, ctrl.update);
router.delete('        /:id',  uuidParamRules(),     validate,           ctrl.remove);

// ── Financial sub-resources ────────────────────────────────────────
// POST  /api/patients/:id/payments  → register a payment (atomic)
router.post('/:id/payments', paymentRules, validate, ctrl.addPayment);

// GET   /api/patients/:id/summary   → balance + appointment history (Servicio Propio)
router.get ('/:id/summary',  uuidParamRules(), validate, ctrl.getFinancialSummary);

module.exports = router;
