import { API } from '../api.js';
import { formatRupiah } from '../utils/formatters.js';
import { escapeHtml } from '../utils/html.js';
import { printReceipt } from '../utils/printer.js';

// Satuan yang mendukung pecahan (qty bisa 0.5 dst.)
const DECIMAL_UNITS = ['kg', 'gram', 'liter'];
const DECIMAL_STEP = 0.001;

// cart: Map<productId, { product, qty }>
const cart = new Map();

let lastReceipt = null;
let searchTimer = null;

export const initPosPage = () => {
  loadProducts();

  const scanInput = document.getElementById('posScanInput');
  scanInput?.focus();

  // Deteksi scanner (keyboard-wedge): kirim kode + Enter
  scanInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(scanInput.value.trim());
    }
  });

  // Pencarian langsung saat mengetik
  scanInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadProducts(scanInput.value.trim()), 220);
  });

  document.getElementById('posClearCart')
    ?.addEventListener('click', () => {
      if (!cart.size || confirm('Kosongkan keranjang?')) {
        cart.clear();
        renderCart();
      }
    });

  document.getElementById('posPayNow')
    ?.addEventListener('click', () => checkout('completed'));

  document.getElementById('posSavePending')
    ?.addEventListener('click', () => checkout('pending'));

  document.getElementById('posResultClose')
    ?.addEventListener('click', closeResultModal);

  document.getElementById('posResultPrint')
    ?.addEventListener('click', () => {
      if (lastReceipt) printReceipt(lastReceipt);
    });

  // Delegasi aksi di daftar barang & keranjang
  document.addEventListener('click', (e) => {
    const productBtn = e.target.closest('[data-add-product]');
    if (productBtn) {
      addToCart({
        id: Number(productBtn.dataset.id),
        code: productBtn.dataset.code,
        name: productBtn.dataset.name,
        unit: productBtn.dataset.unit,
        sell_price: Number(productBtn.dataset.price),
        stock: Number(productBtn.dataset.stock)
      });
      return;
    }

    const cartBtn = e.target.closest('[data-cart-action]');
    if (cartBtn) handleCartAction(cartBtn.dataset.cartAction, Number(cartBtn.dataset.id));
  });

  // Ubah qty langsung lewat input
  document.addEventListener('change', (e) => {
    if (!e.target.matches('[data-qty-input]')) return;
    setQty(Number(e.target.dataset.id), e.target.value);
  });
};

