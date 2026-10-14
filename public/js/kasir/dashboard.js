// ============================================================
//  Dashboard Kasir — HANYA tampilan.
//  Semua angka dihitung di client dari endpoint yang memang
//  boleh diakses kasir:  GET /api/transactions  &  /pending.
//  Tidak ada perubahan backend / logika bisnis.
// ============================================================
import { API } from '../api.js';
import { Auth } from '../api.js';
import { formatRupiah, formatDate } from '../utils/formatters.js';

const DAY = 86400000;
const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};

const empty = (title, desc, iconName = 'clock') => `
  <div class="empty-state" style="padding:28px 12px">
    <div class="empty-ico">${svgIcon(iconName)}</div>
    <div class="empty-title">${title}</div>
    <div class="empty-desc">${desc}</div>
  </div>`;

function svgIcon(name) {
  const paths = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>'
  };
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.clock}</svg>`;
}

const statusBadge = (status) => {
  const map = {
    completed: ['badge-success', 'Lunas'],
    pending: ['badge-warning', 'Pending'],
    cancelled: ['badge-danger', 'Dibatalkan']
  };
  const [cls, label] = map[status] || ['badge-muted', status];
  return `<span class="badge ${cls}">${label}</span>`;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export async function initDashboardPage() {
  const $ = (id) => document.getElementById(id);

  $('dashGreeting').textContent =
    `${greeting()}, ${Auth.user?.full_name || Auth.user?.username || 'Kasir'}`;

  $('btnDashRefresh')?.addEventListener('click', () => load());
  $('btnDashGoPos')?.addEventListener('click', () => { location.href = '/views/kasir/pos.html'; });

  document.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const to = btn.dataset.quick;
      location.href = to === 'pos' ? '/views/kasir/pos.html'
        : to === 'riwayat' ? '/views/kasir/riwayat.html'
        : '/views/kasir/pending.html';
    });
  });

  await load();
}

async function load() {
  const refreshBtn = document.getElementById('btnDashRefresh');
  if (refreshBtn) refreshBtn.disabled = true;

  try {
    // Dua request paralel — keduanya sudah diizinkan untuk role kasir.
    const [trxRes, pendingRes] = await Promise.all([
      API.getTransactions({ status: 'completed', limit: 200 }),
      API.getPendingTransactions().catch(() => ({ data: [] }))
    ]);

    const trx = Array.isArray(trxRes.data) ? trxRes.data : [];
    const pending = Array.isArray(pendingRes.data) ? pendingRes.data : [];

    renderStats(trx, pending);
    renderChart(trx);
    renderRecent(trx.slice(0, 10));
    renderPending(pending.slice(0, 6));

    const el = document.getElementById('dashUpdated');
    if (el) el.textContent = `diperbarui ${formatDate(new Date().toISOString()).split(', ')[1] || 'baru saja'}`;
  } catch (err) {
    window.showToast?.(err.message || 'Gagal memuat dashboard', 'error');
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

function renderStats(trx, pending) {
  const now = new Date();
  const today = trx.filter(t => isSameDay(t.created_at, now));

  const revenue = today.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  const items = today.reduce((sum, t) =>
    sum + (t.items || []).reduce((s, i) => s + Number(i.qty || 0), 0), 0);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('dashRevenue', formatRupiah(revenue));
  set('dashTrxCount', String(today.length));
  set('dashItemsSold', String(Math.round(items * 100) / 100));
  set('dashPending', String(pending.length));
  set('dashQuickPending', String(pending.length));

  const avg = today.length ? revenue / today.length : 0;
  set('dashTrxFoot', `Rata-rata ${formatRupiah(avg)} / transaksi`);

  const foot = document.getElementById('dashPendingFoot');
  if (foot) {
    foot.textContent = pending.length
      ? `${formatRupiah(pending.reduce((s, t) => s + Number(t.total_amount || 0), 0))} belum lunas`
      : 'Belum ada pending';
  }
}

function renderChart(trx) {
  const wrap = document.getElementById('dashChart');
  const totalEl = document.getElementById('dashWeekTotal');
  if (!wrap) return;

  const buckets = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.push({ date: d, total: 0 });
  }

  const index = new Map(buckets.map((b, i) => [dayKey(b.date), i]));
  trx.forEach(t => {
    const i = index.get(dayKey(t.created_at));
    if (i !== undefined) buckets[i].total += Number(t.total_amount || 0);
  });

  const max = Math.max(...buckets.map(b => b.total), 1);
  const weekTotal = buckets.reduce((s, b) => s + b.total, 0);
  if (totalEl) totalEl.textContent = formatRupiah(weekTotal);

  wrap.innerHTML = buckets.map((b, i) => {
    const h = Math.max(3, Math.round((b.total / max) * 100));
    const isToday = i === buckets.length - 1;
    const label = b.date.toLocaleDateString('id-ID', { weekday: 'short' });
    const tip = `${b.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — ${formatRupiah(b.total)}`;

    return `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:8px;min-width:0"
           title="${tip}">
        <span style="font-size:10.5px;font-weight:700;color:${b.total ? 'var(--c-text)' : 'var(--c-text-3)'};
                     font-variant-numeric:tabular-nums;white-space:nowrap">${b.total ? shortMoney(b.total) : '0'}</span>
        <div style="width:100%;height:${h}%;border-radius:8px 8px 4px 4px;
                    background:${isToday
                      ? 'linear-gradient(180deg,#3B82F6,#2563EB)'
                      : 'linear-gradient(180deg,#C7D8FF,#E4ECFF)'};
                    box-shadow:${isToday ? '0 6px 16px rgba(37,99,235,.32)' : 'none'};
                    transition:height .4s cubic-bezier(.2,.9,.3,1)"></div>
        <span style="font-size:11px;font-weight:${isToday ? 800 : 600};
                     color:${isToday ? 'var(--c-primary)' : 'var(--c-text-3)'}">${label}</span>
      </div>`;
  }).join('');
}

const shortMoney = (n) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}jt`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}rb`;
  return String(Math.round(n));
};

function renderRecent(rows) {
  const body = document.getElementById('dashRecentBody');
  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="6" style="padding:0">
      ${empty('Belum ada transaksi', 'Transaksi lunas akan tampil di sini.', 'receipt')}
    </td></tr>`;
    return;
  }

  body.innerHTML = rows.map(t => {
    const qty = (t.items || []).reduce((s, i) => s + Number(i.qty || 0), 0);
    return `
      <tr>
        <td class="cell-strong" style="font-variant-numeric:tabular-nums">${t.trx_code || '-'}</td>
        <td class="cell-muted">${formatDate(t.created_at)}</td>
        <td>${t.customer_name || 'Umum'}</td>
        <td class="is-num" style="text-align:right">${Math.round(qty * 100) / 100}</td>
        <td class="cell-strong is-num" style="text-align:right">${formatRupiah(t.total_amount)}</td>
        <td>${statusBadge(t.payment_status)}</td>
      </tr>`;
  }).join('');
}

function renderPending(rows) {
  const wrap = document.getElementById('dashPendingBody');
  if (!wrap) return;

  if (!rows.length) {
    wrap.innerHTML = empty('Tidak ada pending', 'Semua transaksi sudah lunas.');
    return;
  }

  wrap.innerHTML = rows.map(t => `
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;
                padding:11px 0;border-bottom:1px dashed var(--c-border)">
      <div style="min-width:0">
        <div style="font-size:13px;font-weight:700;font-variant-numeric:tabular-nums">${t.trx_code || '-'}</div>
        <div style="font-size:11.5px;color:var(--c-text-3)">${formatDate(t.created_at)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:800;font-variant-numeric:tabular-nums">${formatRupiah(t.total_amount)}</div>
        <span class="badge badge-warning" style="font-size:10.5px">Pending</span>
      </div>
    </div>`).join('') +
    `<div style="padding-top:12px">
       <a class="btn btn-soft btn-sm btn-block" href="/views/kasir/pending.html">Bayar sekarang</a>
     </div>`;
}
