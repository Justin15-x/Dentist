import {
  listPatients, createPatient, updatePatient, deletePatient, addPayment, getPatientSummary,
} from '../services/patients.service.js';
import { openModal, closeModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { formatCurrency, formatDate, escapeHtml } from '../ui/format.js';
import { ApiError } from '../api.js';

let cachedPatients = [];

export async function renderPatients(root) {
  const res = await listPatients();
  cachedPatients = res.data || [];
  root.innerHTML = layout();
  paintTable();

  root.querySelector('#new-patient-btn').addEventListener('click', () => openPatientForm());
}

function layout() {
  return `
    <div class="view-header">
      <div>
        <h1>Pacientes</h1>
        <p>Expedientes, tratamientos y control de pagos.</p>
      </div>
      <div class="view-header__actions">
        <button class="btn btn-accent" id="new-patient-btn">+ Nuevo paciente</button>
      </div>
    </div>
    <div class="panel">
      <div class="table-wrap" id="patients-table-wrap"></div>
    </div>
  `;
}

function paintTable() {
  const wrap = document.getElementById('patients-table-wrap');
  if (cachedPatients.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <h3>Aún no hay pacientes</h3>
        <p>Registra tu primer paciente para empezar a llevar su expediente.</p>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Paciente</th>
          <th>Contacto</th>
          <th>Tratamiento</th>
          <th>Balance</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${cachedPatients.map(rowHTML).join('')}
      </tbody>
    </table>
  `;

  cachedPatients.forEach((p) => {
    const row = wrap.querySelector(`[data-row="${p.id}"]`);
    row.querySelector('[data-action="summary"]').addEventListener('click', () => openSummary(p));
    row.querySelector('[data-action="payment"]').addEventListener('click', () => openPaymentForm(p));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openPatientForm(p));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDelete(p));
  });
}

function rowHTML(p) {
  const total = Number(p.total_cost || 0);
  const pagado = Number(p.total_paid || 0);
  const balance = Math.max(total - pagado, 0);
  const pct = total > 0 ? Math.min(Math.round((pagado / total) * 100), 100) : 0;

  return `
    <tr data-row="${p.id}">
      <td>
        <strong>${escapeHtml(p.full_name)}</strong>
        <div class="progress"><div class="progress__bar" style="width:${pct}%"></div></div>
      </td>
      <td>
        ${escapeHtml(p.email || '—')}<br/>
        <span class="mono">${escapeHtml(p.phone || '—')}</span>
      </td>
      <td>${escapeHtml(p.treatment_description || '—')}</td>
      <td class="num">
        ${formatCurrency(balance)}
        <br/><span class="badge ${balance <= 0 ? 'badge--paid' : 'badge--pending'}">${balance <= 0 ? 'Pagado' : 'Pendiente'}</span>
      </td>
      <td class="actions">
        <button class="btn btn-ghost btn-sm" data-action="summary">Resumen</button>
        <button class="btn btn-ghost btn-sm" data-action="payment">Pago</button>
        <button class="icon-btn" data-action="edit" title="Editar">✎</button>
        <button class="icon-btn" data-action="delete" title="Eliminar">🗑</button>
      </td>
    </tr>
  `;
}

// ---------- Crear / Editar ----------
function openPatientForm(patient) {
  const isEdit = Boolean(patient);
  openModal(isEdit ? 'Editar paciente' : 'Nuevo paciente', `
    <div class="alert alert--error" id="patient-form-error"></div>
    <form id="patient-form" novalidate>
      <div class="field">
        <label for="pf-name">Nombre completo</label>
        <input id="pf-name" name="full_name" required value="${escapeHtml(patient?.full_name || '')}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="pf-email">Correo</label>
          <input id="pf-email" name="email" type="email" value="${escapeHtml(patient?.email || '')}" />
        </div>
        <div class="field">
          <label for="pf-phone">Teléfono</label>
          <input id="pf-phone" name="phone" value="${escapeHtml(patient?.phone || '')}" />
        </div>
      </div>
      <div class="field">
        <label for="pf-treatment">Tratamiento</label>
        <input id="pf-treatment" name="treatment_description" value="${escapeHtml(patient?.treatment_description || '')}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="pf-total">Costo total</label>
          <input id="pf-total" name="total_cost" type="number" step="0.01" min="0" value="${patient?.total_cost ?? ''}" />
        </div>
        <div class="field">
          <label for="pf-paid">Total pagado</label>
          <input id="pf-paid" name="total_paid" type="number" step="0.01" min="0" value="${patient?.total_paid ?? 0}" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="patient-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar cambios' : 'Crear paciente'}</button>
      </div>
    </form>
  `, (modalEl) => {
    modalEl.querySelector('#patient-cancel').addEventListener('click', closeModal);
    modalEl.querySelector('#patient-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = modalEl.querySelector('#patient-form-error');
      errBox.style.display = 'none';
      const fd = new FormData(e.target);
      const payload = {
        full_name: fd.get('full_name').trim(),
        email: fd.get('email').trim() || undefined,
        phone: fd.get('phone').trim() || undefined,
        treatment_description: fd.get('treatment_description').trim() || undefined,
        total_cost: fd.get('total_cost') ? Number(fd.get('total_cost')) : 0,
        total_paid: fd.get('total_paid') ? Number(fd.get('total_paid')) : 0,
      };
      try {
        if (isEdit) {
          await updatePatient(patient.id, payload);
          showToast('Paciente actualizado', 'success');
        } else {
          await createPatient(payload);
          showToast('Paciente creado', 'success');
        }
        closeModal();
        await refresh();
      } catch (err) {
        errBox.textContent = err instanceof ApiError ? err.message : 'No se pudo guardar el paciente.';
        errBox.style.display = 'block';
      }
    });
  });
}

// ---------- Pago ----------
function openPaymentForm(patient) {
  openModal(`Registrar pago — ${patient.full_name}`, `
    <div class="alert alert--error" id="payment-form-error"></div>
    <div class="field">
      <label for="pay-amount">Monto</label>
      <input id="pay-amount" name="amount_paid" type="number" step="0.01" min="0.01" required />
    </div>
    <div class="field">
      <label for="pay-method">Método de pago</label>
      <select id="pay-method" name="payment_method">
        <option value="cash">Efectivo</option>
        <option value="card">Tarjeta</option>
        <option value="transfer">Transferencia</option>
      </select>
    </div>
    <div class="field">
      <label for="pay-notes">Notas</label>
      <textarea id="pay-notes" name="notes" rows="2"></textarea>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-ghost" id="payment-cancel">Cancelar</button>
      <button type="button" class="btn btn-primary" id="payment-submit">Registrar pago</button>
    </div>
  `, (modalEl) => {
    modalEl.querySelector('#payment-cancel').addEventListener('click', closeModal);
    modalEl.querySelector('#payment-submit').addEventListener('click', async () => {
      const errBox = modalEl.querySelector('#payment-form-error');
      errBox.style.display = 'none';
      const amount_paid = Number(modalEl.querySelector('#pay-amount').value);
      const payment_method = modalEl.querySelector('#pay-method').value;
      const notes = modalEl.querySelector('#pay-notes').value.trim();

      if (!amount_paid || amount_paid <= 0) {
        errBox.textContent = 'Ingresa un monto válido.';
        errBox.style.display = 'block';
        return;
      }

      try {
        await addPayment(patient.id, { amount_paid, payment_method, notes: notes || undefined });
        showToast('Pago registrado', 'success');
        closeModal();
        await refresh();
      } catch (err) {
        errBox.textContent = err instanceof ApiError ? err.message : 'No se pudo registrar el pago.';
        errBox.style.display = 'block';
      }
    });
  });
}

// ---------- Resumen ----------
async function openSummary(patient) {
  openModal(`Resumen — ${patient.full_name}`, `<div class="empty-state">Cargando resumen…</div>`, async (modalEl) => {
    try {
      const res = await getPatientSummary(patient.id);
      const d = res.data;
      const rf = d.resumen_financiero || {};
      const pagos = d.historial_pagos || [];
      const citas = d.citas_recientes || [];

      modalEl.querySelector('.modal-body').innerHTML = `
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-item__label">Costo total</div>
            <div class="summary-item__value">${formatCurrency(rf.costo_total)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-item__label">Total pagado</div>
            <div class="summary-item__value">${formatCurrency(rf.total_pagado)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-item__label">Balance restante</div>
            <div class="summary-item__value">${formatCurrency(rf.balance_restante)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-item__label">Progreso</div>
            <div class="summary-item__value">${rf.porcentaje_pagado ?? 0}%</div>
          </div>
        </div>

        <h3 style="font-size:15px;margin-bottom:8px;">Historial de pagos</h3>
        ${pagos.length === 0 ? '<p class="field-hint">Sin pagos registrados aún.</p>' : `
          <ul class="mini-list">
            ${pagos.map((p) => `<li><span>${formatDate(p.created_at || p.paid_at)} · ${escapeHtml(p.payment_method || '—')}</span><span class="mono">${formatCurrency(p.amount_paid)}</span></li>`).join('')}
          </ul>
        `}

        <h3 style="font-size:15px;margin:16px 0 8px;">Citas recientes</h3>
        ${citas.length === 0 ? '<p class="field-hint">Sin citas registradas.</p>' : `
          <ul class="mini-list">
            ${citas.map((c) => `<li><span>${formatDate(c.appointment_date)} · ${escapeHtml(c.reason || '—')}</span><span>${escapeHtml(c.status || '—')}</span></li>`).join('')}
          </ul>
        `}
      `;
    } catch (err) {
      modalEl.querySelector('.modal-body').innerHTML = `<div class="alert alert--error" style="display:block">${err instanceof ApiError ? err.message : 'No se pudo cargar el resumen.'}</div>`;
    }
  });
}

// ---------- Eliminar ----------
function confirmDelete(patient) {
  openModal('Eliminar paciente', `
    <p>¿Seguro que quieres eliminar a <strong>${escapeHtml(patient.full_name)}</strong>? Esta acción no se puede deshacer.</p>
    <div class="form-actions">
      <button type="button" class="btn btn-ghost" id="delete-cancel">Cancelar</button>
      <button type="button" class="btn btn-danger" id="delete-confirm">Eliminar</button>
    </div>
  `, (modalEl) => {
    modalEl.querySelector('#delete-cancel').addEventListener('click', closeModal);
    modalEl.querySelector('#delete-confirm').addEventListener('click', async () => {
      try {
        await deletePatient(patient.id);
        showToast('Paciente eliminado', 'success');
        closeModal();
        await refresh();
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'No se pudo eliminar el paciente.', 'error');
      }
    });
  });
}

async function refresh() {
  const res = await listPatients();
  cachedPatients = res.data || [];
  paintTable();
}
