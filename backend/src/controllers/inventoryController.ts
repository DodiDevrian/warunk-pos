import { Response } from 'express';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../database/db.js';
import { stockMovements, products } from '../database/schema.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';
import { logActivity } from '../utils/helpers.js';

export const listMovements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const type = req.query.type as string | undefined;
  const rows = await db
    .select({
      id: stockMovements.id, productId: stockMovements.productId, productName: products.name,
      type: stockMovements.type, quantity: stockMovements.quantity,
      stockBefore: stockMovements.stockBefore, stockAfter: stockMovements.stockAfter,
      reference: stockMovements.reference, note: stockMovements.note, createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .where(type ? eq(stockMovements.type, type) : undefined)
    .orderBy(desc(stockMovements.id))
    .limit(200);
  res.json(rows);
});

const adjustSchema = z.object({
  productId: z.coerce.number(),
  type: z.enum(['in', 'out', 'adjustment', 'opname']),
  quantity: z.coerce.number().int(), // for opname this is the new absolute count
  note: z.string().optional().nullable(),
});

export const adjust = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = adjustSchema.parse(req.body);
  const rows = await db.select().from(products).where(eq(products.id, data.productId));
  const p = rows[0];
  if (!p) return res.status(404).json({ message: 'Produk tidak ditemukan' });

  const before = p.stock;
  let after: number;
  let movementQty: number;

  if (data.type === 'in') { after = before + data.quantity; movementQty = data.quantity; }
  else if (data.type === 'out') {
    if (data.quantity > before) return res.status(400).json({ message: 'Stok tidak cukup' });
    after = before - data.quantity; movementQty = data.quantity;
  } else if (data.type === 'opname') { after = data.quantity; movementQty = data.quantity - before; }
  else { after = before + data.quantity; movementQty = data.quantity; } // adjustment: signed

  if (after < 0) return res.status(400).json({ message: 'Hasil stok tidak boleh negatif' });

  await db.transaction(async (tx) => {
    await tx.update(products).set({ stock: after }).where(eq(products.id, data.productId));
    await tx.insert(stockMovements).values({
      productId: data.productId, type: data.type, quantity: movementQty,
      stockBefore: before, stockAfter: after, reference: 'manual',
      note: data.note ?? undefined, userId: req.user!.id,
    });
  });
  await logActivity(req.user!.id, 'stock', `Penyesuaian stok ${p.name}: ${before} → ${after}`);
  res.json({ productId: data.productId, stockBefore: before, stockAfter: after });
});

export const lowStock = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db
    .select({ id: products.id, name: products.name, sku: products.sku, stock: products.stock, minStock: products.minStock, unit: products.unit })
    .from(products)
    .where(sql`${products.stock} <= ${products.minStock} AND ${products.isActive} = 1`)
    .orderBy(products.stock);
  res.json(rows);
});
