const db = require('../config/db');
const AppError = require('../utils/AppError');

// ============================================================
//  Laporan Penjualan — Laba = Pendapatan - Modal
//  Modal diambil dari snapshot buy_price saat transaksi terjadi
//  (transaction_items.buy_price), sehingga riwayat tetap akurat
//  walaupun harga beli barang berubah di kemudian hari.
// ============================================================

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class ReportService {
  static async getSalesReport({ date, month, year, from, to } = {}) {
    const conditions = [`t.payment_status = 'completed'`];
    const params = [];

    if (date) {
      if (!DATE_RE.test(date)) throw new AppError('Format tanggal harus YYYY-MM-DD', 422);
      conditions.push('DATE(t.created_at) = ?');
      params.push(date);
    }

    if (month) {
      const m = Number(month);
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        throw new AppError('Bulan harus antara 1 dan 12', 422);
      }
      conditions.push('MONTH(t.created_at) = ?');
      params.push(m);
    }

    if (year) {
      const y = Number(year);
      if (!Number.isInteger(y) || y < 2000 || y > 2100) {
        throw new AppError('Tahun tidak valid', 422);
      }
      conditions.push('YEAR(t.created_at) = ?');
      params.push(y);
    }

    if (from && to) {
      conditions.push('DATE(t.created_at) BETWEEN ? AND ?');
      params.push(from, to);
    }

    const where = conditions.join(' AND ');

    // Ringkasan dihitung dari header transaksi (total_amount & total_capital
    // sudah di-snapshot oleh server saat transaksi terjadi).
    const [summary] = await db.query(
      `SELECT
         COUNT(*)                                        AS total_transactions,
         COALESCE(SUM(t.total_amount), 0)                AS total_revenue,
         COALESCE(SUM(t.total_capital), 0)               AS total_capital,
         COALESCE(SUM(t.total_amount - t.total_capital), 0) AS profit
       FROM transactions t
       WHERE ${where}`,
      params
    );

    const [topProducts] = await db.query(
      `SELECT
         p.id, p.code, p.name,
         SUM(ti.qty)                        AS total_qty,
         SUM(ti.subtotal)                   AS total_revenue,
         SUM(ti.buy_price * ti.qty)         AS total_capital,
         SUM(ti.subtotal - (ti.buy_price * ti.qty)) AS profit
       FROM transactions t
       JOIN transaction_items ti ON ti.transaction_id = t.id
       JOIN products p ON p.id = ti.product_id
       WHERE ${where}
       GROUP BY p.id, p.code, p.name
       ORDER BY total_revenue DESC
       LIMIT 10`,
      params
    );

    return { ...summary[0], top_products: topProducts };
  }
}

module.exports = ReportService;
