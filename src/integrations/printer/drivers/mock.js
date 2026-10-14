// Driver "mock" — dipakai untuk pengujian & pengembangan
// tanpa perangkat fisik.

module.exports = {
  name: 'mock',

  async checkConnection() {
    return { ok: true, detail: 'Driver mock selalu siap (tanpa perangkat fisik)' };
  },

  async print(receipt) {
    console.log('[PRINTER:mock] Struk siap cetak:', receipt?.trx_code);
    return { ok: true, detail: 'Simulasi cetak berhasil' };
  }
};
