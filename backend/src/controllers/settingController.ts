import { Response } from 'express';
import { z } from 'zod';
import { eq, sql, desc } from 'drizzle-orm';
import { db } from '../database/db.js';
import { settings, notifications } from '../database/schema.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';

export const get = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.select().from(settings).limit(1);
  if (!rows[0]) {
    const [created] = await db.insert(settings).values({}).returning();
    return res.json(created);
  }
  res.json(rows[0]);
});

const schema = z.object({
  storeName: z.string().min(1),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  currency: z.string().optional(),
  taxRate: z.coerce.number().min(0).optional(),
  printerName: z.string().optional().nullable(),
  footerNote: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = schema.parse({ ...req.body, logo: req.file ? `/uploads/${req.file.filename}` : req.body.logo });
  const existing = await db.select().from(settings).limit(1);
  if (!existing[0]) {
    const [created] = await db.insert(settings).values(data).returning();
    return res.json(created);
  }
  const [row] = await db.update(settings).set({ ...data, updatedAt: sql`(CURRENT_TIMESTAMP)` }).where(eq(settings.id, existing[0].id)).returning();
  res.json(row);
});

export const listNotifications = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.select().from(notifications).orderBy(desc(notifications.id)).limit(30);
  res.json(rows);
});

export const markAllRead = asyncHandler(async (_req: AuthRequest, res: Response) => {
  await db.update(notifications).set({ isRead: true });
  res.json({ message: 'Semua notifikasi ditandai dibaca' });
});
