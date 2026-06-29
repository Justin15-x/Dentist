'use strict';

const { supabaseAdmin } = require('../../config/supabase');

const TABLE         = 'patients';
const PAYMENT_TABLE = 'payment_records';

// ── Helpers ────────────────────────────────────────────────────────

/** Throw a formatted AppError */
const appError = (message, code = 500) => {
  const e = new Error(message);
  e.statusCode = code;
  return e;
};

/** Throw if Supabase returned an error */
const guard = (error) => { if (error) throw appError(error.message, 400); };

// ── CRUD ───────────────────────────────────────────────────────────

/**
 * List all patients belonging to the authenticated dentist.
 * RLS on req.db ensures isolation; we pass db in to respect it.
 */
const getAllPatients = async (db) => {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  guard(error);
  return data;
};

const getPatientById = async (db, id) => {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error?.code === 'PGRST116') throw appError('Paciente no encontrado.', 404);
  guard(error);
  return data;
};

const createPatient = async (db, body, dentistId) => {
  const { data, error } = await db
    .from(TABLE)
    .insert({ ...body, dentist_id: dentistId })
    .select()
    .single();

  guard(error);
  return data;
};

const updatePatient = async (db, id, body) => {
  // Strip fields that must not be updated directly via this endpoint
  const { dentist_id: _d, created_at: _c, ...safeBody } = body;

  const { data, error } = await db
    .from(TABLE)
    .update(safeBody)
    .eq('id', id)
    .select()
    .single();

  if (error?.code === 'PGRST116') throw appError('Paciente no encontrado.', 404);
  guard(error);
  return data;
};

const deletePatient = async (db, id) => {
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq('id', id);

  guard(error);
};

// ── Atomic Payment Registration ────────────────────────────────────
/**
 * Calls the add_payment PL/pgSQL function (defined in schema.sql).
 * The function runs inside a transaction: validates limits, inserts
 * the payment_record and updates patients.total_paid atomically.
 *
 * Uses supabaseAdmin to invoke the RPC (SECURITY DEFINER function).
 * The dentistId guard is enforced inside the function itself (WHERE dentist_id = p_recorded_by).
 */
const registerPayment = async (patientId, paymentData, dentistId) => {
  const { data, error } = await supabaseAdmin.rpc('add_payment', {
    p_patient_id:     patientId,
    p_amount:         paymentData.amount_paid,
    p_payment_method: paymentData.payment_method ?? null,
    p_notes:          paymentData.notes          ?? null,
    p_recorded_by:    dentistId,
  });

  if (error) {
    // Surface domain errors from PL/pgSQL RAISE EXCEPTION
    const isDomain = ['P0001', 'P0002'].includes(error.code);
    throw appError(error.message, isDomain ? 400 : 500);
  }

  return data; // { patient: {...}, payment_record: {...} }
};

// ── Financial Summary  (Servicio Propio / Internal Service) ────────
/**
 * Calculates remaining balance and assembles a patient summary.
 * This is the "own internal service" endpoint required by the spec.
 *
 * Balance = total_cost − total_paid
 */
const getFinancialSummary = async (db, patientId) => {
  // Run three queries in parallel; all respect RLS via db
  const [patientRes, appointmentsRes, paymentsRes] = await Promise.all([
    db.from(TABLE)
      .select('id, full_name, email, phone, treatment_description, total_cost, total_paid')
      .eq('id', patientId)
      .single(),

    db.from('appointments')
      .select('id, appointment_date, appointment_time, reason, status, notes')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .limit(10),

    db.from(PAYMENT_TABLE)
      .select('id, amount, payment_date, payment_method, notes')
      .eq('patient_id', patientId)
      .order('payment_date', { ascending: false }),
  ]);

  if (patientRes.error?.code === 'PGRST116') throw appError('Paciente no encontrado.', 404);
  guard(patientRes.error);

  const p          = patientRes.data;
  const totalCost  = parseFloat(p.total_cost)  || 0;
  const totalPaid  = parseFloat(p.total_paid)  || 0;
  const balance    = parseFloat((totalCost - totalPaid).toFixed(2));
  const pct        = totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;

  return {
    paciente: {
      id:          p.id,
      nombre:      p.full_name,
      email:       p.email,
      telefono:    p.phone,
      tratamiento: p.treatment_description,
    },
    resumen_financiero: {
      costo_total:        totalCost,
      total_pagado:       totalPaid,
      balance_restante:   balance,
      pagado_en_su_totalidad: balance <= 0,
      porcentaje_pagado:  pct,
    },
    historial_pagos:   paymentsRes.data     ?? [],
    citas_recientes:   appointmentsRes.data ?? [],
    generado_en:       new Date().toISOString(),
  };
};

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  registerPayment,
  getFinancialSummary,
};
