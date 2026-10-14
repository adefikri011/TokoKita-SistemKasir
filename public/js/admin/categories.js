import { API } from '../api.js';
import { escapeHtml, emptyRow } from '../utils/html.js';

export const initKategoriPage = () => {
  loadTable();

  document.getElementById('searchCategoryInput')
    ?.addEventListener('input', (e) => loadTable(e.target.value));

  document.getElementById('categoryModalForm')
    ?.addEventListener('submit', handleSubmit);

  document.getElementById('btnAddCategory')
    ?.addEventListener('click', () => openModal());

  document.getElementById('btnCloseCategoryModal')
    ?.addEventListener('click', closeModal);

  document.getElementById('btnCancelCategoryModal')
    ?.addEventListener('click', closeModal);
};

async function loadTable(search = '') {
  const tbody = document.getElementById('categoryTableBody');
  if (!tbody) return;

  try {
    const result = await API.getCategories(search);
    const categories = result.data || [];

    if (!categories.length) {
      tbody.innerHTML = emptyRow('Tidak ada kategori.', 4);
      return;
    }

    tbody.innerHTML = categories.map(c => `
      <tr>
        <td class="cell-strong">${escapeHtml(c.name)}</td>
        <td class="cell-muted">${escapeHtml(c.description || '-')}</td>
        <td class="is-num" style="text-align:right">${Number(c.product_count || 0)}</td>
        <td class="cell-actions">
          <span class="table-actions">
            <button data-action="edit" data-id="${c.id}" class="link-action">Edit</button>
            <button data-action="delete" data-id="${c.id}" class="link-danger">Hapus</button>
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = emptyRow(`Gagal memuat data: ${err.message}`, 4);
  }
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn || !btn.closest('#categoryTableBody')) return;

  const { action, id } = btn.dataset;
  if (action === 'edit') await openModal(Number(id));
  if (action === 'delete') await removeCategory(Number(id));
});

async function openModal(id = null) {
  const form = document.getElementById('categoryModalForm');
  const title = document.getElementById('categoryModalTitle');
  if (!form || !title) return;

  form.reset();
  form.dataset.editId = id || '';

  if (id) {
    const { data } = await API.getCategoryById(id);
    title.textContent = 'Edit Kategori';
    form.name.value = data.name;
    form.description.value = data.description || '';
  } else {
    title.textContent = 'Tambah Kategori';
  }

  document.getElementById('categoryModal')?.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('categoryModal')?.classList.add('hidden');
}

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const editId = form.dataset.editId;

  const payload = {
    name: form.name.value.trim(),
    description: form.description.value.trim() || null
  };

  try {
    if (editId) await API.updateCategory(editId, payload);
    else await API.createCategory(payload);

    closeModal();
    await loadTable(document.getElementById('searchCategoryInput')?.value || '');
    window.showToast?.(editId ? 'Kategori diperbarui' : 'Kategori ditambahkan');
  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}

async function removeCategory(id) {
  if (!confirm('Yakin ingin menghapus kategori ini?')) return;
  try {
    await API.deleteCategory(id);
    await loadTable(document.getElementById('searchCategoryInput')?.value || '');
    window.showToast?.('Kategori dihapus');
  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}
