import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const timestamps = {
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
};

// ---------------------------------------------------------------------------
// Roles & Users
// ---------------------------------------------------------------------------
export const roles = sqliteTable('roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(), // administrator | kasir | owner
  description: text('description'),
  ...timestamps,
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  roleId: integer('role_id').notNull().references(() => roles.id),
  phone: text('phone'),
  avatar: text('avatar'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  lastLogin: text('last_login'),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Categories & Products
// ---------------------------------------------------------------------------
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#2563EB'),
  ...timestamps,
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => categories.id),
  description: text('description'),
  image: text('image'),
  costPrice: real('cost_price').default(0).notNull(),
  sellPrice: real('sell_price').default(0).notNull(),
  discount: real('discount').default(0).notNull(), // percent
  tax: real('tax').default(0).notNull(), // percent
  stock: integer('stock').default(0).notNull(),
  minStock: integer('min_stock').default(5).notNull(),
  unit: text('unit').default('pcs'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Suppliers & Customers
// ---------------------------------------------------------------------------
export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  ...timestamps,
});

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Purchases (Purchase Orders)
// ---------------------------------------------------------------------------
export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNo: text('invoice_no').notNull().unique(),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  userId: integer('user_id').references(() => users.id),
  subtotal: real('subtotal').default(0).notNull(),
  tax: real('tax').default(0).notNull(),
  total: real('total').default(0).notNull(),
  status: text('status').default('pending').notNull(), // pending | received | cancelled
  note: text('note'),
  ...timestamps,
});

export const purchaseItems = sqliteTable('purchase_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchaseId: integer('purchase_id').notNull().references(() => purchases.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  costPrice: real('cost_price').notNull(),
  subtotal: real('subtotal').notNull(),
});

// ---------------------------------------------------------------------------
// Sales (POS)
// ---------------------------------------------------------------------------
export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNo: text('invoice_no').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id),
  userId: integer('user_id').references(() => users.id),
  subtotal: real('subtotal').default(0).notNull(),
  discount: real('discount').default(0).notNull(),
  tax: real('tax').default(0).notNull(),
  total: real('total').default(0).notNull(),
  paid: real('paid').default(0).notNull(),
  change: real('change').default(0).notNull(),
  paymentMethod: text('payment_method').default('cash').notNull(), // cash | transfer | qris
  status: text('status').default('completed').notNull(), // completed | refunded
  note: text('note'),
  ...timestamps,
});

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  productId: integer('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  price: real('price').notNull(),
  discount: real('discount').default(0).notNull(),
  subtotal: real('subtotal').notNull(),
});

// ---------------------------------------------------------------------------
// Stock movements
// ---------------------------------------------------------------------------
export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  type: text('type').notNull(), // in | out | adjustment | opname
  quantity: integer('quantity').notNull(),
  stockBefore: integer('stock_before').notNull(),
  stockAfter: integer('stock_after').notNull(),
  reference: text('reference'), // e.g. sale invoice, purchase invoice
  note: text('note'),
  userId: integer('user_id').references(() => users.id),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// ---------------------------------------------------------------------------
// Settings, Activity logs, Notifications
// ---------------------------------------------------------------------------
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeName: text('store_name').default('Waru.NK POS').notNull(),
  logo: text('logo'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  currency: text('currency').default('IDR').notNull(),
  taxRate: real('tax_rate').default(11).notNull(),
  printerName: text('printer_name'),
  footerNote: text('footer_note').default('Terima kasih atas kunjungan Anda!'),
  ...timestamps,
});

export const activityLogs = sqliteTable('activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  description: text('description'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  message: text('message'),
  type: text('type').default('info').notNull(), // info | warning | success | danger
  isRead: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});
