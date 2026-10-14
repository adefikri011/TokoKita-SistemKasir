import { API } from '../api.js';
import { formatRupiah } from '../utils/formatters.js';
import { escapeHtml, emptyRow } from '../utils/html.js';

export const initBarangPage = async () => {
  await loadCategoryOptions();
  loadProductsTable();

  document.getElementById('searchProductInput')
    ?.addEventListener('input', (e) => loadProductsTable(e.target.value));

  document.getElementById('productModalForm')
    ?.addEventListener('submit', handleSubmit);

  document.getElementById('btnAddProduct')
    ?.addEventListener('click', () => openProductModal());

  document.getElementById('btnCloseModal')
    ?.addEventListener('click', closeProductModal);

  document.getElementById('btnCancelModal')
    ?.addEventListener('click', closeProductModal);
};

async function loadCategoryOptions() {
  const select = document.getElementById('f-category');
  if (!select) return;

  try {
    const { data } = await API.getCategories();
    select.innerHTML = '<option value="">— Tanpa kategori —</option>' +
      data.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  } catch {
    select.innerHTML = '<option value="">— Gagal memuat kategori —</option>';
  }
}

async function loadProductsTable(search = '') {
  const tbody = document.getElementById('productTableBody');
  if (!tbody) return;

  try {
    const result = await API.getProducts(search);
    const products = result.data || [];

    if (!products.length) {
      tbody.innerHTML = emptyRow('Tidak ada data barang.', 7);
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td class="cell-code">${escapeHtml(p.code)}</td>
        <td class="cell-strong">${escapeHtml(p.name)}</td>
        <td class="cell-muted">${escapeHtml(p.unit || 'pcs')}</td>
        <td class="money-buy is-num" style="text-align:right">${formatRupiah(p.buy_price)}</td>
        <td class="money-sell is-num" style="text-align:right">${formatRupiah(p.sell_price)}</td>
        <td class="is-num" style="text-align:right">${Number(p.stock)}</td>
        <td class="cell-actions">
          <span class="table-actions">
            <button data-id="${p.id}" data-action="edit" class="link-action">Edit</button>
            <button data-id="${p.id}" data-action="delete" class="link-danger">Hapus</button>
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = emptyRow(`Gagal memuat data: ${err.message}`, 7);
  }
}

// ---- Aksi (event delegation, tanpa inline onclick) ----
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const { action, id } = btn.dataset;

  if (action === 'edit') openProductModal(Number(id));
  if (action === 'delete') await removeProduct(Number(id));
});

async function openProductModal(id = null) {
  const form = document.getElementById('productModalForm');
  const title = document.getElementById('productModalTitle');
  if (!form || !title) return;

  form.reset();
  form.dataset.editId = id || '';

  if (id) {
    const { data: product } = await API.getProductById(id);
    if (!product) return;
    title.textContent = 'Edit Barang';
    form.code.value = product.code;
    form.code.disabled = true;
    form.name.value = product.name;
    form.unit.value = product.unit || 'pcs';
    form.buy_price.value = product.buy_price;
    form.sell_price.value = product.sell_price;
    form.stock.value = product.stock;
    form.category_id.value = product.category_id || '';
  } else {
    title.textContent = 'Tambah Barang';
    form.code.disabled = false;
  }

  document.getElementById('productModal')?.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal')?.classList.add('hidden');
}

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const editId = form.dataset.editId;

  const payload = {
    code: form.code.value.trim(),
    name: form.name.value.trim(),
    unit: form.unit.value,
    buy_price: Number(form.buy_price.value),
    sell_price: Number(form.sell_price.value),
    stock: Number(form.stock.value),
    category_id: form.category_id.value ? Number(form.category_id.value) : null,
    image_url: null
  };

  try {
    if (editId) {
      await API.updateProduct(editId, payload);
    } else {
      await API.createProduct(payload);
    }
    window.closeProductModal();
    await loadProductsTable(document.getElementById('searchProductInput')?.value || '');
    window.showToast?.(editId ? 'Barang berhasil diperbarui' : 'Barang berhasil ditambahkan');
  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}

async function removeProduct(id) {
  if (!confirm('Yakin ingin menghapus barang ini?')) return;
  try {
    await API.deleteProduct(id);
    await loadProductsTable(document.getElementById('searchProductInput')?.value || '');
    window.showToast?.('Barang berhasil dihapus');
  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}
