import { API } from '../api.js';
import { formatRupiah, formatInputDate } from '../utils/formatters.js';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const initDashboardPage = () => {
  const today = new Date();
  const now = new Date();
  now.setFullYear(now.getFullYear() - 4); // rentang 4 tahun ke belakang

  buildMonthOptions();
  buildYearOptions(now.getFullYear(), today.getFullYear());

  document.getElementById('filterDate').value = formatInputDate();
  document.getElementById('filterMonth').value = today.getMonth() + 1;
  document.getElementById('filterYear').value = today.getFullYear();

  document.getElementById('reportMode')?.addEventListener('change', syncFilterUI);
  document.getElementById('btnApplyFilter')?.addEventListener('click', loadReport);

  syncFilterUI();
  loadReport();
};

function buildMonthOptions() {
  const select = document.getElementById('filterMonth');
  if (!select) return;
  select.innerHTML = MONTH_NAMES
    .map((name, i) => `<option value="${i + 1}">${name}</option>`)
    .join('');
}

function buildYearOptions(from, to) {
  const select = document.getElementById('filterYear');
  if (!select) return;

  let html = '';
  for (let y = to; y >= from; y--) html += `<option value="${y}">${y}</option>`;
  select.innerHTML = html;
}

function syncFilterUI() {
  const mode = document.getElementById('reportMode').value;

  document.getElementById('filterDateWrap').classList.toggle('hidden', mode !== 'date');
  document.getElementById('filterMonthWrap').classList.toggle('hidden', mode !== 'month');
  document.getElementById('filterYearWrap').classList.toggle('hidden', mode !== 'year');
}

function currentFilter() {
  const mode = document.getElementById('reportMode').value;

  if (mode === 'month') {
    return {
      month: Number(document.getElementById('filterMonth').value),
      year: Number(document.getElementById('filterYear').value)
    };
  }
  if (mode === 'year') {
    return { year: Number(document.getElementById('filterYear').value) };
  }
  return { date: document.getElementById('filterDate').value };
}

function describeFilter(mode, filter) {
  if (mode === 'date') {
    return filter.date
      ? `Laporan penjualan hari ${new Date(filter.date).toLocaleDateString('id-ID')}`
      : 'Menampilkan seluruh data transaksi lunas.';
  }
  if (mode === 'month') return `Laporan penjualan bulan ${MONTH_NAMES[filter.month - 1]} ${filter.year}`;
  if (mode === 'year') return `Laporan penjualan tahun ${filter.year}`;
  return 'Menampilkan seluruh data transaksi lunas.';
}

async function loadReport() {
  const mode = document.getElementById('reportMode').value;
  const filter = currentFilter();

  try {
    const result = await API.getSalesReport(filter);
    const report = result.data || {};

    document.getElementById('cardRevenue').innerText = formatRupiah(report.total_revenue);
    document.getElementById('cardCapital').innerText = formatRupiah(report.total_capital);
    document.getElementById('cardProfit').innerText = formatRupiah(report.profit);
    document.getElementById('cardTrxCount').innerText = report.total_transactions || 0;
    document.getElementById('reportRangeLabel').innerText = describeFilter(mode, filter);

    const revenue = Number(report.total_revenue || 0);
    const profit = Number(report.profit || 0);
    const transactions = Number(report.total_transactions || 0);
    const average = transactions ? revenue / transactions : 0;
    const margin = revenue ? (profit / revenue) * 100 : 0;
    document.getElementById('reportAverageTransaction').innerText = formatRupiah(average);
    document.getElementById('reportProfitMargin').innerText = `${margin.toFixed(1)}%`;
  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}
