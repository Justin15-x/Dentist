import { isAuthenticated, getUser, clearSession } from './storage.js';
import { logout } from './services/auth.service.js';
import { renderDashboard } from './views/dashboard.view.js';
import { renderPatients } from './views/patients.view.js';
import { renderAppointments } from './views/appointments.view.js';

if (!isAuthenticated()) {
  window.location.href = 'index.html';
}

const user = getUser();
if (user) {
  document.getElementById('sidebar-user-name').textContent = user.full_name || 'Dentista';
  document.getElementById('sidebar-user-email').textContent = user.email || '';
}

const viewRoot = document.getElementById('view-root');
const navLinks = document.querySelectorAll('.nav-link');

const ROUTES = {
  dashboard: renderDashboard,
  patients: renderPatients,
  appointments: renderAppointments,
};

function currentRoute() {
  const hash = window.location.hash.replace('#/', '');
  return ROUTES[hash] ? hash : 'dashboard';
}

async function render() {
  const route = currentRoute();
  navLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.route === route));
  viewRoot.innerHTML = '<div class="empty-state">Cargando…</div>';
  try {
    await ROUTES[route](viewRoot);
  } catch (err) {
    viewRoot.innerHTML = `<div class="alert alert--error" style="display:block">${err.message || 'No se pudo cargar la vista.'}</div>`;
  }
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    window.location.hash = `#/${link.dataset.route}`;
  });
});

window.addEventListener('hashchange', render);

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await logout();
  } catch {
    // aunque falle en el servidor, cerramos sesión localmente
  }
  clearSession();
  window.location.href = 'index.html';
});

if (!window.location.hash) window.location.hash = '#/dashboard';
render();
