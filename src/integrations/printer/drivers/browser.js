// Driver "browser": mencetak lewat tab baru milik pengguna
// (window.print). Berguna untuk printer thermal yang terdeteksi
// sebagai printer sistem operasi.

module.exports = {
  name: 'browser',

  async checkConnection() {
    return {
      ok: true,
      detail: 'Mencetak melalui dialog cetak browser (butuh izin popup)'
    };
  },

  async print(receipt) {
    return {
      ok: true,
      detail: 'Job struk dikirim ke browser',
      payload: receipt
    };
  }
};
