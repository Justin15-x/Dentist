// 🌐 Cliente HTTP central — todas las llamadas a la API pasan por aquí
import { API_BASE_URL } from './config.js';
import { getAccessToken, getRefreshToken, saveSession, clearSession } from './storage.js';

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refresh_token = getRefreshToken();
  if (!refresh_token) throw new ApiError('No hay sesión activa', 401);

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new ApiError(json.message || 'No se pudo renovar la sesión', res.status, json);
        saveSession(json.data);
        return json.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Realiza una petición a la API.
 * @param {string} path - ruta relativa, ej: '/patients'
 * @param {object} options - { method, body, auth }
 */
export async function request(path, { method = 'GET', body, auth = true, _retry = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new ApiError('No se pudo conectar con el servidor. Verifica tu conexión o la URL de la API.', 0);
  }

  let json = {};
  try {
    json = await res.json();
  } catch {
    // respuesta sin cuerpo JSON (ej. 204)
  }

  if (res.status === 401 && auth && !_retry) {
    try {
      await refreshAccessToken();
      return request(path, { method, body, auth, _retry: true });
    } catch {
      clearSession();
      window.location.href = 'index.html';
      throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    }
  }

  if (!res.ok) {
    const message = json.message || json.error || 'Ocurrió un error inesperado.';
    throw new ApiError(message, res.status, json);
  }

  return json;
}

export { ApiError };
