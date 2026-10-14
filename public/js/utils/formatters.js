// Format angka ke format mata uang Rupiah (contoh: Rp 2.450.000)
export const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

// Format tanggal ke tampilan lokal Indonesia
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

// Format tanggal khusus input HTML date (YYYY-MM-DD)
export const formatInputDate = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};