// ---------- Daftar barang ----------
async function loadProducts(search = '') {
  const container = document.getElementById('posProductList');
  if (!container) return;

  try {
    const { data: products } = await API.getProducts(search);

    if (!products.length) {
      container.innerHTML = '<p style="color:#64748b;text-align:center;padding:32px 0">Barang tidak ditemukan.</p>';
      return;
    }

    container.innerHTML = products.map(p => {
      const stock = Number(p.stock);
      const unit = p.unit || 'pcs';
      const disabled = !Number(p.is_active) || stock <= 0;

      return `
        <button class="pos-product-card" ${disabled ? 'disabled' : ''}
          data-add-product
          data-id="${p.id}"
          data-code="${escapeHtml(p.code)}"
          data-name="${escapeHtml(p.name)}"
          data-unit="${escapeHtml(unit)}"
          data-price="${Number(p.sell_price)}"
          data-stock="${stock}">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="price">${formatRupiah(p.sell_price)}<span style="color:#64748b">/${escapeHtml(unit)}</span></div>
          <div class="meta">${escapeHtml(p.code)} · Stok ${stock} ${escapeHtml(unit)}</div>
        </button>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:#f87171;text-align:center;padding:32px 0">${escapeHtml(err.message)}</p>`;
  }
}

// ---------- Pindai barcode ----------
async function handleScan(rawValue) {
  if (!rawValue) return;

  const input = document.getElementById('posScanInput');

  try {
    // 1. Coba cocokkan sebagai kode barcode
    const { data: product } = await API.scanProduct(rawValue);

    if (product && Number(product.is_active)) {
      addByProductId(product.id, product);
      if (input) { input.value = ''; input.focus(); }
      loadProducts('');
      return;
    }

    // 2. Kalau bukan kode, jadikan kata kunci pencarian
    await loadProducts(rawValue);
    if (input) input.focus();
  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}

async function addByProductId(id, cached) {
  if (cart.has(id)) {
    changeQty(id, 1);
    return;
  }

  const product = cached || (await API.getProductById(id)).data;
  addToCart(product);
}

// ---------- Keranjang ----------
function addToCart(product) {
  const stock = Number(product.stock);
  const unit = product.unit || 'pcs';

  if (stock <= 0) {
    window.showToast?.(`Stok "${product.name}" habis`, 'error');
    return;
  }

  if (cart.has(product.id)) {
    changeQty(product.id, 1);
    return;
  }

  cart.set(product.id, {
    product: {
      id: product.id,
      code: product.code,
      name: product.name,
      unit,
      sell_price: Number(product.sell_price),
      stock
    },
    qty: 1
  });

  renderCart();
}

function stepFor(unit) {
  return DECIMAL_UNITS.includes(unit) ? DECIMAL_STEP : 1;
}

function changeQty(id, delta) {
  const line = cart.get(id);
  if (!line) return;

  const step = stepFor(line.product.unit);
  const next = Math.round((line.qty + delta) * 1000) / 1000;

  if (next <= 0) {
    cart.delete(id);
  } else if (next > line.product.stock) {
    window.showToast?.(
      `Stok "${line.product.name}" tersisa ${line.product.stock} ${line.product.unit}`,
      'error'
    );
    return;
  } else {
    line.qty = next;
  }

  renderCart();
}

function setQty(id, rawValue) {
  const line = cart.get(id);
  if (!line) return;

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value <= 0) {
    cart.delete(id);
    renderCart();
    return;
  }

  if (value > line.product.stock) {
    window.showToast?.(
      `Stok "${line.product.name}" tersisa ${line.product.stock} ${line.product.unit}`,
      'error'
    );
    renderCart();
    return;
  }

  line.qty = Math.round(value * 1000) / 1000;
  renderCart();
}

function handleCartAction(action, id) {
  if (action === 'inc') changeQty(id, 1);
  if (action === 'dec') changeQty(id, -1);
  if (action === 'remove') {
    cart.delete(id);
    renderCart();
  }
}

function cartTotals() {
  let count = 0;
  let total = 0;

  cart.forEach(({ product, qty }) => {
    count += 1;
    total += product.sell_price * qty;
  });

  return { count, total: Math.round(total * 100) / 100 };
}

function renderCart() {
  const container = document.getElementById('posCartItems');
  if (!container) return;

  if (!cart.size) {
    container.innerHTML = '<p style="color:#64748b;text-align:center;padding:32px 8px">Keranjang masih kosong</p>';
  } else {
    container.innerHTML = [...cart.values()].map(({ product, qty }) => `
      <div class="pos-cart-line">
        <div>
          <div class="line-name">${escapeHtml(product.name)}</div>
          <div class="line-sub">${formatRupiah(product.sell_price)}/${escapeHtml(product.unit)}</div>
        </div>
        <div class="line-total">${formatRupiah(product.sell_price * qty)}</div>
        <div class="pos-qty-controls">
          <button class="pos-qty-btn" data-cart-action="dec" data-id="${product.id}">−</button>
          <input class="pos-qty-input" type="number" min="${stepFor(product.unit)}"
            step="${stepFor(product.unit)}" value="${qty}" data-qty-input data-id="${product.id}">
          <span style="font-size:12px;color:#94a3b8">${escapeHtml(product.unit)}</span>
          <button class="pos-qty-btn" data-cart-action="inc" data-id="${product.id}">+</button>
          <button class="pos-remove-btn" data-cart-action="remove" data-id="${product.id}">Hapus</button>
        </div>
      </div>
    `).join('');
  }

  const { count, total } = cartTotals();
  document.getElementById('posItemCount').textContent = count;
  document.getElementById('posTotal').textContent = formatRupiah(total);
}

// ---------- Checkout ----------
async function checkout(paymentStatus) {
  if (!cart.size) {
    window.showToast?.('Keranjang masih kosong', 'error');
    return;
  }

  const paymentMethod = document.getElementById('posPayment').value;
  const customerName = document.getElementById('posCustomer').value.trim() || null;

  const payload = {
    items: [...cart.values()].map(({ product, qty }) => ({
      product_id: product.id,
      qty
    })),
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    customer_name: customerName
  };

  try {
    const { data } = await API.createTransaction(payload);

    lastReceipt = {
      ...data,
      customer_name: customerName,
      cashier_name: data.cashier_name || null,
      created_at: data.created_at || new Date().toISOString()
    };

    cart.clear();
    renderCart();
    openResultModal(data, paymentStatus);
    loadProducts('');
  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}

function openResultModal(transaction, paymentStatus) {
  document.getElementById('posResultIcon').textContent = paymentStatus === 'pending' ? '◷' : '✓';
  document.getElementById('posResultTitle').textContent =
    paymentStatus === 'pending' ? 'Transaksi Pending Disimpan' : 'Transaksi Berhasil';
  document.getElementById('posResultCode').textContent = transaction.trx_code;
  document.getElementById('posResultTotal').textContent = formatRupiah(transaction.total_amount);
  document.getElementById('posResultMethod').textContent =
    String(transaction.payment_method || '-').toUpperCase();

  document.getElementById('posResultPrint')?.classList.toggle('hidden', paymentStatus === 'pending');
  document.getElementById('posResultModal')?.classList.remove('hidden');
}

function closeResultModal() {
  document.getElementById('posResultModal')?.classList.add('hidden');
  document.getElementById('posScanInput')?.focus();
}
