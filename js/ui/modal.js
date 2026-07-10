// 🪟 Modal reutilizable
let currentOverlay = null;

export function closeModal() {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
    document.removeEventListener('keydown', onEscape);
  }
}

function onEscape(e) {
  if (e.key === 'Escape') closeModal();
}

/**
 * @param {string} title
 * @param {string} bodyHTML
 * @param {(root: HTMLElement) => void} onMount - se llama con el nodo del modal ya en el DOM
 */
export function openModal(title, bodyHTML, onMount) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${title}">
      <header class="modal-header">
        <h3>${title}</h3>
        <button class="icon-btn modal-close" aria-label="Cerrar">&times;</button>
      </header>
      <div class="modal-body">${bodyHTML}</div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  overlay.querySelector('.modal-close').addEventListener('click', closeModal);

  document.body.appendChild(overlay);
  currentOverlay = overlay;
  document.addEventListener('keydown', onEscape);

  if (onMount) onMount(overlay.querySelector('.modal'));
  return overlay;
}
