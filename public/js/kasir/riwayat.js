import { API } from '../api.js';
import { renderTransactionRows } from '../utils/trxRenderer.js';
import { printReceipt } from '../utils/printer.js';

export const initRiwayatPage = () => {
  loadRiwayat();

  document.getElementById('btnRefreshRiwayat')
    ?.addEventListener('click', loadRiwayat);

  document.getElementById('riwayatStatus')
    ?.addEventListener('change', loadRiwayat);

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-riwayat-action="print"]');
    if (!btn) return;

    try {
      const { data } = await API.getTransactionById(Number(btn.dataset.id));
      printReceipt(data);
    } catch (err) {
      window.showToast?.(err.message, 'error');
    }
  });
};

async function loadRiwayat() {
  const tbody = document.getElementById('riwayatTableBody');
  if (!tbody) return;

  const status = document.getElementById('riwayatStatus')?.value || '';

  try {
    const { data } = await API.getTransactions({ status, limit: 100 });

    tbody.innerHTML = renderTransactionRows(data, {
      emptyText: 'Belum ada transaksi.',
      actions: (t) => `
        <span class="table-actions">
          <button data-riwayat-action="print" data-id="${t.id}" class="link-action">Cetak Ulang</button>
        </span>
      `
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="cell-error">${err.message}</td></tr>`;
  }
}
