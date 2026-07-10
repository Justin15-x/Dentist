import {
  listAppointments, createAppointment, updateAppointment, deleteAppointment, dispatchReminders,
} from '../services/appointments.service.js';
import { listPatients } from '../services/patients.service.js';
import { openModal, closeModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { formatDate, statusLabel, escapeHtml } from '../ui/format.js';
import { ApiError } from '../api.js';

let cachedAppointments = [];
let cachedPatients = [];
let currentFilters = {};

export async function renderAppointments(root) {
  const [apptRes, patientsRes] = await Promise.all([listAppointments(currentFilters), listPatients()]);
  cachedAppointments = apptRes.data || [];
  cachedPatients = patientsRes.data || [];

  root.innerHTML = layout();
  paintTable();
  bindFilters(root);

  root.querySelector('#new-appt-btn').addEventListener('click', () => openAppointmentForm());
  root.querySelector('#dispatch-btn').addEventListener('click', onDispatch);
}

function layout() {
  return `
    <div class="view-header">
      <div>
        <h1>Citas</h1>
        <p>Agenda, filtra y envía recordatorios a tus pacientes.</p>
      </div>
      <div class="view-header__actions">
        <button class="btn btn-ghost" id="dispatch-btn">Enviar recordatorios</button>
        <button class="btn btn-accent" id="new-appt-btn">+ Nueva cita</button>
      </div>
    </div>

    <div class="panel">
      <div class="filters">
        <div class="field">
          <label for="f-date">Fecha</label>
          <input type="date" id="f-date" />
        </div>
        <div class="field">
          <label for="f-status">Estado</label>
          <select id="f-status">
            <option value="">Todos</option>
            <option value="scheduled">Programada</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
            <option value="no_show">No asistió</option>
          </select>
        </div>
        <div class="field">
          <label for="f-patient">Paciente</label>
          <select id="f-patient">
            <option value="">Todos</option>
            ${cachedPatients.map((p) => `<option value="${p.id}">${escapeHtml(p.full_name)}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-ghost btn-sm" id="clear-filters">Limpiar</button>
      </div>
      <div class="table-wrap" id="appt-table-wrap"></div>
    </div>
  `;
}

function bindFilters(root) {
  const dateEl = root.querySelector('#f-date');
  const statusEl = root.querySelector('#f-status');
  const patientEl = root.querySelector('#f-patient');

  dateEl.value = currentFilters.date || '';
  statusEl.value = currentFilters.status || '';
  patientEl.value = currentFilters.patient_id || '';

  async function applyFilters() {
    currentFilters = {
      date: dateEl.value || undefined,
      status: statusEl.value || undefined,
      patient_id: patientEl.value || undefined,
    };
    const res = await listAppointments(currentFilters);
    cachedAppointments = res.data || [];
    paintTable();
  }

  dateEl.addEventListener('change', applyFilters);
  statusEl.addEventListener('change', applyFilters);
  patientEl.addEventListener('change', applyFilters);
  root.querySelector('#clear-filters').addEventListener('click', () => {
    dateEl.value = '';
    statusEl.value = '';
    patientEl.value = '';
    applyFilters();
  });
}

function paintTable() {
  const wrap = document.getElementById('appt-table-wrap');
  if (cachedAppointments.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <h3>No hay citas con estos filtros</h3>
        <p>Ajusta los filtros o agenda una nueva cita.</p>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th>Motivo</th><th>Estado</th><th></th></tr>
      </thead>
      <tbody>
        ${cachedAppointments.map(rowHTML).join('')}
      </tbody>
    </table>
  `;

  cachedAppointments.forEach((a) => {
    const row = wrap.querySelector(`[data-row="${a.id}"]`);
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openAppointmentForm(a));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDelete(a));
  });
}

function patientName(a) {
  if (a.patient?.full_name) return a.patient.full_name;
  const found = cachedPatients.find((p) => p.id === a.patient_id);
  return found ? found.full_name : (a.patient_id || '—');
}

function rowHTML(a) {
  return `
    <tr data-row="${a.id}">
      <td>${formatDate(a.appointment_date)}</td>
      <td class="mono">${escapeHtml(a.appointment_time || '—')}</td>
      <td>${escapeHtml(patientName(a))}</td>
      <td>${escapeHtml(a.reason || '—')}</td>
      <td><span class="badge badge--${a.status}">${statusLabel(a.status)}</span></td>
      <td class="actions">
        <button class="icon-btn" data-action="edit" title="Editar">✎</button>
        <button class="icon-btn" data-action="delete" title="Eliminar">🗑</button>
      </td>
    </tr>
  `;
}

