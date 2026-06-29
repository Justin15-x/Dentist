'use strict';

const service             = require('./patient.service');
const notificationService = require('../notifications/notification.service');

// ── GET /api/patients ──────────────────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const patients = await service.getAllPatients(req.db);
    res.json({ success: true, total: patients.length, data: patients });
  } catch (err) { next(err); }
};

// ── GET /api/patients/:id ──────────────────────────────────────────
const getById = async (req, res, next) => {
  try {
    const patient = await service.getPatientById(req.db, req.params.id);
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
};

// ── POST /api/patients ─────────────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const patient = await service.createPatient(req.db, req.body, req.user.id);
    res.status(201).json({ success: true, data: patient });
  } catch (err) { next(err); }
};

// ── PUT /api/patients/:id ──────────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const patient = await service.updatePatient(req.db, req.params.id, req.body);
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
};

// ── DELETE /api/patients/:id ───────────────────────────────────────
const remove = async (req, res, next) => {
  try {
    await service.deletePatient(req.db, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
};

// ── POST /api/patients/:id/payments ───────────────────────────────
const addPayment = async (req, res, next) => {
  try {
    const result = await service.registerPayment(
      req.params.id,
      req.body,
      req.user.id,
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── GET /api/patients/:id/summary  (Servicio Propio) ──────────────
const getFinancialSummary = async (req, res, next) => {
  try {
    const summary = await service.getFinancialSummary(req.db, req.params.id);
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, addPayment, getFinancialSummary };
