import { Response } from 'express';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../database/db.js';
import { purchases, purchaseItems, products, suppliers, users, stockMovements } from '../database/schema.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';
import { generateInvoiceNo, logActivity } from '../utils/helpers.js';

const schema = z.object({
  supplierId: z.coerce.number().optional().nullable(),
  tax: z.coerce.number().min(0).default(0),
  note: z.string().optional().nullable(),
  status: z.enum(['pending', 'received']).default('received'),
  items: z.array(z.object({
    productId: z.coerce.number(),
    quantity: z.coerce.number().int().positive(),
    costPrice: z.coerce.number().min(0),
  })).min(1),
});

export const list = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db
    .select({
      id: purchases.id, invoiceNo: purchases.invoiceNo, supplierName: suppliers.name,
      userName: users.name, subtotal: purchases.subtotal, tax: purchases.tax, total: purchases.total,
      status: purchases.status, note: purchases.note, createdAt: purchases.createdAt,
    })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .leftJoin(users, eq(purchases.userId, users.id))
    .orderBy(desc(purchases.id));
  res.json(rows);
});

export const getOne = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const rows = await db
    .select({
      id: purchases.id, invoiceNo: purchases.invoiceNo, supplierId: purchases.supplierId,
      supplierName: suppliers.name, subtotal: purchases.subtotal, tax: purchases.tax, total: purchases.total,
      status: purchases.status, note: purchases.note, createdAt: purchases.createdAt,
    })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(eq(purchases.id, id));
  if (!rows[0]) return res.status(404).json({ message: 'Pembelian tidak ditemukan' });
  const items = await db
    .select({
      id: purchaseItems.id, productId: purchaseItems.productId, productName: products.name,
      quantity: purchaseItems.quantity, costPrice: purchaseItems.costPrice, subtotal: purchaseItems.subtotal,
    })
    .from(purchaseItems)
    .leftJoin(products, eq(purchaseItems.productId, products.id))
    .where(eq(purchaseItems.purchaseId, id));
  res.json({ ...rows[0], items });
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = schema.parse(req.body);
  let subtotal = 0;
  for (const item of data.items) subtotal += item.costPrice * item.quantity;
  const total = subtotal + data.tax;

  const countRows = await db.select({ c: sql<number>`COUNT(*)` }).from(purchases);
  const invoiceNo = generateInvoiceNo('PO', (countRows[0]?.c ?? 0) + 1);
  const received = data.status === 'received';

  const purchaseId = await db.transaction(async (tx) => {
    const [purchase] = await tx.insert(purchases).values({
      invoiceNo, supplierId: data.supplierId ?? undefined, userId: req.user!.id,
      subtotal, tax: data.tax, total, status: data.status, note: data.note ?? undefined,
    }).returning({ id: purchases.id });

    for (const item of data.items) {
      await tx.insert(purchaseItems).values({
        purchaseId: purchase.id, productId: item.productId, quantity: item.quantity,
        costPrice: item.costPrice, subtotal: item.costPrice * item.quantity,
      });
      if (received) {
        const rows = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, item.productId));
        const before = rows[0]?.stock ?? 0;
        await tx.update(products)
          .set({ stock: sql`${products.stock} + ${item.quantity}`, costPrice: item.costPrice })
          .where(eq(products.id, item.productId));
        await tx.insert(stockMovements).values({
          productId: item.productId, type: 'in', quantity: item.quantity,
          stockBefore: before, stockAfter: before + item.quantity,
          reference: invoiceNo, note: 'Pembelian', userId: req.user!.id,
        });
      }
    }
    return purchase.id;
  });
  await logActivity(req.user!.id, 'purchase', `Pembelian ${invoiceNo} sebesar ${total}`);
  res.status(201).json({ id: purchaseId, invoiceNo, total });
});
