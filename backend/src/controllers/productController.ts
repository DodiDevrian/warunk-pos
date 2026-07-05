import { Response } from 'express';
import { z } from 'zod';
import { eq, like, desc, or, sql, and, lte } from 'drizzle-orm';
import { db } from '../database/db.js';
import { products, categories, stockMovements } from '../database/schema.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';

const schema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  categoryId: z.coerce.number().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  costPrice: z.coerce.number().min(0).default(0),
  sellPrice: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().int().default(0),
  minStock: z.coerce.number().int().default(5),
  unit: z.string().optional().nullable(),
  isActive: z.coerce.boolean().optional(),
});

function selectProduct() {
  return db
    .select({
      id: products.id, name: products.name, sku: products.sku, barcode: products.barcode,
      categoryId: products.categoryId, categoryName: categories.name, categoryColor: categories.color,
      description: products.description, image: products.image,
      costPrice: products.costPrice, sellPrice: products.sellPrice,
      discount: products.discount, tax: products.tax,
      stock: products.stock, minStock: products.minStock, unit: products.unit,
      isActive: products.isActive, createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id));
}

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = (req.query.search as string) || '';
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const lowStock = req.query.lowStock === 'true';

  const conds = [];
  if (search) conds.push(or(like(products.name, `%${search}%`), like(products.sku, `%${search}%`), like(products.barcode, `%${search}%`)));
  if (categoryId) conds.push(eq(products.categoryId, categoryId));
  if (lowStock) conds.push(lte(products.stock, products.minStock));

  const rows = await selectProduct()
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(products.id));
  res.json(rows);
});

export const getOne = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rows = await selectProduct().where(eq(products.id, Number(req.params.id)));
  if (!rows[0]) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json(rows[0]);
});

export const getByBarcode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const code = req.params.code;
  const rows = await selectProduct().where(or(eq(products.barcode, code), eq(products.sku, code)));
  if (!rows[0]) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json(rows[0]);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = schema.parse({ ...req.body, image: req.file ? `/uploads/${req.file.filename}` : req.body.image });
  const exists = await db.select({ id: products.id }).from(products).where(eq(products.sku, data.sku));
  if (exists.length) return res.status(400).json({ message: 'SKU sudah digunakan' });
  const [row] = await db.insert(products).values(data).returning();
  if (data.stock > 0) {
    await db.insert(stockMovements).values({
      productId: row.id, type: 'in', quantity: data.stock, stockBefore: 0, stockAfter: data.stock,
      reference: 'initial', note: 'Stok awal produk', userId: req.user!.id,
    });
  }
  res.status(201).json(row);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = schema.parse({ ...req.body, image: req.file ? `/uploads/${req.file.filename}` : req.body.image });
  const [row] = await db.update(products).set({ ...data, updatedAt: sql`(CURRENT_TIMESTAMP)` }).where(eq(products.id, id)).returning();
  if (!row) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json(row);
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  res.json({ message: 'Produk dinonaktifkan' });
});
