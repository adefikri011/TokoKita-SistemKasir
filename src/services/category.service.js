const db = require('../config/db');
const AppError = require('../utils/AppError');

class CategoryService {
  static async findAll(search = '') {
    let query = `
      SELECT c.id, c.name, c.description, c.created_at,
             (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
      FROM categories c
    `;
    const params = [];

    if (search) {
      query += ' WHERE c.name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY c.name ASC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (!rows.length) throw new AppError('Kategori tidak ditemukan', 404);
    return rows[0];
  }

  static async create({ name, description }) {
    const [exists] = await db.query('SELECT id FROM categories WHERE name = ?', [name]);
    if (exists.length) throw new AppError('Nama kategori sudah digunakan', 409);

    const [result] = await db.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    return this.findById(result.insertId);
  }

  static async update(id, { name, description }) {
    await this.findById(id);

    const [exists] = await db.query(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [name, id]
    );
    if (exists.length) throw new AppError('Nama kategori sudah digunakan', 409);

    await db.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
    return this.findById(id);
  }

  static async remove(id) {
    await this.findById(id);

    const [inUse] = await db.query(
      'SELECT COUNT(*) AS total FROM products WHERE category_id = ?',
      [id]
    );
    if (Number(inUse[0].total) > 0) {
      throw new AppError(
        'Kategori masih dipakai oleh barang. Pindahkan barang tersebut terlebih dahulu.',
        409
      );
    }

    await db.query('DELETE FROM categories WHERE id = ?', [id]);
  }
}

module.exports = CategoryService;
