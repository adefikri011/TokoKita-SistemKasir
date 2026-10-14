// ============================================================
//  Merakit struk dalam bentuk NETRAL (driver-agnostic).
//  Driver printer tinggal merender struktur ini ke formatnya
//  masing-masing (HTML, ESC/POS, PDF, dsb).
// ============================================================

const STORE = {
  name: process.env.STORE_NAME || 'TokoKita',
  address: process.env.STORE_ADDRESS || 'Sistem Kasir Toko Kelontong'
};

const buildReceipt = (transaction) => ({
  store: STORE,
  trx_code: transaction.trx_code,
  date: transaction.created_at || new Date().toISOString(),
  cashier: transaction.cashier_name,
  customer: transaction.customer_name || null,
  items: (transaction.items || []).map((item) => ({
    name: item.name || item.code,
    qty: Number(item.qty),
    price: Number(item.sell_price),
    subtotal: Number(item.subtotal)
  })),
  discount_amount: Number(transaction.discount_amount || 0),
  total_amount: Number(transaction.total_amount),
  payment_method: transaction.payment_method,
  payment_status: transaction.payment_status
});

module.exports = { buildReceipt, STORE };
