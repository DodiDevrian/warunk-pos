import { Response } from 'express';
import { z } from 'zod';
import { eq, like, desc, or, sql } from 'drizzle-orm';
import { db } from '../database/db.js';
import { suppliers, customers, purchases, sales } from '../database/schema.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';

// ------- Suppliers -------
const supplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  address: z.string().optional().nullable(),
});

export const listSuppliers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = (req.query.search as string) || '';
  const where = search ? or(like(suppliers.name, `%${search}%`), like(suppliers.phone, `%${search}%`)) : undefined;
  const rows = await db
    .select({
      id: suppliers.id, name: suppliers.name, contactPerson: suppliers.contactPerson,
      phone: suppliers.phone, email: suppliers.email, address: suppliers.address, createdAt: suppliers.createdAt,
      purchaseCount: sql<number>`(SELECT COUNT(*) FROM purchases WHERE purchases.supplier_id = ${suppliers.id})`,
    })
    .from(suppliers).where(where).orderBy(desc(suppliers.id));
  res.json(rows);
});

export const createSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = supplierSchema.parse(req.body);
  const [row] = await db.insert(suppliers).values(data).returning();
  res.status(201).json(row);
});

export const updateSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = supplierSchema.parse(req.body);
  const [row] = await db.update(suppliers).set({ ...data, updatedAt: sql`(CURRENT_TIMESTAMP)` }).where(eq(suppliers.id, id)).returning();
  if (!row) return res.status(404).json({ message: 'Supplier tidak ditemukan' });
  res.json(row);
});

export const removeSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  await db.delete(suppliers).where(eq(suppliers.id, Number(req.params.id)));
  res.json({ message: 'Supplier dihapus' });
});

export const supplierHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rows = await db.select().from(purchases).where(eq(purchases.supplierId, Number(req.params.id))).orderBy(desc(purchases.id));
  res.json(rows);
});

// ------- Customers -------
const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  address: z.string().optional().nullable(),
});

export const listCustomers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = (req.query.search as string) || '';
  const where = search ? or(like(customers.name, `%${search}%`), like(customers.phone, `%${search}%`)) : undefined;
  const rows = await db
    .select({
      id: customers.id, name: customers.name, phone: customers.phone, email: customers.email,
      address: customers.address, createdAt: customers.createdAt,
      totalSpent: sql<number>`COALESCE((SELECT SUM(total) FROM sales WHERE sales.customer_id = ${customers.id}), 0)`,
      transactionCount: sql<number>`(SELECT COUNT(*) FROM sales WHERE sales.customer_id = ${customers.id})`,
    })
    .from(customers).where(where).orderBy(desc(customers.id));
  res.json(rows);
});

export const createCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = customerSchema.parse(req.body);
  const [row] = await db.insert(customers).values(data).returning();
  res.status(201).json(row);
});

export const updateCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = customerSchema.parse(req.body);
  const [row] = await db.update(customers).set({ ...data, updatedAt: sql`(CURRENT_TIMESTAMP)` }).where(eq(customers.id, id)).returning();
  if (!row) return res.status(404).json({ message: 'Customer tidak ditemukan' });
  res.json(row);
});

export const removeCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  await db.delete(customers).where(eq(customers.id, Number(req.params.id)));
  res.json({ message: 'Customer dihapus' });
});

export const customerHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rows = await db.select().from(sales).where(eq(sales.customerId, Number(req.params.id))).orderBy(desc(sales.id));
  res.json(rows);
});
