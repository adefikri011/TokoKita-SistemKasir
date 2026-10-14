const db = require('../config/db');
const AppError = require('../utils/AppError');

const PAYMENT_METHODS = ['cash', 'qris', 'transfer', 'debit', 'ewallet'];
const ACTIVE_STATUSES = ['pending', 'completed'];

// Pembulatan aman terhadap galat floating point
const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;

class TransactionService {
  // --------------------------------------------------------
  //  Simpan transaksi (lunas atau pending)
  //  >>> Harga jual & modal DIHITUNG SERVER dari tabel products.
  //      Client hanya mengirim product_id + qty.
  // --------------------------------------------------------
  static async createTransaction({
    items,
    payment_method,
    payment_status = 'completed',
    customer_name = null,
    cashier_id = null,
    cashier_name = 'Kasir',
    discount_amount = 0
  }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Transaksi harus memiliki minimal 1 barang', 422);
    }

    if (!PAYMENT_METHODS.includes(payment_method)) {
      throw new AppError(
        `Metode pembayaran harus salah satu dari: ${PAYMENT_METHODS.join(', ')}`,
        422
      );
    }

    if (!ACTIVE_STATUSES.includes(payment_status)) {
      throw new AppError('Status transaksi tidak valid', 422);
    }

    // Gabungkan qty bila product_id sama (mencegah duplikasi baris)
    const qtyByProduct = new Map();
    for (const item of items) {
      const id = Number(item.product_id);
      const qty = Number(item.qty);

      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError('product_id tidak valid', 422);
      }
      // Qty boleh pecahan (mis. 0.5 kg) — maksimal 3 angka di belakang koma
      if (!Number.isFinite(qty) || qty <= 0 || round3(qty) !== qty) {
        throw new AppError(
          'Jumlah barang harus lebih dari 0 (maksimal 3 angka di belakang koma)',
          422
        );
      }

      qtyByProduct.set(id, round3((qtyByProduct.get(id) || 0) + qty));
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const products = new Map();
      const ids = [...qtyByProduct.keys()];

      // Kunci baris produk agar stok tidak balapan antar kasir
      const [rows] = await connection.query(
        `SELECT id, code, name, unit, buy_price, sell_price, stock, is_active
         FROM products
         WHERE id IN (?)
         FOR UPDATE`,
        [ids]
      );

      for (const row of rows) products.set(row.id, row);

      let total_amount = 0;
      let total_capital = 0;
      const orderItems = [];

      for (const [productId, qty] of qtyByProduct) {
        const product = products.get(productId);

        if (!product || !Number(product.is_active)) {
          throw new AppError(`Barang dengan id ${productId} tidak tersedia`, 422);
        }

        if (Number(product.stock) < qty) {
          throw new AppError(
            `Stok "${product.name}" tidak mencukupi (tersisa ${Number(product.stock)})`,
            409
          );
        }

        const sell = Number(product.sell_price);
        const buy = Number(product.buy_price);
        const subtotal = round2(sell * qty);

        total_amount = round2(total_amount + subtotal);
        total_capital = round2(total_capital + buy * qty);
        orderItems.push({
          product_id: productId,
          code: product.code,
          name: product.name,
          unit: product.unit || 'pcs',
          qty,
          buy_price: buy,
          sell_price: sell,
          subtotal
        });
      }

      total_amount = round2(Math.max(total_amount - Number(discount_amount || 0), 0));

      const trxCode = await this.generateTrxCode(connection);

