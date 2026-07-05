import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '../database/db.js';
import { users, roles } from '../database/schema.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';
import { logActivity } from '../utils/helpers.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function findUserByEmail(email: string) {
  const rows = await db
    .select({
      id: users.id, name: users.name, email: users.email, password: users.password,
      roleId: users.roleId, role: roles.name, phone: users.phone, avatar: users.avatar,
      isActive: users.isActive,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.email, email));
  return rows[0];
}

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ message: 'Email atau password salah' });
  if (!user.isActive) return res.status(403).json({ message: 'Akun dinonaktifkan' });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Email atau password salah' });

  await db.update(users).set({ lastLogin: sql`(CURRENT_TIMESTAMP)` }).where(eq(users.id, user.id));
  await logActivity(user.id, 'login', `${user.name} logged in`);

  const token = signToken({ id: user.id, email: user.email, role: user.role || 'kasir' });
  const { password: _pw, ...safe } = user;
  res.json({ token, user: safe });
});

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rows = await db
    .select({
      id: users.id, name: users.name, email: users.email, roleId: users.roleId,
      role: roles.name, phone: users.phone, avatar: users.avatar, isActive: users.isActive,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, req.user!.id));
  if (!rows[0]) return res.status(404).json({ message: 'User not found' });
  res.json(rows[0]);
});

const changePwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = changePwSchema.parse(req.body);
  const rows = await db.select().from(users).where(eq(users.id, req.user!.id));
  const user = rows[0];
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ message: 'Password lama tidak sesuai' });
  }
  await db.update(users).set({ password: bcrypt.hashSync(newPassword, 10) }).where(eq(users.id, user.id));
  res.json({ message: 'Password berhasil diubah' });
});

const forgotSchema = z.object({ email: z.string().email(), newPassword: z.string().min(6) });

// Simplified reset (no email delivery in this portfolio build): resets by email.
export const forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, newPassword } = forgotSchema.parse(req.body);
  const user = await findUserByEmail(email);
  if (!user) return res.status(404).json({ message: 'Email tidak terdaftar' });
  await db.update(users).set({ password: bcrypt.hashSync(newPassword, 10) }).where(eq(users.id, user.id));
  res.json({ message: 'Password berhasil direset. Silakan login.' });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  await logActivity(req.user!.id, 'logout', `User logged out`);
  res.json({ message: 'Logged out' });
});