function openAppointmentForm(appt) {
  const isEdit = Boolean(appt);
  openModal(isEdit ? 'Editar cita' : 'Nueva cita', `
    <div class="alert alert--error" id="appt-form-error"></div>
    <form id="appt-form" novalidate>
      <div class="field">
        <label for="af-patient">Paciente</label>
        <select id="af-patient" name="patient_id" required>
          <option value="" disabled ${!appt ? 'selected' : ''}>Selecciona un paciente</option>
          ${cachedPatients.map((p) => `<option value="${p.id}" ${appt?.patient_id === p.id ? 'selected' : ''}>${escapeHtml(p.full_name)}</option>`).join('')}
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="af-date">Fecha</label>
          <input id="af-date" name="appointment_date" type="date" required value="${appt?.appointment_date || ''}" />
        </div>
        <div class="field">
          <label for="af-time">Hora</label>
          <input id="af-time" name="appointment_time" type="time" required value="${appt?.appointment_time || ''}" />
        </div>
      </div>
      <div class="field">
        <label for="af-reason">Motivo</label>
        <input id="af-reason" name="reason" required value="${escapeHtml(appt?.reason || '')}" />
      </div>
      <div class="field">
        <label for="af-status">Estado</label>
        <select id="af-status" name="status">
          <option value="scheduled" ${appt?.status === 'scheduled' ? 'selected' : ''}>Programada</option>
          <option value="completed" ${appt?.status === 'completed' ? 'selected' : ''}>Completada</option>
          <option value="cancelled" ${appt?.status === 'cancelled' ? 'selected' : ''}>Cancelada</option>
          <option value="no_show" ${appt?.status === 'no_show' ? 'selected' : ''}>No asistió</option>
        </select>
      </div>
      <div class="field">
        <label for="af-notes">Notas</label>
        <textarea id="af-notes" name="notes" rows="2">${escapeHtml(appt?.notes || '')}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="appt-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar cambios' : 'Agendar cita'}</button>
      </div>
    </form>
  `, (modalEl) => {
    modalEl.querySelector('#appt-cancel').addEventListener('click', closeModal);
    modalEl.querySelector('#appt-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = modalEl.querySelector('#appt-form-error');
      errBox.style.display = 'none';
      const fd = new FormData(e.target);
      const payload = {
        patient_id: fd.get('patient_id'),
        appointment_date: fd.get('appointment_date'),
        appointment_time: fd.get('appointment_time'),
        reason: fd.get('reason').trim(),
        status: fd.get('status'),
        notes: fd.get('notes').trim() || undefined,
      };
      try {
        if (isEdit) {
          await updateAppointment(appt.id, payload);
          showToast('Cita actualizada', 'success');
        } else {
          await createAppointment(payload);
          showToast('Cita agendada', 'success');
        }
        closeModal();
        await refresh();
      } catch (err) {
        errBox.textContent = err instanceof ApiError ? err.message : 'No se pudo guardar la cita.';
        errBox.style.display = 'block';
      }
    });
  });
}

function confirmDelete(appt) {
  openModal('Eliminar cita', `
    <p>¿Seguro que quieres eliminar la cita de <strong>${escapeHtml(patientName(appt))}</strong> del ${formatDate(appt.appointment_date)}?</p>
    <div class="form-actions">
      <button type="button" class="btn btn-ghost" id="del-appt-cancel">Cancelar</button>
      <button type="button" class="btn btn-danger" id="del-appt-confirm">Eliminar</button>
    </div>
  `, (modalEl) => {
    modalEl.querySelector('#del-appt-cancel').addEventListener('click', closeModal);
    modalEl.querySelector('#del-appt-confirm').addEventListener('click', async () => {
      try {
        await deleteAppointment(appt.id);
        showToast('Cita eliminada', 'success');
        closeModal();
        await refresh();
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'No se pudo eliminar la cita.', 'error');
      }
    });
  });
}

async function onDispatch(e) {
  const btn = e.currentTarget;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Enviando…';
  try {
    const res = await dispatchReminders();
    const enviados = res.procesadas ?? (res.resultados || []).length;
    showToast(`Recordatorios procesados: ${enviados}`, 'success');
  } catch (err) {
    showToast(err instanceof ApiError ? err.message : 'No se pudieron enviar los recordatorios.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function refresh() {
  const res = await listAppointments(currentFilters);
  cachedAppointments = res.data || [];
  paintTable();
}
