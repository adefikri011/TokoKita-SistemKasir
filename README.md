# TokoKita — Sistem Kasir

Aplikasi POS (Point of Sale) untuk toko kelontong. Dua peran utama:

- **Admin** — dashboard & statistik, kelola barang/stok/kategori, diskon & promo, cek perangkat scanner/printer, laporan laba (pendapatan vs modal), monitor transaksi.
- **Kasir** — cari & pindai barang, input jumlah, hitung total, pilih metode bayar, simpan/lunasi transaksi pending, riwayat, cetak struk.

## Stack

| Layer | Teknologi |
|---|---|
| Backend | Node.js 20, Express 5 (CommonJS), MySQL2 |
| Frontend | Vanilla ES Modules + Tailwind (CDN) |
| Database | MySQL 8 |

## Struktur Proyek

```
├── database/
│   ├── schema.sql              # Instalasi baru (drop & buat)
│   ├── migrations/             # Upgrade DB yang sudah ada
│   └── seed.js                 # Akun, kategori, barang, perangkat
├── src/                        # BACKEND
│   ├── app.js
│   ├── config/db.js
│   ├── routes/index.js         # Semua endpoint + validasi + role
│   ├── controllers/            # Request → service → response
│   ├── services/               # Logika bisnis (satu-satunya tempat SQL)
│   ├── middlewares/            # auth, validate, errorHandler
│   ├── integrations/           # Printer & scanner (siap swap driver)
│   │   ├── printer/            #   driver: browser, mock, (escpos…)
│   │   └── scanner/            #   keyboard-wedge
│   └── utils/                  # AppError, asyncHandler, jwt, response
└── public/                     # FRONTEND (static, ES Modules)
    ├── js/api.js               # Satu-satunya client API + Auth store
    ├── js/admin/               # dashboard, products, categories
    ├── js/kasir/               # POS, pending, riwayat
    ├── js/utils/               # layout, html, formatters, printer
    └── views/                  # login, partials, admin/*, kasir/*
```

## Menjalankan

### 1. Docker Compose (direkomendasikan)

```bash
cp .env.example .env
docker compose up -d db
docker compose exec -T db mysql -uroot -ppassword tokoku_db < database/schema.sql
docker compose up -d app
```

### 2. Manual

```bash
cp .env.example .env        # isi kredensial DB + JWT_SECRET
npm install

# Database baru:
mysql -u root -p < database/schema.sql
# atau database lama (tanpa menghapus data):
mysql -u root -p tokoku_db < database/migrations/001_phase1.sql

node database/seed.js
npm run dev
```

Buka `http://localhost:3000` → halaman login.

| Akun | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Kasir | `kasir` | `kasir123` |

## API

Semua endpoint diawali `/api`. Kecuali `POST /auth/login`, semua butuh header
`Authorization: Bearer <token>`.

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| POST | `/auth/login` | publik | Masuk, dapat token |
| GET | `/auth/me` | semua | Profil aktif |
| GET | `/categories` | semua | Daftar kategori |
| POST/PUT/DELETE | `/categories[/:id]` | admin | CRUD kategori |
| GET | `/products?search=` | semua | Cari barang |
| GET | `/products/scan?code=` | semua | Lookup cepat (scanner) |
| GET | `/products/:id` | semua | Detail barang |
| POST/PUT/DELETE | `/products[/:id]` | admin | CRUD barang |
| POST | `/transactions` | kasir/admin | Simpan transaksi |
| GET | `/transactions?status=` | kasir/admin | Riwayat / monitor |
| GET | `/transactions/pending` | kasir/admin | Daftar pending |
| PUT | `/transactions/:id/pay-pending` | kasir/admin | Lunasi pending |
| PUT | `/transactions/:id/cancel-pending` | kasir/admin | Batalkan (stok kembali) |
| GET | `/reports/sales?date\|month=&year=` | admin | Laporan laba rugi |
| GET | `/devices` | admin | Daftar perangkat |
| POST | `/devices/check` | admin | Uji koneksi printer & scanner |

### Catatan keamanan transaksi

`POST /transactions` menerima **hanya `product_id` + `qty`**. Harga jual, modal,
subtotal, dan total dihitung **oleh server** dari tabel `products`, dikunci dengan
`SELECT ... FOR UPDATE`, dan stok divalidasi. Manipulasi harga dari client
diabaikan.

## Menambah Driver Printer

1. Buat `src/integrations/printer/drivers/escpos.js` yang meng-`export`
   `{ name, checkConnection(), print(receipt) }`.
2. Daftarkan di `DRIVER_REGISTRY` (`src/integrations/printer/index.js`).
3. Set `PRINTER_DRIVER=escpos` di `.env`.

Struk sudah dirakit netral oleh `src/integrations/printer/receipt.js`,
jadi driver tinggal merender (HTML / ESC/POS / PDF).

## Roadmap

- [x] Fase 0 — Fondasi (struktur, schema, API client)
- [x] Fase 1 — Autentikasi role, validasi, harga dari DB, kategori, integrasi perangkat
- [x] Fase 2 — Satuan jual (pcs/kg/pak), POS kasir, pending, riwayat, cetak struk
- [ ] Fase 3 — Diskon & promo aktif di kasir, halaman perangkat, driver ESC/POS
