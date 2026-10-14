const db = require('../config/db');
const AppError = require('../utils/AppError');

class ProductService {
  static async findAll(search = '') {
    let query = `
      SELECT p.id, p.code, p.name, p.unit, p.buy_price, p.sell_price, p.stock,
             p.category_id, p.image_url, p.is_active, p.updated_at,
             c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    const params = [];

    if (search) {
      query += ' WHERE p.name LIKE ? OR p.code LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.name ASC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    if (!rows.length) throw new AppError('Barang tidak ditemukan', 404);
    return rows[0];
  }

  static async create(payload) {
    await this.assertCodeAvailable(payload.code);

    const [result] = await db.query(
      `INSERT INTO products (code, name, unit, buy_price, sell_price, stock, category_id, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.code,
        payload.name,
        payload.unit || 'pcs',
        payload.buy_price,
        payload.sell_price,
        payload.stock,
        payload.category_id || null,
        payload.image_url || null
      ]
    );

    return this.findById(result.insertId);
  }

  static async update(id, payload) {
    await this.findById(id);
    if (payload.code) await this.assertCodeAvailable(payload.code, id);

    await db.query(
      `UPDATE products
       SET name = ?, unit = ?, buy_price = ?, sell_price = ?, stock = ?, category_id = ?, image_url = ?
       WHERE id = ?`,
      [
        payload.name,
        payload.unit || 'pcs',
        payload.buy_price,
        payload.sell_price,
        payload.stock,
        payload.category_id || null,
        payload.image_url || null,
        id
      ]
    );

    return this.findById(id);
  }

  static async remove(id) {
    await this.findById(id);

    // Jangan hapus barang yang masih punya riwayat transaksi
    const [used] = await db.query(
      'SELECT COUNT(*) AS total FROM transaction_items WHERE product_id = ?',
      [id]
    );
    if (Number(used[0].total) > 0) {
      throw new AppError(
        'Barang memiliki riwayat transaksi dan tidak bisa dihapus. Nonaktifkan saja.',
        409
      );
    }

    await db.query('DELETE FROM products WHERE id = ?', [id]);
  }

  static async assertCodeAvailable(code, exceptId = null) {
    const [rows] = await db.query(
      'SELECT id FROM products WHERE code = ?' + (exceptId ? ' AND id != ?' : ''),
      exceptId ? [code, exceptId] : [code]
    );
    if (rows.length) throw new AppError(`Kode barang "${code}" sudah digunakan`, 409);
  }
}

module.exports = ProductService;
