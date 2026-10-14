-- ============================================================
--  TokoKita — Sistem Kasir
--  Skema Database & Data Awal
--  Jalankan:  mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS tokoku_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tokoku_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS transaction_items;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS discounts;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;


-- ------------------------------------------------------------
-- 1. Pengguna (Admin & Kasir)
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          ENUM('admin','kasir') NOT NULL DEFAULT 'kasir',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 2. Kategori Barang
-- ------------------------------------------------------------
CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 3. Barang
--     buy_price  = MODAL  (dipakai untuk hitung laba)
--     sell_price = HARGA JUAL
-- ------------------------------------------------------------
CREATE TABLE products (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(40)  NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  unit        VARCHAR(20)  NOT NULL DEFAULT 'pcs',
  buy_price   DECIMAL(12,2) NOT NULL DEFAULT 0,
  sell_price  DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock       DECIMAL(12,3) NOT NULL DEFAULT 0,
  category_id INT UNSIGNED NULL,
  image_url   VARCHAR(255) NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_products_name (name),
  INDEX idx_products_category (category_id)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 4. Transaksi (header)
--     total_capital dihitung server dari products.buy_price
-- ------------------------------------------------------------
CREATE TABLE transactions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  trx_code       VARCHAR(30) NOT NULL UNIQUE,
  customer_name  VARCHAR(100) NULL,
  total_amount   DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_capital  DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method ENUM('cash','qris','transfer','debit','ewallet') NULL,
  payment_status ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
  cashier_id     INT UNSIGNED NULL,
  cashier_name   VARCHAR(100) NOT NULL DEFAULT 'Kasir',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_cashier
    FOREIGN KEY (cashier_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_trx_status (payment_status),
  INDEX idx_trx_created (created_at)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 5. Item Transaksi
--     buy_price/sell_price = SNAPSHOT saat transaksi terjadi
--     (riwayat laba tetap akurat walaupun harga barang berubah)
-- ------------------------------------------------------------
CREATE TABLE transaction_items (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT UNSIGNED NOT NULL,
  product_id     INT UNSIGNED NOT NULL,
  qty            DECIMAL(10,3) NOT NULL,
  buy_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  sell_price     DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal       DECIMAL(14,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_items_transaction
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_items_transaction (transaction_id)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 6. Diskon & Promo
-- ------------------------------------------------------------
CREATE TABLE discounts (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(30) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  type          ENUM('percentage','nominal') NOT NULL DEFAULT 'percentage',
  value         DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_purchase  DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_date    DATE NULL,
  end_date      DATE NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 7. Perangkat (Scanner / Printer)
-- ------------------------------------------------------------
CREATE TABLE devices (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_type     ENUM('scanner','printer') NOT NULL,
  name            VARCHAR(100) NOT NULL,
  connection_state ENUM('connected','disconnected','unknown') NOT NULL DEFAULT 'unknown',
  last_checked_at TIMESTAMP NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_device (device_type, name)
) ENGINE=InnoDB;


-- ============================================================
--  DATA AWAL
-- ============================================================

INSERT INTO categories (name, description) VALUES
  ('Makanan',    'Produk makanan kemasan & segar'),
  ('Minuman',    'Produk minuman'),
  ('Kebersihan', 'Perlengkapan kebersihan'),
  ('Rumah Tangga','Kebutuhan rumah tangga');

INSERT INTO products (code, name, unit, buy_price, sell_price, stock, category_id) VALUES
  ('BRG-0001', 'Indomie Goreng',          'pcs', 2500,  3500, 120, 1),
  ('BRG-0002', 'Indomie Soto',            'pcs', 2400,  3500,  90, 1),
  ('BRG-0003', 'Aqua 600ml',              'pcs', 2000,  4000, 150, 2),
  ('BRG-0004', 'Teh Pucuk 350ml',         'pcs', 3000,  4500, 100, 2),
  ('BRG-0005', 'Sabun Lifebuoy 110g',     'pcs', 4200,  6000,  60, 3),
  ('BRG-0006', 'Rinso 77g',              'pcs',11000, 14500,  45, 3),
  ('BRG-0007', 'Minyak Goreng',          'liter',15000, 18500,  40, 4),
  ('BRG-0008', 'Gula Pasir',             'kg', 13500, 16500, 50.5, 4),
  ('BRG-0009', 'Beras Premium',          'kg',  12000, 14000, 120, 4),
  ('BRG-0010', 'Telur Ayam Negeri',      'kg',  26000, 29500, 35.25, 1);

INSERT INTO discounts (code, name, type, value, min_purchase, is_active) VALUES
  ('HEMAT10',   'Diskon 10%',        'percentage', 10.00,  50000, 1),
  ('ONGKIR5K',  'Potongan Rp5.000',  'nominal',     5000, 100000, 1);

INSERT INTO devices (device_type, name, connection_state) VALUES
  ('scanner', 'Scanner Barcode USB', 'unknown'),
  ('printer', 'Printer Struk Thermal 58mm', 'unknown');

-- Akun awal dibuat terpisah agar hash bcrypt digenerate dengan benar:
--   node database/seed.js
