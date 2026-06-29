'use strict';

const { supabaseAdmin } = require('../../config/supabase');

const TABLE = 'appointments';

// ── Helpers ────────────────────────────────────────────────────────
const appError = (message, code = 500) => {
  const e = new Error(message);
  e.statusCode = code;
  return e;
};
const guard = (error) => { if (error) throw appError(error.message, 400); };

/** Join with patients for richer responses */
const WITH_PATIENT = 'id, appointment_date, appointment_time, reason, status, notes, reminder_sent, created_at, updated_at, patients(id, full_name, email, phone)';

// ── CRUD ───────────────────────────────────────────────────────────
const getAllAppointments = async (db, filters = {}) => {
  let q = db
    .from(TABLE)
    .select(WITH_PATIENT)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });

  if (filters.date)       q = q.eq('appointment_date', filters.date);
  if (filters.status)     q = q.eq('status', filters.status);
  if (filters.patient_id) q = q.eq('patient_id', filters.patient_id);

  const { data, error } = await q;
  guard(error);
  return data;
};

const getAppointmentById = async (db, id) => {
  const { data, error } = await db
    .from(TABLE)
    .select(WITH_PATIENT)
    .eq('id', id)
    .single();

  if (error?.code === 'PGRST116') throw appError('Cita no encontrada.', 404);
  guard(error);
  return data;
};

const createAppointment = async (db, body, dentistId) => {
  const { data, error } = await db
    .from(TABLE)
    .insert({ ...body, dentist_id: dentistId })
    .select(WITH_PATIENT)
    .single();

  // Supabase surfaces the UNIQUE constraint violation
  if (error?.code === '23505') {
    throw appError('Ya existe una cita programada para ese dentista en esa fecha y hora.', 409);
  }
  guard(error);
  return data;
};

const updateAppointment = async (db, id, body) => {
  const { dentist_id: _d, patient_id: _p, created_at: _c, ...safeBody } = body;

  const { data, error } = await db
    .from(TABLE)
    .update(safeBody)
    .eq('id', id)
    .select(WITH_PATIENT)
    .single();

  if (error?.code === 'PGRST116') throw appError('Cita no encontrada.', 404);
  if (error?.code === '23505')    throw appError('Conflicto de horario con otra cita.', 409);
  guard(error);
  return data;
};

const deleteAppointment = async (db, id) => {
  const { error } = await db.from(TABLE).delete().eq('id', id);
  guard(error);
};

// ── Reminder Queries ───────────────────────────────────────────────
/**
 * Returns scheduled appointments within the next `hoursAhead` hours
 * that have not yet had a reminder sent.
 * Uses supabaseAdmin to query across all dentists (for a cron scenario);
 * pass dentistId to restrict to a single dentist if needed.
 */
const getUpcomingUnreminded = async (hoursAhead = 24) => {
  const now    = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const today  = now.toISOString().split('T')[0];
  const limit  = cutoff.toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select(WITH_PATIENT)
    .eq('status', 'scheduled')
    .eq('reminder_sent', false)
    .gte('appointment_date', today)
    .lte('appointment_date', limit);

  guard(error);
  return data;
};

/** Mark a single appointment's reminder as sent */
const markReminderSent = async (id) => {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ reminder_sent: true })
    .eq('id', id);

  guard(error);
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getUpcomingUnreminded,
  markReminderSent,
};
