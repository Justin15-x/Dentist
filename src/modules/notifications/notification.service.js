'use strict';

/**
 * Notification Service  (Servicio de Terceros)
 * ─────────────────────────────────────────────
 * Email  : Nodemailer
 *            • Development: Ethereal (fake SMTP — preview URL logged to console)
 *            • Production : real SMTP via EMAIL_* env vars
 *
 * SMS    : Twilio (simulated)
 *            • Logs a mock Twilio response to console.
 *            • To activate real Twilio, install the 'twilio' package and
 *              replace sendSMS() with the live client call.
 */

const nodemailer = require('nodemailer');
const env        = require('../../config/env');

// ── Email Transport (lazy singleton) ──────────────────────────────
let _transport = null;

async function getTransport() {
  if (_transport) return _transport;

  const useReal = env.NODE_ENV === 'production' && env.EMAIL_USER && env.EMAIL_PASS;

  if (useReal) {
    _transport = nodemailer.createTransport({
      host:   env.EMAIL_HOST,
      port:   env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth:   { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
    });
    console.info('[Email] Transporte SMTP real configurado.');
  } else {
    // Ethereal: free fake SMTP — generates a preview URL per message
    const account = await nodemailer.createTestAccount();
    _transport = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: account.user, pass: account.pass },
    });
    console.info('[Email] Transporte Ethereal (SMTP simulado) configurado.');
  }

  return _transport;
}

async function sendEmail(to, subject, html) {
  if (!to) {
    console.warn('[Email] Destinatario vacío — omitiendo envío.');
    return null;
  }

  const transport = await getTransport();
  const info      = await transport.sendMail({ from: env.EMAIL_FROM, to, subject, html });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.info(`[Email] Enviado. Vista previa Ethereal: ${previewUrl}`);
  }

  return info;
}

// ── SMS — Twilio Simulado ──────────────────────────────────────────
/**
 * Drop-in Twilio simulation.
 * To use real Twilio:
 *   npm install twilio
 *   const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
 *   return twilio.messages.create({ body: message, from: process.env.TWILIO_FROM, to });
 */
function sendSMS(to, message) {
  if (!to) {
    console.warn('[SMS] Número de destino vacío — omitiendo envío.');
    return null;
  }

  const sid    = `SM${Date.now()}${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
  const result = {
    sid,
    status:      'queued',
    to,
    body:        message,
    dateCreated: new Date().toISOString(),
    simulated:   true,
  };

  console.info('[SMS - Twilio Simulado]');
  console.info(`  SID    : ${sid}`);
  console.info(`  Para   : ${to}`);
  console.info(`  Mensaje: ${message}`);
  console.info(`  Estado : queued (simulado)`);

  return result;
}

// ── HTML Email Template ────────────────────────────────────────────
const template = (icon, title, color, bodyHtml) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
    <h2 style="color:${color};margin-top:0;">${icon} ${title}</h2>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      Este es un mensaje automático de Clínica Dental. No responda a este correo.
    </p>
  </div>`;

const formatDate = (date, time) =>
  new Date(`${date}T${time}`).toLocaleString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

// ── Public Notification Functions ──────────────────────────────────

/** Called when a new appointment is created */
async function sendConfirmation(appointment) {
  const { patients: p, appointment_date: d, appointment_time: t, reason } = appointment;
  const fechaStr = formatDate(d, t);
  const smsMsg   = `Clínica Dental: Cita confirmada para ${fechaStr}. Motivo: ${reason ?? 'Consulta general'}.`;

  const html = template('✅', 'Confirmación de Cita', '#2563eb', `
    <p>Estimado(a) <strong>${p.full_name}</strong>,</p>
    <p>Su cita ha sido registrada exitosamente:</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;width:35%;">Fecha y Hora</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${fechaStr}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">Motivo</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${reason ?? 'Consulta general'}</td>
      </tr>
    </table>
    <p style="margin-top:16px;">Si necesita cancelar o reprogramar, contáctenos con al menos 24 horas de anticipación.</p>
  `);

  const [emailRes, smsRes] = await Promise.allSettled([
    sendEmail(p.email, '✅ Confirmación de Cita — Clínica Dental', html),
    Promise.resolve(sendSMS(p.phone, smsMsg)),
  ]);

  return {
    email: emailRes.status === 'fulfilled' ? 'sent' : 'failed',
    sms:   smsRes.status   === 'fulfilled' ? 'sent' : 'failed',
  };
}

/** Called ~24 h before the appointment */
async function sendReminder(appointment) {
  const { patients: p, appointment_date: d, appointment_time: t } = appointment;
  const fechaStr = formatDate(d, t);
  const smsMsg   = `Clínica Dental: Recordatorio — tiene una cita mañana ${fechaStr}. Por favor llegue 10 min antes.`;

  const html = template('⏰', 'Recordatorio de Cita', '#f59e0b', `
    <p>Estimado(a) <strong>${p.full_name}</strong>,</p>
    <p>Le recordamos que su próxima cita es:</p>
    <p style="font-size:18px;font-weight:bold;color:#1f2937;">${fechaStr}</p>
    <p>Le pedimos llegar <strong>10 minutos antes</strong> de su horario para agilizar su atención.</p>
  `);

  const [emailRes, smsRes] = await Promise.allSettled([
    sendEmail(p.email, '⏰ Recordatorio de Cita — Clínica Dental', html),
    Promise.resolve(sendSMS(p.phone, smsMsg)),
  ]);

  return {
    email: emailRes.status === 'fulfilled' ? 'sent' : 'failed',
    sms:   smsRes.status   === 'fulfilled' ? 'sent' : 'failed',
  };
}

/** Called when an appointment is cancelled */
async function sendCancellation(appointment) {
  const { patients: p, appointment_date: d, appointment_time: t } = appointment;
  const fechaStr = formatDate(d, t);
  const smsMsg   = `Clínica Dental: Su cita del ${fechaStr} fue cancelada. Contáctenos para reprogramar.`;

  const html = template('❌', 'Cita Cancelada', '#ef4444', `
    <p>Estimado(a) <strong>${p.full_name}</strong>,</p>
    <p>Le informamos que su cita programada para <strong>${fechaStr}</strong> ha sido <strong>cancelada</strong>.</p>
    <p>Comuníquese con nosotros para reagendar en el horario que mejor le convenga.</p>
  `);

  const [emailRes, smsRes] = await Promise.allSettled([
    sendEmail(p.email, '❌ Cita Cancelada — Clínica Dental', html),
    Promise.resolve(sendSMS(p.phone, smsMsg)),
  ]);

  return {
    email: emailRes.status === 'fulfilled' ? 'sent' : 'failed',
    sms:   smsRes.status   === 'fulfilled' ? 'sent' : 'failed',
  };
}

module.exports = { sendConfirmation, sendReminder, sendCancellation };
