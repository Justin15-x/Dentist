import { request } from '../api.js';

export function register({ full_name, email, password }) {
  return request('/auth/register', { method: 'POST', body: { full_name, email, password }, auth: false });
}

export function login({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}
