# Product Requirements Document (PRD)

# Waru.NK POS
### Modern Point of Sale Management System

Version: 1.0.0

---

# 1. Project Overview

## Deskripsi

Waru.NK POS merupakan aplikasi Point of Sale (POS) berbasis web yang dirancang untuk membantu pelaku usaha dalam mengelola proses penjualan, pembelian, inventaris, pelanggan, supplier, hingga laporan bisnis secara efisien.

Website ini mengusung desain modern, minimalis, dan elegan dengan pengalaman pengguna yang cepat, responsif, serta mudah digunakan.

---

# 2. Tujuan Project

- Mempermudah proses transaksi penjualan.
- Mengelola data produk dan stok.
- Mengelola supplier dan customer.
- Menyediakan laporan bisnis secara realtime.
- Menjadi project portfolio Full Stack Developer.

---

# 3. Target Pengguna

- UMKM
- Toko Retail
- Minimarket
- Toko Elektronik
- Toko Fashion
- Toko Sembako

---

# 4. Tech Stack

## Frontend

- React.js
- Vite
- TypeScript
- Tailwind CSS
- Shadcn/UI
- React Router
- TanStack Query
- Axios
- React Hook Form
- Zod

---

## Backend

- Node.js
- Express.js
- JWT Authentication
- Multer
- Bcrypt

---

## Database

SQLite

---

## ORM

Drizzle ORM

Drizzle Studio

---

# 5. User Role

## Administrator

Memiliki akses penuh terhadap seluruh sistem.

---

## Kasir

- Melakukan transaksi
- Mengelola penjualan
- Melihat data produk

---

## Owner

- Melihat dashboard
- Melihat laporan
- Monitoring penjualan

---

# 6. Fitur Utama

## Authentication

- Login
- Logout
- Forgot Password
- Change Password

---

## Dashboard

Menampilkan:

- Total Penjualan
- Pendapatan
- Produk Terjual
- Produk Hampir Habis
- Grafik Penjualan
- Grafik Pendapatan
- Aktivitas Terbaru

---

## Produk

- CRUD Produk
- Upload Foto
- Barcode
- SKU
- Harga Modal
- Harga Jual
- Diskon
- Pajak

---

## Kategori

- Tambah
- Edit
- Hapus
- Pencarian

---

## Supplier

- CRUD Supplier
- Kontak Supplier
- Riwayat Pembelian

---

## Customer

- CRUD Customer
- Riwayat Pembelian

---

## Inventory

- Stock Masuk
- Stock Keluar
- Stock Opname
- Penyesuaian Stock

---

## Pembelian

- Buat Purchase Order
- Penerimaan Barang
- Riwayat Pembelian

---

## Penjualan (POS)

Fitur:

- Cari Produk
- Scan Barcode
- Keranjang Belanja
- Diskon
- Pajak
- Multi Payment
- Cetak Invoice

Metode Pembayaran:

- Cash
- Transfer
- QRIS

---

## Riwayat Transaksi

- Detail Transaksi
- Cetak Invoice
- Filter Tanggal

---

## Laporan

- Penjualan
- Pembelian
- Produk
- Stok
- Customer
- Supplier
- Laba Rugi

Export:

- PDF
- Excel

---

## User Management

- CRUD User
- Role Management

---

## Pengaturan

- Nama Toko
- Logo
- Pajak
- Mata Uang
- Printer

---

# 7. Struktur Menu

Dashboard

Master Data

- Produk
- Kategori
- Supplier
- Customer

Inventory

- Stock Masuk
- Stock Keluar
- Stock Opname

Transaksi

- Pembelian
- Penjualan
- Riwayat

Laporan

User

Pengaturan

Profile

---

# 8. Database (Garis Besar)

users

roles

products

categories

suppliers

customers

purchases

purchase_items

sales

sale_items

stocks

stock_movements

settings

activity_logs

notifications

---

# 9. UI / UX

## Konsep Design

Modern

Minimalist

Elegant

Responsive

Professional Dashboard

Inspirasi:

- Stripe
- Vercel
- Linear
- Moka POS

---

## Color Palette

Primary

#2563EB

Secondary

#0F172A

Success

#22C55E

Danger

#EF4444

Warning

#F59E0B

Background

#F8FAFC

Dark

#020617

---

## Typography

Font

Inter

Heading

Bold

Body

Regular

---

## Icons

Lucide React

---

## Animasi

- Smooth Transition
- Hover Effect
- Loading Skeleton
- Toast Notification

---

# 10. Responsive

Desktop

Tablet

Mobile

---

# 11. Keamanan

- JWT Authentication
- Password Hashing
- Protected Route
- Role Permission
- Input Validation
- SQL Injection Protection
- XSS Protection

---

# 12. Non Functional Requirement

- Responsive
- Fast Loading
- Clean UI
- Modular Code
- Maintainable
- Secure
- Scalable

---

# 13. Folder Structure

Frontend

src/

components/

pages/

layouts/

hooks/

services/

utils/

types/

assets/

Backend

controllers/

routes/

middlewares/

models/

services/

database/

drizzle/

utils/

uploads/

---

# 14. Future Development

- Multi Cabang
- Multi Gudang
- Membership
- Loyalty Point
- WhatsApp Notification
- Email Invoice
- QR Code Scanner
- Barcode Scanner
- Mobile Apps
- AI Sales Prediction

---

# 15. Target Portfolio

Project ini dibuat sebagai portfolio Full Stack Developer dengan menunjukkan kemampuan:

- React + Vite
- Node.js
- REST API
- SQLite
- Drizzle ORM
- Authentication
- Dashboard Analytics
- CRUD Kompleks
- Relasi Database
- Inventory Management
- Reporting
- Responsive UI
- Modern Design