import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../database/db.js';
import { users, roles } from '../database/schema.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';

export const listRoles = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json(await db.select().from(roles));
});

export const list = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db
    .select({
      id: users.id, name: users.name, email: users.email, phone: users.phone,
      roleId: users.roleId, role: roles.name, avatar: users.avatar,
      isActive: users.isActive, lastLogin: users.lastLogin, createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .orderBy(desc(users.id));
  res.json(rows);
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.coerce.number(),
  phone: z.string().optional().nullable(),
  isActive: z.coerce.boolean().optional(),
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = createSchema.parse(req.body);
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email));
  if (exists.length) return res.status(400).json({ message: 'Email sudah digunakan' });
  const [row] = await db.insert(users).values({ ...data, password: bcrypt.hashSync(data.password, 10) }).returning();
  const { password: _pw, ...safe } = row;
  res.status(201).json(safe);
});

const updateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal('')),
  roleId: z.coerce.number(),
  phone: z.string().optional().nullable(),
  isActive: z.coerce.boolean().optional(),
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = updateSchema.parse(req.body);
  const patch: Record<string, unknown> = {
    name: data.name, email: data.email, roleId: data.roleId,
    phone: data.phone, isActive: data.isActive, updatedAt: sql`(CURRENT_TIMESTAMP)`,
  };
  if (data.password) patch.password = bcrypt.hashSync(data.password, 10);
  const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  if (!row) return res.status(404).json({ message: 'User tidak ditemukan' });
  const { password: _pw, ...safe } = row;
  res.json(safe);
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (id === req.user!.id) return res.status(400).json({ message: 'Tidak bisa menghapus akun sendiri' });
  await db.delete(users).where(eq(users.id, id));
  res.json({ message: 'User dihapus' });
});

// Profile update (self)
const profileSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = profileSchema.parse({ ...req.body, avatar: req.file ? `/uploads/${req.file.filename}` : req.body.avatar });
  const [row] = await db.update(users).set({ ...data, updatedAt: sql`(CURRENT_TIMESTAMP)` }).where(eq(users.id, req.user!.id)).returning();
  const { password: _pw, ...safe } = row;
  res.json(safe);
});
