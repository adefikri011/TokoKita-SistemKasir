import { formatRupiah, formatDate } from './formatters.js';
import { escapeHtml } from './html.js';

const STATUS_LABEL = {
  completed: '<span class="badge badge-success">Lunas</span>',
  pending: '<span class="badge badge-warning">Pending</span>',
  cancelled: '<span class="badge badge-danger">Dibatalkan</span>'
};

const METHOD_LABEL = {
  cash: 'Tunai', qris: 'QRIS', debit: 'Debit',
  ewallet: 'E-Wallet', transfer: 'Transfer'
};

// Render baris tabel transaksi bersama untuk halaman pending & riwayat
export const renderTransactionRows = (transactions, { emptyText, actions }) => {
  if (!transactions.length) {
    return `<tr><td colspan="6" class="cell-empty">${escapeHtml(emptyText)}</td></tr>`;
  }

  return transactions.map(t => {
    const itemsPreview = (t.items || [])
      .map(i => `${escapeHtml(i.name || i.code)} (${i.qty}${i.unit ? ' ' + escapeHtml(i.unit) : ''})`)
      .join(', ');

    return `
      <tr>
        <td class="cell-code">${escapeHtml(t.trx_code)}</td>
        <td class="cell-muted">${formatDate(t.created_at)}</td>
        <td>
          <div class="cell-strong">${escapeHtml(t.customer_name || 'Umum')}</div>
          <div class="cell-muted">${itemsPreview || '-'}</div>
        </td>
        <td class="money is-num" style="text-align:right">${formatRupiah(t.total_amount)}</td>
        <td>
          ${STATUS_LABEL[t.payment_status] || escapeHtml(t.payment_status)}
          <div class="cell-muted">${escapeHtml(METHOD_LABEL[t.payment_method] || t.payment_method || '-')}</div>
        </td>
        <td class="cell-actions">${actions(t)}</td>
      </tr>
    `;
  }).join('');
};

export const paymentMethodOptions = (selected = 'cash') => `
  <option value="cash"   ${selected === 'cash' ? 'selected' : ''}>Tunai</option>
  <option value="qris"   ${selected === 'qris' ? 'selected' : ''}>QRIS</option>
  <option value="debit"  ${selected === 'debit' ? 'selected' : ''}>Debit</option>
  <option value="ewallet" ${selected === 'ewallet' ? 'selected' : ''}>E-Wallet</option>
  <option value="transfer" ${selected === 'transfer' ? 'selected' : ''}>Transfer</option>
`;
