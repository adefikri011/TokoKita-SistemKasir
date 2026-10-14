import { API, Auth } from './api.js';

// Sudah login? Langsung ke halaman sesuai role
if (Auth.isLoggedIn) {
  location.replace(Auth.user?.role === 'admin'
    ? '/views/admin/index.html'
    : '/views/kasir/pos.html');
}

const form = document.getElementById('loginForm');
const errorEl = document.getElementById('loginError');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.style.display = 'none';

  const username = form.username.value.trim();
  const password = form.password.value;

  try {
    const result = await API.login(username, password);
    Auth.save(result.data);

    // Admin → dashboard. Kasir → POS (Fase 3).
    location.href = result.data.user.role === 'admin'
      ? '/views/admin/index.html'
      : '/views/kasir/pos.html';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
});
