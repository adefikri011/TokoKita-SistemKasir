// ============================================================
//  Printer — Driver Abstraction
//
//  Semua driver WAJIB mengimplementasikan interface:
//    - name            : string
//    - checkConnection : async () => { ok: boolean, detail: string }
//    - print           : async (receipt) => { ok: boolean, detail: string }
//
//  Menambah driver baru (misal Epson ESC/POS via serial/USB):
//    1. buat  src/integrations/printer/drivers/escpos.js
//    2. daftarkan di DRIVER_REGISTRY di bawah
//    3. set env PRINTER_DRIVER=escpos
//  Tidak perlu mengubah kode transaksi sama sekali.
// ============================================================

const browserDriver = require('./drivers/browser');
const mockDriver = require('./drivers/mock');

const DRIVER_REGISTRY = {
  browser: browserDriver,
  mock: mockDriver
  // 'escpos': require('./drivers/escpos'),   // contoh penambahan nanti
};

const resolveDriver = () => {
  const wanted = process.env.PRINTER_DRIVER || 'browser';
  return DRIVER_REGISTRY[wanted] || DRIVER_REGISTRY.browser;
};

const getPrinter = () => resolveDriver();

module.exports = { getPrinter, DRIVER_REGISTRY };
