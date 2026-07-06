import { Response } from 'express';
import { z } from 'zod';
import { eq, like, desc, sql } from 'drizzle-orm';
import { db } from '../database/db.js';
import { categories, products } from '../database/schema.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = (req.query.search as string) || '';
  const where = search ? like(categories.name, `%${search}%`) : undefined;
  const rows = await db
    .select({
      id: categories.id, name: categories.name, description: categories.description,
      color: categories.color, createdAt: categories.createdAt,
      productCount: sql<number>`COUNT(${products.id})`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(where)
    .groupBy(categories.id)
    .orderBy(desc(categories.id));
  res.json(rows);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = schema.parse(req.body);
  const [row] = await db.insert(categories).values(data).returning();
  res.status(201).json(row);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = schema.parse(req.body);
  const [row] = await db.update(categories).set({ ...data, updatedAt: sql`(CURRENT_TIMESTAMP)` }).where(eq(categories.id, id)).returning();
  if (!row) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  res.json(row);
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const used = await db.select({ id: products.id }).from(products).where(eq(products.categoryId, id));
  if (used.length) return res.status(400).json({ message: 'Kategori masih dipakai produk' });
  await db.delete(categories).where(eq(categories.id, id));
  res.json({ message: 'Kategori dihapus' });
});