      const [resultTrx] = await connection.query(
        `INSERT INTO transactions
          (trx_code, customer_name, total_amount, total_capital, discount_amount,
           payment_method, payment_status, cashier_id, cashier_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trxCode,
          customer_name,
          total_amount,
          total_capital,
          discount_amount || 0,
          payment_method,
          payment_status,
          cashier_id,
          cashier_name
        ]
      );

      const transactionId = resultTrx.insertId;

      for (const item of orderItems) {
        await connection.query(
          `INSERT INTO transaction_items
            (transaction_id, product_id, qty, buy_price, sell_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [transactionId, item.product_id, item.qty, item.buy_price, item.sell_price, item.subtotal]
        );

        // Stok dipotong di sini juga untuk status pending
        // (berfungsi sebagai "reservasi" barang)
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.qty, item.product_id]
        );
      }

      await connection.commit();

      return {
        id: transactionId,
        trx_code: trxCode,
        total_amount,
        total_capital,
        discount_amount: Number(discount_amount || 0),
        payment_method,
        payment_status,
        items: orderItems
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // --------------------------------------------------------
  //  Daftar transaksi (riwayat / monitor)
  // --------------------------------------------------------
  static async findAll({ status = null, limit = 50, offset = 0 } = {}) {
    const params = [];
    let where = '';

    if (status) {
      where = 'WHERE t.payment_status = ?';
      params.push(status);
    }

    const [rows] = await db.query(
      `SELECT t.* FROM transactions t
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return Promise.all(rows.map((row) => this.withItems(row)));
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!rows.length) throw new AppError('Transaksi tidak ditemukan', 404);
    return this.withItems(rows[0]);
  }

  static async getPending() {
    return this.findAll({ status: 'pending' });
  }

  // --------------------------------------------------------
  //  Pelunasan transaksi pending — atomik & tervalidasi
  // --------------------------------------------------------
  static async payPending(id, payment_method) {
    if (!PAYMENT_METHODS.includes(payment_method)) {
      throw new AppError(
        `Metode pembayaran harus salah satu dari: ${PAYMENT_METHODS.join(', ')}`,
        422
      );
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        'SELECT * FROM transactions WHERE id = ? FOR UPDATE',
        [id]
      );

      if (!rows.length) throw new AppError('Transaksi tidak ditemukan', 404);

      const trx = rows[0];
      if (trx.payment_status !== 'pending') {
        throw new AppError(
          `Transaksi sudah berstatus "${trx.payment_status}" dan tidak bisa dilunasi`,
          409
        );
      }

      await connection.query(
        `UPDATE transactions
         SET payment_status = 'completed', payment_method = ?
         WHERE id = ?`,
        [payment_method, id]
      );

      await connection.commit();
      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // --------------------------------------------------------
  //  Batalkan pending → stok dikembalikan
  // --------------------------------------------------------
  static async cancelPending(id) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        'SELECT * FROM transactions WHERE id = ? FOR UPDATE',
        [id]
      );

      if (!rows.length) throw new AppError('Transaksi tidak ditemukan', 404);
      if (rows[0].payment_status !== 'pending') {
        throw new AppError('Hanya transaksi pending yang bisa dibatalkan', 409);
      }

      const [items] = await connection.query(
        'SELECT product_id, qty FROM transaction_items WHERE transaction_id = ?',
        [id]
      );

      for (const item of items) {
        await connection.query(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.qty, item.product_id]
        );
      }

      await connection.query(
        `UPDATE transactions SET payment_status = 'cancelled' WHERE id = ?`,
        [id]
      );

      await connection.commit();
      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ---- helpers ----
  static async withItems(trx) {
    const [items] = await db.query(
      `SELECT ti.product_id, p.code, p.name, p.unit, ti.qty, ti.buy_price, ti.sell_price, ti.subtotal
       FROM transaction_items ti
       LEFT JOIN products p ON p.id = ti.product_id
       WHERE ti.transaction_id = ?`,
      [trx.id]
    );
    return { ...trx, items };
  }

  static async generateTrxCode(connection) {
    const today = new Date();
    const ymd = today.getFullYear().toString()
      + String(today.getMonth() + 1).padStart(2, '0')
      + String(today.getDate()).padStart(2, '0');

    const [rows] = await connection.query(
      `SELECT trx_code FROM transactions
       WHERE trx_code LIKE ?
       ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [`TRX-${ymd}-%`]
    );

    let seq = 1;
    if (rows.length) {
      const last = Number(rows[0].trx_code.split('-').pop());
      if (!Number.isNaN(last)) seq = last + 1;
    }

    return `TRX-${ymd}-${String(seq).padStart(4, '0')}`;
  }
}

module.exports = TransactionService;
