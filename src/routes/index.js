const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const { validateBody, validateIdParam } = require('../middlewares/validate');

const authController = require('../controllers/auth.controller');
const categoryController = require('../controllers/category.controller');
const productController = require('../controllers/product.controller');
const transactionController = require('../controllers/transaction.controller');
const reportController = require('../controllers/report.controller');
const deviceController = require('../controllers/device.controller');

// ---------- AUTH (publik) ----------
router.post('/auth/login',
  validateBody({
    username: { type: 'string', required: true, min: 3, label: 'Username' },
    password: { type: 'string', required: true, min: 4, label: 'Password' }
  }),
  authController.login
);

router.get('/auth/me', requireAuth, authController.me);

// ---------- KATEGORI ----------
router.get('/categories', requireAuth, categoryController.list);
router.get('/categories/:id', requireAuth, validateIdParam(), categoryController.getById);
router.post('/categories',
  requireAuth, requireRole('admin'),
  validateBody({
    name: { type: 'string', required: true, min: 2, max: 80, label: 'Nama kategori' },
    description: { type: 'string', max: 255, label: 'Deskripsi', default: null }
  }),
  categoryController.create
);
router.put('/categories/:id',
  requireAuth, requireRole('admin'), validateIdParam(),
  validateBody({
    name: { type: 'string', required: true, min: 2, max: 80, label: 'Nama kategori' },
    description: { type: 'string', max: 255, label: 'Deskripsi', default: null }
  }),
  categoryController.update
);
router.delete('/categories/:id',
  requireAuth, requireRole('admin'), validateIdParam(),
  categoryController.remove
);

// ---------- BARANG ----------
router.get('/products', requireAuth, productController.list);
router.get('/products/scan', requireAuth, deviceController.findByCode);
router.get('/products/:id', requireAuth, validateIdParam(), productController.getById);
router.post('/products',
  requireAuth, requireRole('admin'),
  validateBody({
    code: { type: 'string', required: true, min: 2, max: 40, label: 'Kode barang' },
    name: { type: 'string', required: true, min: 2, max: 120, label: 'Nama barang' },
    unit: { type: 'string', required: true, min: 1, max: 20, label: 'Satuan', default: 'pcs' },
    buy_price: { type: 'number', required: true, min: 0, label: 'Harga beli' },
    sell_price: { type: 'number', required: true, min: 0, label: 'Harga jual' },
    stock: { type: 'number', required: true, min: 0, label: 'Stok', default: 0, precision: 3 },
    category_id: { type: 'number', min: 0, label: 'Kategori', default: null },
    image_url: { type: 'string', label: 'URL gambar', default: null }
  }),
  productController.create
);
router.put('/products/:id',
  requireAuth, requireRole('admin'), validateIdParam(),
  validateBody({
    code: { type: 'string', max: 40, label: 'Kode barang' },
    name: { type: 'string', required: true, min: 2, max: 120, label: 'Nama barang' },
    unit: { type: 'string', required: true, min: 1, max: 20, label: 'Satuan', default: 'pcs' },
    buy_price: { type: 'number', required: true, min: 0, label: 'Harga beli' },
    sell_price: { type: 'number', required: true, min: 0, label: 'Harga jual' },
    stock: { type: 'number', required: true, min: 0, label: 'Stok', precision: 3 },
    category_id: { type: 'number', min: 0, label: 'Kategori', default: null },
    image_url: { type: 'string', label: 'URL gambar', default: null }
  }),
  productController.update
);
router.delete('/products/:id',
  requireAuth, requireRole('admin'), validateIdParam(),
  productController.remove
);

// ---------- TRANSAKSI (Kasir & Admin) ----------
const cashierOrAdmin = requireRole('kasir', 'admin');

router.get('/transactions', requireAuth, cashierOrAdmin, transactionController.list);
router.get('/transactions/pending', requireAuth, cashierOrAdmin, transactionController.listPending);
router.get('/transactions/:id', requireAuth, cashierOrAdmin, validateIdParam(), transactionController.getById);

router.post('/transactions',
  requireAuth, cashierOrAdmin,
  // `items` sengaja TIDAK divalidasi di sini — strukturnya diverifikasi
  // langsung di TransactionService (cek product_id & qty per baris).
  validateBody({
    payment_method: { type: 'enum', required: true, values: ['cash', 'qris', 'transfer', 'debit', 'ewallet'], label: 'Metode pembayaran' },
    payment_status: { type: 'enum', values: ['pending', 'completed'], default: 'completed', label: 'Status pembayaran' },
    customer_name: { type: 'string', max: 100, label: 'Nama pelanggan', default: null },
    discount_amount: { type: 'number', min: 0, default: 0, label: 'Diskon' }
  }),
  transactionController.create
);

router.put('/transactions/:id/pay-pending',
  requireAuth, cashierOrAdmin, validateIdParam(),
  validateBody({
    payment_method: { type: 'enum', required: true, values: ['cash', 'qris', 'transfer', 'debit', 'ewallet'], label: 'Metode pembayaran' }
  }),
  transactionController.payPending
);

router.put('/transactions/:id/cancel-pending',
  requireAuth, cashierOrAdmin, validateIdParam(),
  transactionController.cancelPending
);

// ---------- LAPORAN (khusus Admin) ----------
router.get('/reports/sales',
  requireAuth, requireRole('admin'),
  reportController.sales
);

// ---------- PERANGKAT (khusus Admin) ----------
router.get('/devices', requireAuth, requireRole('admin'), deviceController.list);
router.post('/devices/check', requireAuth, requireRole('admin'), deviceController.check);

module.exports = router;
