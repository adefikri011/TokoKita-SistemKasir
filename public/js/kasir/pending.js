import { API } from '../api.js';
import { formatRupiah } from '../utils/formatters.js';
import { renderTransactionRows, paymentMethodOptions } from '../utils/trxRenderer.js';
import { printReceipt } from '../utils/printer.js';

let selectedId = null;

export const initPendingPage = () => {
  loadPending();

  document.getElementById('btnRefreshPending')
    ?.addEventListener('click', loadPending);

  document.getElementById('btnClosePayModal')
    ?.addEventListener('click', closePayModal);

  document.getElementById('btnCancelPayModal')
    ?.addEventListener('click', closePayModal);

  document.getElementById('btnConfirmPay')
    ?.addEventListener('click', confirmPay);

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-pending-action]');
    if (!btn) return;

    const id = Number(btn.dataset.id);

    if (btn.dataset.pendingAction === 'pay') openPayModal(id);
    if (btn.dataset.pendingAction === 'cancel') await cancelPending(id);
  });
};

async function loadPending() {
  const tbody = document.getElementById('pendingTableBody');
  if (!tbody) return;

  try {
    const { data } = await API.getPendingTransactions();

    tbody.innerHTML = renderTransactionRows(data, {
      emptyText: 'Tidak ada transaksi pending. Semua sudah lunas.',
      actions: (t) => `
        <span class="table-actions">
          <button data-pending-action="pay" data-id="${t.id}" class="link-action">Lunasi</button>
          <button data-pending-action="cancel" data-id="${t.id}" class="link-danger">Batalkan</button>
        </span>
      `
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="cell-error">${err.message}</td></tr>`;
  }
}

async function openPayModal(id) {
  try {
    const { data: trx } = await API.getTransactionById(id);
    selectedId = id;

    document.getElementById('payModalInfo').textContent =
      `${trx.trx_code} · ${trx.items.length} item · Total ${formatRupiah(trx.total_amount)}`;

    document.getElementById('payMethod').innerHTML = paymentMethodOptions('cash');
    document.getElementById('payModal')?.classList.remove('hidden');
  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}

function closePayModal() {
  selectedId = null;
  document.getElementById('payModal')?.classList.add('hidden');
}

async function confirmPay() {
  if (!selectedId) return;

  const method = document.getElementById('payMethod').value;

  try {
    const { data } = await API.payPendingTransaction(selectedId, method);
    closePayModal();
    await loadPending();
    window.showToast?.(`Transaksi ${data.trx_code} berhasil dilunasi`);

    if (confirm('Cetak struk untuk transaksi ini?')) {
      printReceipt({ ...data, cashier_name: data.cashier_name });
    }
  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}

async function cancelPending(id) {
  if (!confirm('Batalkan transaksi ini? Stok akan dikembalikan.')) return;

  try {
    await API.cancelPendingTransaction(id);
    await loadPending();
    window.showToast?.('Transaksi dibatalkan, stok dikembalikan');
  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}
