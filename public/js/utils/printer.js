import { formatRupiah, formatDate } from './formatters.js';

// Merakit HTML struk (58mm) lalu mencetaknya via tab baru.
// Struk dikirim dari server sudah berisi harga hasil hitungan SERVER.
export const printReceipt = (transaction) => {
  const printWindow = window.open('', '_blank', 'width=400,height=640');
  if (!printWindow) {
    alert('Popup diblokir browser. Izinkan popup untuk mencetak struk.');
    return;
  }

  const itemsHtml = (transaction.items || []).map(item => {
    const unit = item.unit ? ` ${item.unit}` : '';
    return `
      <div>${item.name || item.code}</div>
      <div class="flex">
        <span>${item.qty}${unit} x${formatRupiah(item.sell_price)}</span>
        <span>${formatRupiah(item.subtotal)}</span>
      </div>
    `;
  }).join('');

  const receiptHTML = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Struk ${transaction.trx_code || ''}</title>
      <style>
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          width: 58mm;
          padding: 4px 6px;
          margin: 0;
        }
        .text-center { text-align: center; }
        .flex { display: flex; justify-content: space-between; gap: 6px; }
        .bold { font-weight: bold; }
        .line { border-bottom: 1px dashed #000; margin: 6px 0; }
        h3 { margin: 0; font-size: 15px; }
        p { margin: 2px 0; }
        .small { font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h3>TokoKita</h3>
        <p class="small">Sistem Kasir Toko Kelontong</p>
      </div>
      <div class="line"></div>
      <div>No: ${transaction.trx_code || '-'}</div>
      <div class="small">Tgl: ${formatDate(transaction.created_at || new Date())}</div>
      <div>Kasir: ${transaction.cashier_name || '-'}</div>
      ${transaction.customer_name ? `<div>Pelanggan: ${transaction.customer_name}</div>` : ''}
      <div class="line"></div>
      ${itemsHtml}
      <div class="line"></div>
      ${Number(transaction.discount_amount) > 0 ? `
        <div class="flex"><span>Diskon</span><span>-${formatRupiah(transaction.discount_amount)}</span></div>
      ` : ''}
      <div class="flex bold" style="font-size:14px">
        <span>TOTAL</span>
        <span>${formatRupiah(transaction.total_amount)}</span>
      </div>
      <div class="flex small" style="margin-top:2px">
        <span>Metode</span>
        <span>${(transaction.payment_method || '-').toUpperCase()}</span>
      </div>
      ${transaction.payment_status === 'pending' ? `
        <p class="text-center bold" style="margin-top:6px">*** BELUM LUNAS ***</p>
      ` : ''}
      <div class="line"></div>
      <p class="text-center small">Terima kasih telah berbelanja!</p>
      <script>window.onload = function(){ window.print(); };</script>
    </body>
    </html>
  `;

  printWindow.document.write(receiptHTML);
  printWindow.document.close();
};
