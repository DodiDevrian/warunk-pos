import { Response } from 'express';
import { z } from 'zod';
import { eq, desc, gte, lte, and, sql, like } from 'drizzle-orm';
import { db } from '../database/db.js';
import { sales, saleItems, products, customers, users, stockMovements } from '../database/schema.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';
import { generateInvoiceNo, logActivity } from '../utils/helpers.js';

const saleSchema = z.object({
  customerId: z.coerce.number().optional().nullable(),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  paid: z.coerce.number().min(0),
  paymentMethod: z.enum(['cash', 'transfer', 'qris']).default('cash'),
  note: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.coerce.number(),
    quantity: z.coerce.number().int().positive(),
    price: z.coerce.number().min(0),
    discount: z.coerce.number().min(0).default(0),
  })).min(1),
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = saleSchema.parse(req.body);

  // Verify stock availability up front
  const productMap = new Map<number, typeof products.$inferSelect>();
  for (const item of data.items) {
    const rows = await db.select().from(products).where(eq(products.id, item.productId));
    const p = rows[0];
    if (!p) return res.status(400).json({ message: `Produk #${item.productId} tidak ditemukan` });
    if (p.stock < item.quantity) return res.status(400).json({ message: `Stok ${p.name} tidak cukup (tersisa ${p.stock})` });
    productMap.set(p.id, p);
  }

  let subtotal = 0;
  for (const item of data.items) subtotal += item.price * item.quantity - item.discount;
  const total = Math.max(0, subtotal - data.discount + data.tax);
  if (data.paid < total) return res.status(400).json({ message: 'Pembayaran kurang dari total' });

  // Next invoice sequence for today
  const countRows = await db.select({ c: sql<number>`COUNT(*)` }).from(sales);
  const invoiceNo = generateInvoiceNo('INV', (countRows[0]?.c ?? 0) + 1);

  // Transaction: create sale + items + decrement stock + movements
  const saleId = await db.transaction(async (tx) => {
    const [sale] = await tx.insert(sales).values({
      invoiceNo, customerId: data.customerId ?? undefined, userId: req.user!.id,
      subtotal, discount: data.discount, tax: data.tax, total,
      paid: data.paid, change: data.paid - total, paymentMethod: data.paymentMethod, status: 'completed',
      note: data.note ?? undefined,
    }).returning({ id: sales.id });

    for (const item of data.items) {
      const p = productMap.get(item.productId)!;
      await tx.insert(saleItems).values({
        saleId: sale.id, productId: item.productId, productName: p.name,
        quantity: item.quantity, price: item.price, discount: item.discount,
        subtotal: item.price * item.quantity - item.discount,
      });
      await tx.update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(eq(products.id, item.productId));
      await tx.insert(stockMovements).values({
        productId: item.productId, type: 'out', quantity: item.quantity,
        stockBefore: p.stock, stockAfter: p.stock - item.quantity,
        reference: invoiceNo, note: 'Penjualan', userId: req.user!.id,
      });
    }
    return sale.id;
  });
  await logActivity(req.user!.id, 'sale', `Transaksi ${invoiceNo} sebesar ${total}`);
  const created = await getSaleDetail(saleId);
  res.status(201).json(created);
});

async function getSaleDetail(id: number) {
  const rows = await db
    .select({
      id: sales.id, invoiceNo: sales.invoiceNo, customerId: sales.customerId, customerName: customers.name,
      userId: sales.userId, cashierName: users.name,
      subtotal: sales.subtotal, discount: sales.discount, tax: sales.tax, total: sales.total,
      paid: sales.paid, change: sales.change, paymentMethod: sales.paymentMethod, status: sales.status,
      note: sales.note, createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(users, eq(sales.userId, users.id))
    .where(eq(sales.id, id));
  if (!rows[0]) return null;
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
  return { ...rows[0], items };
}

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { search, startDate, endDate, paymentMethod } = req.query as Record<string, string>;
  const conds = [];
  if (search) conds.push(like(sales.invoiceNo, `%${search}%`));
  if (startDate) conds.push(gte(sales.createdAt, `${startDate} 00:00:00`));
  if (endDate) conds.push(lte(sales.createdAt, `${endDate} 23:59:59`));
  if (paymentMethod) conds.push(eq(sales.paymentMethod, paymentMethod));

  const rows = await db
    .select({
      id: sales.id, invoiceNo: sales.invoiceNo, customerName: customers.name, cashierName: users.name,
      total: sales.total, paid: sales.paid, change: sales.change, paymentMethod: sales.paymentMethod,
      status: sales.status, createdAt: sales.createdAt,
      itemCount: sql<number>`(SELECT COALESCE(SUM(quantity),0) FROM sale_items WHERE sale_items.sale_id = ${sales.id})`,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(users, eq(sales.userId, users.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(sales.id));
  res.json(rows);
});

export const getOne = asyncHandler(async (req: AuthRequest, res: Response) => {
  const detail = await getSaleDetail(Number(req.params.id));
  if (!detail) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
  res.json(detail);
});
