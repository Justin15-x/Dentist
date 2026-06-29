'use strict';

const service             = require('./appointment.service');
const notificationService = require('../notifications/notification.service');

// ── GET /api/appointments ──────────────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const filters = {
      date:       req.query.date,
      status:     req.query.status,
      patient_id: req.query.patient_id,
    };
    const appointments = await service.getAllAppointments(req.db, filters);
    res.json({ success: true, total: appointments.length, data: appointments });
  } catch (err) { next(err); }
};

// ── GET /api/appointments/:id ──────────────────────────────────────
const getById = async (req, res, next) => {
  try {
    const appointment = await service.getAppointmentById(req.db, req.params.id);
    res.json({ success: true, data: appointment });
  } catch (err) { next(err); }
};

// ── POST /api/appointments ─────────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const appointment = await service.createAppointment(req.db, req.body, req.user.id);

    // Fire-and-forget: confirmation email + SMS (non-blocking)
    if (appointment.patients) {
      notificationService
        .sendConfirmation(appointment)
        .catch((err) =>
          console.error('[Notificación] Confirmación fallida:', err.message),
        );
    }

    res.status(201).json({ success: true, data: appointment });
  } catch (err) { next(err); }
};

// ── PUT /api/appointments/:id ──────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const appointment = await service.updateAppointment(req.db, req.params.id, req.body);

    // If the appointment was just cancelled, notify the patient
    if (req.body.status === 'cancelled' && appointment.patients) {
      notificationService
        .sendCancellation(appointment)
        .catch((err) =>
          console.error('[Notificación] Cancelación fallida:', err.message),
        );
    }

    res.json({ success: true, data: appointment });
  } catch (err) { next(err); }
};

// ── DELETE /api/appointments/:id ───────────────────────────────────
const remove = async (req, res, next) => {
  try {
    await service.deleteAppointment(req.db, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
};

// ── POST /api/appointments/reminders/dispatch ──────────────────────
// Servicio de Terceros: triggers Nodemailer + simulated Twilio SMS
// for all upcoming appointments not yet reminded.
// In production this would be a cron job / Supabase Edge Function.
const dispatchReminders = async (req, res, next) => {
  try {
    const upcoming = await service.getUpcomingUnreminded(24);
    const results  = [];

    for (const appt of upcoming) {
      try {
        const notifResult = await notificationService.sendReminder(appt);
        await service.markReminderSent(appt.id);
        results.push({ id: appt.id, status: 'sent', channels: notifResult });
      } catch (err) {
        results.push({ id: appt.id, status: 'failed', error: err.message });
      }
    }

    res.json({
      success:      true,
      procesadas:   upcoming.length,
      resultados:   results,
    });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, dispatchReminders };
