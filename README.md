# Waru.NK POS

> Modern Point of Sale Management System — a full-stack POS for UMKM, retail stores, and minimarkets. Built as a Full Stack Developer portfolio project.

Modern, minimalist, elegant dashboard (inspired by Stripe / Vercel / Linear / Moka POS) with a fast, responsive UI and a complete REST API.

## ✨ Features

- **Authentication** — JWT login, logout, change & reset password, role-based access
- **Roles** — Administrator (full access), Kasir (POS + sales), Owner (dashboard + reports)
- **Dashboard** — realtime stats, 14-day sales/revenue charts, top products, payment breakdown, activity feed
- **Point of Sale** — product grid, search/barcode, cart, discount & tax, multi-payment (Cash / Transfer / QRIS), change calc, printable receipt
- **Master Data** — Products (with photo, SKU, barcode, cost/sell price, discount, tax), Categories, Suppliers, Customers
- **Inventory** — stock in/out, opname, adjustments, low-stock alerts, movement history
- **Purchasing** — purchase orders with goods receipt that auto-increments stock
- **Sales History** — filter by date & payment, transaction detail, reprint invoice
- **Reports** — sales, purchases, products, stock, customers, suppliers, profit & loss — with CSV (Excel) export and print
- **User Management** — CRUD users & roles
- **Settings** — store name, logo, address, currency, tax rate, receipt footer
- **Dark mode**, toast notifications, loading skeletons, smooth animations

## 🧱 Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router, React Hook Form, Zod, Recharts, Lucide, Sonner |
| Backend   | Node.js, Express, JWT, Bcrypt, Multer, Zod |
| Database  | SQLite (via libSQL) + Drizzle ORM |

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (developed on Node 26) and npm

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Create the database and seed demo data
```bash
npm run db:setup
```

### 3. Run both servers (backend :4000 + frontend :5173)
```bash
npm run dev
```

Then open **http://localhost:5173**.

> The frontend proxies `/api` and `/uploads` to the backend, so you only need to open the frontend URL.

### Demo accounts

| Role          | Email               | Password  |
|---------------|---------------------|-----------|
| Administrator | admin@warunk.com    | admin123  |
| Kasir         | kasir@warunk.com    | kasir123  |
| Owner         | owner@warunk.com    | owner123  |

## 📜 Scripts

Root:
- `npm run dev` — run backend + frontend together
- `npm run dev:backend` / `npm run dev:frontend` — run individually
- `npm run db:setup` — migrate + seed
- `npm run db:reset` — wipe, migrate, and re-seed
- `npm run build` — production build of the frontend

Backend (`backend/`):
- `npm run dev` — start API with hot reload (tsx)
- `npm run db:migrate` — create tables
- `npm run db:seed` — seed demo data
- `npm run db:studio` — open Drizzle Studio

## 🗂️ Project Structure

```
warunk-claude-opus48/
├── backend/
│   └── src/
│       ├── controllers/     # auth, product, sale, purchase, inventory, dashboard, report, user, setting
│       ├── routes/          # REST route definitions + RBAC
│       ├── middlewares/     # auth (JWT), upload (Multer), error handling
│       ├── database/        # Drizzle schema, migrate, seed, db client
│       ├── utils/           # jwt, helpers
│       └── index.ts         # Express app entry
└── frontend/
    └── src/
        ├── components/       # ui primitives, layout (sidebar/topbar), StatCard
        ├── pages/            # Dashboard, POS, Products, Categories, ... , Settings, Profile
        ├── context/          # AuthContext
        ├── hooks/            # useTheme, useDebounce
        ├── lib/              # api (axios), format, printInvoice, export
        └── types/            # shared TypeScript types
```

## 🔒 Security

JWT auth, bcrypt password hashing, protected routes, role-based permissions on every endpoint, Zod input validation, parameterized queries (SQL-injection safe) via Drizzle ORM.

## 🗄️ Database

SQLite file at `backend/data/warunk.db`. Tables: `users`, `roles`, `products`, `categories`, `suppliers`, `customers`, `purchases`, `purchase_items`, `sales`, `sale_items`, `stock_movements`, `settings`, `activity_logs`, `notifications`.

---

Built with ❤️ as a portfolio project — **Waru.NK POS v1.0.0**
