// ============================================================
//  Scanner Barcode
//
//  Scanner USB umumnya bekerja sebagai "keyboard wedge":
//  mengetik kode barang lalu menekan Enter. Karena itu hampir
//  semua logika scanner ada di FRONTEND (public/js/kasir/scanner.js).
//
//  Backend di sini hanya menyediakan:
//    - daftar perangkat terdaftar
//    - pengecekan status koneksi (untuk panel admin)
//    - endpoint lookup cepat berdasarkan kode
// ============================================================

const db = require('../../config/db');

module.exports = {
  name: 'keyboard-wedge',

  // Cek perangkat terdaftar di DB dan status terakhirnya
  async checkStatus() {
    const [rows] = await db.query(
      `SELECT id, device_type, name, connection_state, last_checked_at
       FROM devices
       WHERE device_type = 'scanner'
       ORDER BY id`
    );
    return rows;
  },

  // Lookup cepat: dipanggil frontend setiap kali scanner mengirim kode
  async findByCode(code) {
    const [rows] = await db.query(
      `SELECT id, code, name, unit, sell_price, stock, is_active
       FROM products
       WHERE code = ? LIMIT 1`,
      [code]
    );
    return rows[0] || null;
  }
};
