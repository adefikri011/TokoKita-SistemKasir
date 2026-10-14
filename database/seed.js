#!/usr/bin/env node
// ============================================================
//  Seed data awal: akun, kategori, barang, perangkat
//  Jalankan:  node database/seed.js
//  Opsi env:  ADMIN_PASSWORD, KASIR_PASSWORD
// ============================================================

require('dotenv').config();

const db = require('../src/config/db');
const AuthService = require('../src/services/auth.service');

const ACCOUNTS = [
  {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    full_name: 'Administrator Toko',
    role: 'admin'
  },
  {
    username: process.env.KASIR_USERNAME || 'kasir',
    password: process.env.KASIR_PASSWORD || 'kasir123',
    full_name: 'Kasir Toko',
    role: 'kasir'
  }
];

const DEFAULT_CATEGORIES = [
  ['Makanan', 'Produk makanan kemasan & segar'],
  ['Minuman', 'Produk minuman'],
  ['Kebersihan', 'Perlengkapan kebersihan'],
  ['Rumah Tangga', 'Kebutuhan rumah tangga']
];

// [code, name, unit, buy_price, sell_price, stock, category_id]
const DEFAULT_PRODUCTS = [
  ['BRG-0001', 'Indomie Goreng',      'pcs',   2500,  3500, 120, 1],
  ['BRG-0002', 'Indomie Soto',        'pcs',   2400,  3500,  90, 1],
  ['BRG-0003', 'Aqua 600ml',          'pcs',   2000,  4000, 150, 2],
  ['BRG-0004', 'Teh Pucuk 350ml',     'pcs',   3000,  4500, 100, 2],
  ['BRG-0005', 'Sabun Lifebuoy 110g', 'pcs',   4200,  6000,  60, 3],
  ['BRG-0006', 'Rinso 77g',           'pak',  11000, 14500,  45, 3],
  ['BRG-0007', 'Minyak Goreng',       'liter',15000, 18500,  40, 4],
  ['BRG-0008', 'Gula Pasir',          'kg',   13500, 16500, 50.5, 4],
  ['BRG-0009', 'Beras Premium',       'kg',   12000, 14000, 120, 4],
  ['BRG-0010', 'Telur Ayam Negeri',   'kg',   26000, 29500, 35.25, 1]
];

const DEFAULT_DEVICES = [
  ['scanner', 'Scanner Barcode USB'],
  ['printer', 'Printer Struk Thermal 58mm']
];

async function seedCategories() {
  for (const [name, description] of DEFAULT_CATEGORIES) {
    const [rows] = await db.query('SELECT id FROM categories WHERE name = ?', [name]);
    if (rows.length) {
      console.log(`- Kategori "${name}" sudah ada`);
      continue;
    }
    await db.query('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description]);
    console.log(`✔ Kategori dibuat: ${name}`);
  }
}

async function seedProducts() {
  for (const [code, name, unit, buy, sell, stock, categoryId] of DEFAULT_PRODUCTS) {
    const [rows] = await db.query('SELECT id FROM products WHERE code = ?', [code]);
    if (rows.length) {
      console.log(`- Barang "${code}" sudah ada`);
      continue;
    }
    await db.query(
      `INSERT INTO products (code, name, unit, buy_price, sell_price, stock, category_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [code, name, unit, buy, sell, stock, categoryId]
    );
    console.log(`✔ Barang dibuat: ${name} (${unit})`);
  }
}

async function seedDevices() {
  for (const [type, name] of DEFAULT_DEVICES) {
    const [rows] = await db.query(
      'SELECT id FROM devices WHERE device_type = ? AND name = ?',
      [type, name]
    );
    if (rows.length) {
      console.log(`- Perangkat "${name}" sudah ada`);
      continue;
    }
    await db.query(
      'INSERT INTO devices (device_type, name, connection_state) VALUES (?, ?, "unknown")',
      [type, name]
    );
    console.log(`✔ Perangkat didaftarkan: ${name}`);
  }
}

(async () => {
  await seedCategories();
  await seedProducts();
  await seedDevices();

  for (const account of ACCOUNTS) {
    try {
      const created = await AuthService.createUser(account);
      console.log(`✔ Akun dibuat: ${created.username} (${created.role})`);
    } catch (err) {
      console.log(`- ${account.username}: ${err.message}`);
    }
  }

  process.exit(0);
})();
