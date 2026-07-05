import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import {
  roles, users, categories, products, suppliers, customers, settings,
  sales, saleItems, stockMovements, notifications, purchases, purchaseItems, activityLogs,
} from './schema.js';
import { generateInvoiceNo } from '../utils/helpers.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // Wipe (in FK-safe order) so seed is repeatable
  await db.delete(saleItems);
  await db.delete(sales);
  await db.delete(purchaseItems);
  await db.delete(purchases);
  await db.delete(stockMovements);
  await db.delete(activityLogs);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(suppliers);
  await db.delete(customers);
  await db.delete(notifications);
  await db.delete(users);
  await db.delete(roles);
  await db.delete(settings);

  // Roles
  const [adminRole, kasirRole, ownerRole] = await db.insert(roles).values([
    { name: 'administrator', description: 'Akses penuh terhadap seluruh sistem' },
    { name: 'kasir', description: 'Melakukan transaksi & mengelola penjualan' },
    { name: 'owner', description: 'Melihat dashboard, laporan & monitoring' },
  ]).returning();

  // Users
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  const insertedUsers = await db.insert(users).values([
    { name: 'Administrator', email: 'admin@warunk.com', password: hash('admin123'), roleId: adminRole.id, phone: '081234567890' },
    { name: 'Kasir Satu', email: 'kasir@warunk.com', password: hash('kasir123'), roleId: kasirRole.id, phone: '081234567891' },
    { name: 'Pemilik Toko', email: 'owner@warunk.com', password: hash('owner123'), roleId: ownerRole.id, phone: '081234567892' },
  ]).returning();
  const kasirUserId = insertedUsers.find((u) => u.email === 'kasir@warunk.com')!.id;

  // Settings
  await db.insert(settings).values({
    storeName: 'Waru.NK Mart', address: 'Jl. Merdeka No. 45, Jakarta',
    phone: '021-5550123', email: 'store@warunk.com', currency: 'IDR', taxRate: 11,
    footerNote: 'Terima kasih telah berbelanja di Waru.NK Mart!',
  });

  // Categories
  const catRows = await db.insert(categories).values([
    { name: 'Makanan', description: 'Produk makanan & snack', color: '#22C55E' },
    { name: 'Minuman', description: 'Minuman kemasan & dingin', color: '#2563EB' },
    { name: 'Sembako', description: 'Kebutuhan pokok sehari-hari', color: '#F59E0B' },
    { name: 'Elektronik', description: 'Aksesoris & elektronik kecil', color: '#8B5CF6' },
    { name: 'Kebersihan', description: 'Produk kebersihan rumah tangga', color: '#06B6D4' },
  ]).returning();

  const catId = (name: string) => catRows.find((c) => c.name === name)!.id;

  // Products
  const productData = [
    { name: 'Indomie Goreng', cat: 'Makanan', cost: 2500, sell: 3500, stock: 120, barcode: '8992388101010' },
    { name: 'Chitato Sapi Panggang', cat: 'Makanan', cost: 8000, sell: 11000, stock: 45, barcode: '8992388101027' },
    { name: 'Roti Tawar Sari Roti', cat: 'Makanan', cost: 12000, sell: 16000, stock: 20, barcode: '8992388101034' },
    { name: 'Aqua 600ml', cat: 'Minuman', cost: 2000, sell: 3500, stock: 200, barcode: '8992388102010' },
    { name: 'Teh Botol Sosro', cat: 'Minuman', cost: 3500, sell: 5000, stock: 80, barcode: '8992388102027' },
    { name: 'Kopi Kapal Api Sachet', cat: 'Minuman', cost: 1200, sell: 2000, stock: 3, barcode: '8992388102034' },
    { name: 'Beras Pandan Wangi 5kg', cat: 'Sembako', cost: 62000, sell: 72000, stock: 30, barcode: '8992388103010' },
    { name: 'Minyak Goreng Bimoli 2L', cat: 'Sembako', cost: 32000, sell: 38000, stock: 25, barcode: '8992388103027' },
    { name: 'Gula Pasir 1kg', cat: 'Sembako', cost: 13000, sell: 16000, stock: 4, barcode: '8992388103034' },
    { name: 'Telur Ayam 1kg', cat: 'Sembako', cost: 25000, sell: 29000, stock: 40, barcode: '8992388103041' },
    { name: 'Kabel Data USB-C', cat: 'Elektronik', cost: 15000, sell: 30000, stock: 15, barcode: '8992388104010' },
    { name: 'Baterai AA (isi 4)', cat: 'Elektronik', cost: 9000, sell: 15000, stock: 50, barcode: '8992388104027' },
    { name: 'Sabun Mandi Lifebuoy', cat: 'Kebersihan', cost: 3000, sell: 4500, stock: 60, barcode: '8992388105010' },
    { name: 'Deterjen Rinso 800g', cat: 'Kebersihan', cost: 18000, sell: 23000, stock: 2, barcode: '8992388105027' },
    { name: 'Tisu Paseo 250s', cat: 'Kebersihan', cost: 11000, sell: 15000, stock: 35, barcode: '8992388105034' },
  ];

  const insertedProducts = await db.insert(products).values(
    productData.map((p, i) => ({
      name: p.name,
      sku: `SKU-${String(i + 1).padStart(4, '0')}`,
      barcode: p.barcode,
      categoryId: catId(p.cat),
      costPrice: p.cost,
      sellPrice: p.sell,
      tax: 0,
      discount: 0,
      stock: p.stock,
      minStock: 5,
      unit: 'pcs',
    })),
  ).returning();

  // Suppliers
  await db.insert(suppliers).values([
    { name: 'PT Indofood Sukses', contactPerson: 'Budi Santoso', phone: '021-1112222', email: 'sales@indofood.co.id', address: 'Jakarta Barat' },
    { name: 'CV Sumber Rejeki', contactPerson: 'Siti Aminah', phone: '021-3334444', email: 'order@sumberrejeki.com', address: 'Bekasi' },
    { name: 'UD Berkah Jaya', contactPerson: 'Andi Wijaya', phone: '021-5556666', email: 'berkahjaya@gmail.com', address: 'Tangerang' },
  ]);

  // Customers
  const custRows = await db.insert(customers).values([
    { name: 'Umum / Walk-in', phone: '-', email: null, address: null },
    { name: 'Rina Kartika', phone: '081200011122', email: 'rina@gmail.com', address: 'Jl. Anggrek 12' },
    { name: 'Joko Susilo', phone: '081200033344', email: 'joko@gmail.com', address: 'Jl. Melati 8' },
  ]).returning();

  // Sample sales spread over the last 14 days for dashboard charts
  const paymentMethods = ['cash', 'transfer', 'qris'] as const;
  let seq = 1;
  for (let dayAgo = 13; dayAgo >= 0; dayAgo--) {
    const salesToday = 1 + (dayAgo % 3);
    for (let s = 0; s < salesToday; s++) {
      const date = new Date();
      date.setDate(date.getDate() - dayAgo);
      date.setHours(9 + s, 15 * s, 0, 0);
      const iso = date.toISOString().slice(0, 19).replace('T', ' ');

      const itemCount = 1 + ((dayAgo + s) % 3);
      let subtotal = 0;
      const chosen: { p: typeof insertedProducts[number]; qty: number }[] = [];
      for (let k = 0; k < itemCount; k++) {
        const p = insertedProducts[(dayAgo * 3 + s * 2 + k) % insertedProducts.length];
        const qty = 1 + (k % 3);
        chosen.push({ p, qty });
        subtotal += p.sellPrice * qty;
      }
      const tax = Math.round(subtotal * 0.11);
      const total = subtotal + tax;
      const paid = Math.ceil(total / 1000) * 1000 + 5000;

      const [sale] = await db.insert(sales).values({
        invoiceNo: generateInvoiceNo('INV', seq++),
        customerId: custRows[(s) % custRows.length].id,
        userId: kasirUserId,
        subtotal, discount: 0, tax, total,
        paid, change: paid - total,
        paymentMethod: paymentMethods[(dayAgo + s) % paymentMethods.length],
        status: 'completed',
        createdAt: iso,
        updatedAt: iso,
      }).returning();

      for (const { p, qty } of chosen) {
        await db.insert(saleItems).values({
          saleId: sale.id, productId: p.id, productName: p.name,
          quantity: qty, price: p.sellPrice, discount: 0, subtotal: p.sellPrice * qty,
        });
      }
    }
  }

  // Notifications for low-stock products
  const lowStock = insertedProducts.filter((p) => p.stock <= 5);
  if (lowStock.length) {
    await db.insert(notifications).values(
      lowStock.map((p) => ({
        title: 'Stok Menipis',
        message: `${p.name} tersisa ${p.stock} ${p.unit ?? 'pcs'}`,
        type: 'warning' as const,
      })),
    );
  }

  console.log('✅ Seed completed.');
  console.log('\nLogin accounts:');
  console.log('  Admin  → admin@warunk.com / admin123');
  console.log('  Kasir  → kasir@warunk.com / kasir123');
  console.log('  Owner  → owner@warunk.com / owner123\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
