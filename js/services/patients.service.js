import { request } from '../api.js';

export const listPatients = () => request('/patients');

export const getPatient = (id) => request(`/patients/${id}`);

export const createPatient = (data) => request('/patients', { method: 'POST', body: data });

export const updatePatient = (id, data) => request(`/patients/${id}`, { method: 'PUT', body: data });

export const deletePatient = (id) => request(`/patients/${id}`, { method: 'DELETE' });

export const addPayment = (id, data) => request(`/patients/${id}/payments`, { method: 'POST', body: data });

export const getPatientSummary = (id) => request(`/patients/${id}/summary`);
