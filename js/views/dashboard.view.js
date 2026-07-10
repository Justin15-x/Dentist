import { listPatients } from '../services/patients.service.js';
import { listAppointments } from '../services/appointments.service.js';
import { formatCurrency, formatDateTime, statusLabel, escapeHtml } from '../ui/format.js';
import { getUser } from '../storage.js';

export async function renderDashboard(root) {
  const user = getUser();
  const today = new Date().toISOString().slice(0, 10);

  const [patientsRes, todayApptsRes] = await Promise.all([
    listPatients(),
    listAppointments({ date: today }),
  ]);

  const patients = patientsRes.data || [];
  const todayAppts = todayApptsRes.data || [];

  const balancePendiente = patients.reduce((sum, p) => {
    const total = Number(p.total_cost || 0);
    const pagado = Number(p.total_paid || 0);
    return sum + Math.max(total - pagado, 0);
  }, 0);

  const pacientesAlDia = patients.filter((p) => Number(p.total_paid || 0) >= Number(p.total_cost || 0)).length;

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Hola${user?.full_name ? `, ${escapeHtml(user.full_name.split(' ')[0])}` : ''} 👋</h1>
        <p>Esto es lo que está pasando hoy en tu consultorio.</p>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-card__label">Pacientes activos</div>
        <div class="stat-card__value">${patients.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Citas hoy</div>
        <div class="stat-card__value">${todayAppts.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Balance pendiente total</div>
        <div class="stat-card__value">${formatCurrency(balancePendiente)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Pacientes al día</div>
        <div class="stat-card__value">${pacientesAlDia}</div>
      </div>
    </div>

    <div class="panel">
      <h2>Citas de hoy</h2>
      ${todayAppts.length === 0 ? `
        <div class="empty-state">
          <h3>Sin citas programadas</h3>
          <p>No hay citas para hoy. Aprovecha para ponerte al día con expedientes.</p>
        </div>
      ` : `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Hora</th><th>Paciente</th><th>Motivo</th><th>Estado</th></tr>
            </thead>
            <tbody>
              ${todayAppts.map((a) => `
                <tr>
                  <td class="mono">${escapeHtml(a.appointment_time || '—')}</td>
                  <td>${escapeHtml(a.patient?.full_name || a.patient_id || '—')}</td>
                  <td>${escapeHtml(a.reason || '—')}</td>
                  <td><span class="badge badge--${a.status}">${statusLabel(a.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}
