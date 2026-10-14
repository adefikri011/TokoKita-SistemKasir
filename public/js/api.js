// ============================================================
//  Satu-satunya client API untuk seluruh frontend.
//  Selalu pakai path RELATIF (/api/...) supaya aman di
//  localhost, Docker, maupun saat di-deploy ke domain lain.
// ============================================================

const BASE = '/api';
const TOKEN_KEY = 'tokokita_token';
const USER_KEY = 'tokokita_user';

export const Auth = {
  get token() { return localStorage.getItem(TOKEN_KEY); },

  get user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  },

  save({ token, user }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  get isLoggedIn() { return Boolean(this.token); },

  // Paksa ke halaman login bila sesi habis
  redirectToLogin() {
    this.clear();
    if (!location.pathname.endsWith('/views/login.html')) {
      location.href = '/views/login.html';
    }
  }
};

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Auth.token) headers.Authorization = `Bearer ${Auth.token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...options });

  if (res.status === 401) {
    Auth.redirectToLogin();
    throw new Error('Sesi berakhir, silakan masuk kembali');
  }

  const result = await res.json().catch(() => ({
    success: false,
    message: 'Respons server tidak valid'
  }));

  if (!res.ok || !result.success) {
    throw new Error(result.message || `Request gagal (${res.status})`);
  }

  return result;
}

const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const str = search.toString();
  return str ? `?${str}` : '';
};

export const API = {
  // ---- Auth ----
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  me: () => request('/auth/me'),

  // ---- Kategori ----
  getCategories: (search = '') => request(`/categories${qs({ search })}`),
  getCategoryById: (id) => request(`/categories/${id}`),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // ---- Barang ----
  getProducts: (search = '') => request(`/products${qs({ search })}`),
  getProductById: (id) => request(`/products/${id}`),
  scanProduct: (code) => request(`/products/scan${qs({ code })}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // ---- Transaksi ----
  // Client hanya mengirim product_id + qty.
  // Harga jual & modal dihitung OLEH SERVER dari tabel products.
  createTransaction: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  getTransactions: (params = {}) => request(`/transactions${qs(params)}`),
  getTransactionById: (id) => request(`/transactions/${id}`),
  getPendingTransactions: () => request('/transactions/pending'),
  payPendingTransaction: (id, payment_method) =>
    request(`/transactions/${id}/pay-pending`, {
      method: 'PUT',
      body: JSON.stringify({ payment_method })
    }),
  cancelPendingTransaction: (id) =>
    request(`/transactions/${id}/cancel-pending`, { method: 'PUT' }),

  // ---- Laporan Laba Rugi (admin) ----
  // filter: { date:'YYYY-MM-DD' } | { month:1..12, year:2026 } | { year:2026 }
  getSalesReport: (filter = {}) => request(`/reports/sales${qs(filter)}`),

  // ---- Perangkat (admin) ----
  getDevices: () => request('/devices'),
  checkDevices: () => request('/devices/check', { method: 'POST' })
};
