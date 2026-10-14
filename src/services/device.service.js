const db = require('../config/db');
const { getPrinter } = require('../integrations/printer');
const scanner = require('../integrations/scanner');

class DeviceService {
  static async findAll() {
    const [rows] = await db.query(
      `SELECT id, device_type, name, connection_state, last_checked_at
       FROM devices ORDER BY device_type, id`
    );
    return rows;
  }

  // Uji koneksi seluruh perangkat & simpan hasilnya ke DB
  static async runCheck() {
    const results = [];

    // --- Printer ---
    const printer = getPrinter();
    const printerCheck = await printer.checkConnection();
    await this.record('printer', printer.name, printerCheck);
    results.push({ device_type: 'printer', driver: printer.name, ...printerCheck });

    // --- Scanner ---
    const scannerDevices = await scanner.checkStatus();
    if (!scannerDevices.length) {
      results.push({
        device_type: 'scanner',
        driver: scanner.name,
        ok: false,
        detail: 'Scanner belum terdaftar di sistem'
      });
    } else {
      for (const device of scannerDevices) {
        const ok = true; // keyboard-wedge selalu "tersedia" selama browser hidup
        const detail = 'Terhubung sebagai input keyboard (pastikan fokus di kolom pindai)';
        await this.markState(device.id, ok ? 'connected' : 'disconnected');
        results.push({ device_id: device.id, device_type: 'scanner', name: device.name, ok, detail });
      }
    }

    return results;
  }

  static async findByCode(code) {
    return scanner.findByCode(code);
  }

  static async record(deviceType, name, check) {
    const state = check.ok ? 'connected' : 'disconnected';

    const [rows] = await db.query(
      'SELECT id FROM devices WHERE device_type = ? AND name = ?',
      [deviceType, name]
    );

    if (rows.length) {
      await this.markState(rows[0].id, state);
      return rows[0].id;
    }

    const [result] = await db.query(
      `INSERT INTO devices (device_type, name, connection_state, last_checked_at)
       VALUES (?, ?, ?, NOW())`,
      [deviceType, name, state]
    );
    return result.insertId;
  }

  static async markState(id, state) {
    await db.query(
      'UPDATE devices SET connection_state = ?, last_checked_at = NOW() WHERE id = ?',
      [state, id]
    );
  }
}

module.exports = DeviceService;
