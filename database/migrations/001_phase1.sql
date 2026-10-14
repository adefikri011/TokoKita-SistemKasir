-- ============================================================
--  Migrasi 001 — Fase 1: Auth, Perangkat, Lengkapi Kolom
--  Jalankan:  mysql -u root -p tokoku_db < database/migrations/001_phase1.sql
--  Aman untuk database yang sudah berisi data.
-- ============================================================

USE tokoku_db;

-- ------------------------------------------------------------
-- 1. Tabel Pengguna (belum ada)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
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
-- 1b. categories — lengkapi kolom
-- ------------------------------------------------------------
ALTER TABLE categories
  ADD COLUMN description VARCHAR(255) NULL AFTER name;

ALTER TABLE categories
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER description;


-- ------------------------------------------------------------
-- 2. Tabel Perangkat (Scanner / Printer)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_type      ENUM('scanner','printer') NOT NULL,
  name             VARCHAR(100) NOT NULL,
  connection_state ENUM('connected','disconnected','unknown') NOT NULL DEFAULT 'unknown',
  last_checked_at  TIMESTAMP NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_device (device_type, name)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 3. products — tambah kolom status & timestamp
-- ------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER category_id;

ALTER TABLE products
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE products
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER image_url;

ALTER TABLE products MODIFY stock INT NOT NULL DEFAULT 0;


-- ------------------------------------------------------------
-- 4. transactions — tambah kolom diskon & kasir
-- ------------------------------------------------------------
ALTER TABLE transactions
  ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total_capital,
  ADD COLUMN cashier_id INT UNSIGNED NULL AFTER payment_status,
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE transactions
  MODIFY payment_method ENUM('cash','qris','transfer','debit','ewallet') NULL;

ALTER TABLE transactions
  MODIFY payment_status ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'completed';


-- ------------------------------------------------------------
-- 5. transaction_items — qty harus bilangan bulat
-- ------------------------------------------------------------
ALTER TABLE transaction_items MODIFY qty INT NOT NULL;


-- ------------------------------------------------------------
-- 6. discounts (Diskon & Promo) — lengkapi kolom
-- ------------------------------------------------------------
ALTER TABLE discounts
  ADD COLUMN code VARCHAR(30) NULL AFTER id,
  ADD COLUMN min_purchase DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER value,
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER end_date,
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER is_active;

UPDATE discounts SET code = CONCAT('PRM-', LPAD(id, 4, '0')) WHERE code IS NULL;
ALTER TABLE discounts MODIFY code VARCHAR(30) NOT NULL;
ALTER TABLE discounts ADD UNIQUE KEY uq_discount_code (code);


-- ------------------------------------------------------------
-- 7. Index penting
-- ------------------------------------------------------------
CREATE INDEX idx_trx_status ON transactions (payment_status);
CREATE INDEX idx_trx_created ON transactions (created_at);
CREATE INDEX idx_products_name ON products (name);
