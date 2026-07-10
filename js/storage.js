// 🔐 Manejo de sesión en localStorage
const KEYS = {
  access: 'molar_access_token',
  refresh: 'molar_refresh_token',
  user: 'molar_user',
};

export function saveSession({ access_token, refresh_token, user }) {
  if (access_token) localStorage.setItem(KEYS.access, access_token);
  if (refresh_token) localStorage.setItem(KEYS.refresh, refresh_token);
  if (user) localStorage.setItem(KEYS.user, JSON.stringify(user));
}

export function getAccessToken() {
  return localStorage.getItem(KEYS.access);
}

export function getRefreshToken() {
  return localStorage.getItem(KEYS.refresh);
}

export function getUser() {
  const raw = localStorage.getItem(KEYS.user);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem(KEYS.access);
  localStorage.removeItem(KEYS.refresh);
  localStorage.removeItem(KEYS.user);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
