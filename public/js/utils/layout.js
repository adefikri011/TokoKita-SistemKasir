import { loadComponent } from './componentLoader.js';
import { Auth } from '../api.js';
import './toast.js';

const SIDEBAR_COLLAPSED_KEY = 'tokokita.sidebar.collapsed';

// Cegah akses halaman tanpa sesi / dengan role yang salah
export const guardRole = (...roles) => {
  if (!Auth.isLoggedIn) {
    location.replace('/views/login.html');
    return false;
  }
  if (roles.length && !roles.includes(Auth.user?.role)) {
    location.replace(Auth.user?.role === 'admin'
      ? '/views/admin/index.html'
      : '/views/kasir/pos.html');
    return false;
  }
  return true;
};

const initials = (name = '?') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const initSidebar = () => {
  const current = window.location.pathname;

  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('is-active', link.dataset.nav === current);
  });

  document.querySelectorAll('[data-soon]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.showToast?.(`Menu "${link.dataset.soon}" belum tersedia`, 'error');
    });
  });

  // Tombol keluar
  const badgeEl = document.getElementById('sidebarRoleBadge');
  if (badgeEl && Auth.user) badgeEl.textContent = Auth.user.role === 'admin' ? 'Admin' : 'Kasir';

  document.getElementById('btnLogout')?.addEventListener('click', () => {
    Auth.clear();
    location.href = '/views/login.html';
  });

  // Toggle mini (desktop) — opsional, hanya jika ada tombolnya
  document.getElementById('btnSidebarMini')?.addEventListener('click', () => {
    const collapsed = !document.body.classList.contains('sidebar-mini');
    document.body.classList.toggle('sidebar-mini', collapsed);
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  });
};

// --- Header global (opsional: hanya untuk shell yang punya #layout-header) ---
const initHeader = ({ title = 'TokoKita', subtitle = '' } = {}) => {
  const titleEl = document.getElementById('headerPageTitle');
  const subEl = document.getElementById('headerPageSub');

  if (titleEl) titleEl.textContent = title;
  if (subEl) {
    const d = new Date();
    const tanggal = d.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    subEl.textContent = subtitle || tanggal;
  }

  const user = Auth.user;
  const nameEl = document.getElementById('headerUserName');
  const avatarEl = document.getElementById('headerUserAvatar');
  if (nameEl && user) nameEl.textContent = user.full_name || user.username;
  if (avatarEl && user) avatarEl.textContent = initials(user.full_name || user.username);

  // Jam
  const clock = document.getElementById('headerClock');
  if (clock) {
    const tick = () => {
      clock.textContent = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    };
    tick();
    clearInterval(window.__tkClock);
    window.__tkClock = setInterval(tick, 1000);
  }

  // Dropdown pengguna
  const btnMenu = document.getElementById('btnUserMenu');
  const dropdown = document.getElementById('userDropdown');
  btnMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !dropdown.hidden;
    dropdown.hidden = open;
    btnMenu.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.hidden && !dropdown.contains(e.target) && e.target !== btnMenu) {
      dropdown.hidden = true;
      btnMenu?.setAttribute('aria-expanded', 'false');
    }
  });

  // Item "segera" di dropdown header (sidebar sudah terikat di initSidebar)
  document.querySelectorAll('#layout-header [data-soon]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.showToast?.(`Menu "${link.dataset.soon}" belum tersedia`, 'error');
    });
  });

  // Keluar dari header (sidebar juga sudah punya tombol sendiri)
  document.getElementById('btnLogoutHeader')?.addEventListener('click', () => {
    Auth.clear();
    location.href = '/views/login.html';
  });

  // Desktop memakai sidebar mini; mobile memakai drawer.
  const toggleSidebar = document.getElementById('btnToggleSidebar');
  const sidebar = document.querySelector('.sidebar');
  const setSidebarState = (open) => {
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    if (isMobile) {
      document.body.classList.toggle('sidebar-open', open);
      document.body.classList.remove('sidebar-mini');
      document.documentElement.classList.remove('sidebar-collapsed');
    } else {
      document.body.classList.toggle('sidebar-mini', !open);
      document.body.classList.remove('sidebar-open');
      document.documentElement.classList.toggle('sidebar-collapsed', !open);
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!open));
    }
    toggleSidebar?.setAttribute('aria-expanded', String(open));
    toggleSidebar?.setAttribute('aria-label', open ? 'Ciutkan sidebar' : 'Perluas sidebar');
    toggleSidebar?.classList.toggle('is-close', isMobile && open);
  };

  toggleSidebar?.addEventListener('click', () => {
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const open = isMobile
      ? !document.body.classList.contains('sidebar-open')
      : document.body.classList.contains('sidebar-mini');
    setSidebarState(open);
  });

  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('sidebar-open')) return;
    if (sidebar?.contains(e.target) || toggleSidebar?.contains(e.target)) return;
    setSidebarState(false);
  });

  window.matchMedia('(max-width: 900px)').addEventListener?.('change', () => {
    setSidebarState(false);
  });

  document.querySelectorAll('.sidebar-link').forEach(a => {
    a.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 900px)').matches) setSidebarState(false);
    });
  });

  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  const wasCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  setSidebarState(isMobile ? false : !wasCollapsed);
};

export const renderPage = async ({ title, sidebar = 'admin', contentPath, header, onReady }) => {
  if (title) document.title = `${title} - TokoKita`;

  const sidebarPath = sidebar === 'kasir'
    ? '/views/partials/sidebar-kasir.html'
    : '/views/partials/sidebar-admin.html';

  await loadComponent('layout-sidebar', sidebarPath);

  // Bottom-nav mobile: hanya jika shell menyediakan wadahnya (halaman kasir)
  if (document.getElementById('layout-bottomnav')) {
    await loadComponent('layout-bottomnav', '/views/partials/bottom-nav-kasir.html');
  }

  initSidebar();

  // Header global: hanya jika shell halaman menyediakan wadahnya.
  // Halaman admin lama tidak punya #layout-header → perilaku lama utuh.
  if (document.getElementById('layout-header')) {
    await loadComponent('layout-header', '/views/partials/header.html');
    initHeader({ title, subtitle: typeof header === 'string' ? header : header?.subtitle });
  }

  if (contentPath) await loadComponent('layout-content', contentPath);

  if (typeof onReady === 'function') await onReady();
};
