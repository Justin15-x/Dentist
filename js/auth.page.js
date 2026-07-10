import { login, register } from './services/auth.service.js';
import { saveSession, isAuthenticated } from './storage.js';
import { ApiError } from './api.js';

// Si ya hay sesión activa, ir directo al panel
if (isAuthenticated()) {
  window.location.href = 'app.html';
}

const tabs = document.querySelectorAll('.auth-tab');
const forms = document.querySelectorAll('.auth-form');
const errorBox = document.getElementById('auth-error');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('is-active'));
    forms.forEach((f) => f.classList.remove('is-active'));
    tab.classList.add('is-active');
    document.getElementById(`${tab.dataset.tab}-form`).classList.add('is-active');
    hideError();
  });
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}
function hideError() {
  errorBox.style.display = 'none';
}

function setLoading(form, loading) {
  const btn = form.querySelector('.auth-submit');
  const label = btn.querySelector('.btn-label');
  btn.disabled = loading;
  if (loading) {
    btn.dataset.original = label.textContent;
    label.textContent = 'Un momento…';
  } else {
    label.textContent = btn.dataset.original || label.textContent;
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value;

  setLoading(form, true);
  try {
    const res = await login({ email, password });
    saveSession(res.data);
    window.location.href = 'app.html';
  } catch (err) {
    showError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.');
  } finally {
    setLoading(form, false);
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  const form = e.target;
  const full_name = form.full_name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;

  if (password.length < 8) {
    showError('La contraseña debe tener al menos 8 caracteres.');
    return;
  }

  setLoading(form, true);
  try {
    const res = await register({ full_name, email, password });
    if (res.data && res.data.access_token) {
      saveSession(res.data);
      window.location.href = 'app.html';
    } else {
      // Algunas APIs solo confirman el registro y piden iniciar sesión aparte
      document.querySelector('[data-tab="login"]').click();
      showError('Cuenta creada. Ahora inicia sesión.');
      errorBox.classList.remove('alert--error');
      errorBox.classList.add('alert--success');
    }
  } catch (err) {
    showError(err instanceof ApiError ? err.message : 'No se pudo crear la cuenta.');
  } finally {
    setLoading(form, false);
  }
});
