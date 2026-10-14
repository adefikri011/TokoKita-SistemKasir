-- ============================================================
--  Migrasi 002 — Satuan Barang & Qty Desimal
--  Jalankan sekali:
--    mysql -u root -p tokoku_db < database/migrations/002_unit_qty.sql
-- ============================================================

USE tokoku_db;

-- Satuan jual: pcs, kg, pak, lusin, box, liter, dll.
ALTER TABLE products
  ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'pcs' AFTER name;

-- Stok harus mendukung pecahan (mis. 12.5 kg)
ALTER TABLE products
  MODIFY stock DECIMAL(12,3) NOT NULL DEFAULT 0;

-- Qty transaksi juga mendukung pecahan
ALTER TABLE transaction_items
  MODIFY qty DECIMAL(10,3) NOT NULL;

-- Index pencarian barcode di POS
CREATE INDEX idx_products_code ON products (code);
