import { request } from '../api.js';

export function listAppointments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.status) params.set('status', filters.status);
  if (filters.patient_id) params.set('patient_id', filters.patient_id);
  const qs = params.toString();
  return request(`/appointments${qs ? `?${qs}` : ''}`);
}

export const getAppointment = (id) => request(`/appointments/${id}`);

export const createAppointment = (data) => request('/appointments', { method: 'POST', body: data });

export const updateAppointment = (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: data });

export const deleteAppointment = (id) => request(`/appointments/${id}`, { method: 'DELETE' });

export const dispatchReminders = () => request('/appointments/reminders/dispatch', { method: 'POST' });
