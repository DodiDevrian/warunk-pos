import { Response } from 'express';
import { sql, eq, desc } from 'drizzle-orm';
import { db } from '../database/db.js';
import { sales, saleItems, products, activityLogs, users } from '../database/schema.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';

export const stats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);

  const totalSales = await db.select({ v: sql<number>`COALESCE(SUM(total),0)` }).from(sales);
  const totalRevenue = await db.select({ v: sql<number>`COALESCE(SUM(total - tax),0)` }).from(sales);
  const todaySales = await db.select({ v: sql<number>`COALESCE(SUM(total),0)`, c: sql<number>`COUNT(*)` })
    .from(sales).where(sql`date(created_at) = ${today}`);
  const productsSold = await db.select({ v: sql<number>`COALESCE(SUM(quantity),0)` }).from(saleItems);
  const totalTransactions = await db.select({ v: sql<number>`COUNT(*)` }).from(sales);
  const lowStockCount = await db.select({ v: sql<number>`COUNT(*)` }).from(products)
    .where(sql`${products.stock} <= ${products.minStock} AND ${products.isActive} = 1`);
  const productCount = await db.select({ v: sql<number>`COUNT(*)` }).from(products).where(eq(products.isActive, true));

  res.json({
    totalSales: totalSales[0].v,
    totalRevenue: totalRevenue[0].v,
    todaySales: todaySales[0].v,
    todayTransactions: todaySales[0].c,
    productsSold: productsSold[0].v,
    totalTransactions: totalTransactions[0].v,
    lowStockCount: lowStockCount[0].v,
    productCount: productCount[0].v,
  });
});

// Sales & revenue for the last 14 days
export const salesChart = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.all<{ day: string; total: number; revenue: number; count: number }>(sql`
    SELECT date(created_at) as day,
           COALESCE(SUM(total),0) as total,
           COALESCE(SUM(total - tax),0) as revenue,
           COUNT(*) as count
    FROM sales
    WHERE created_at >= date('now', '-13 days')
    GROUP BY date(created_at)
    ORDER BY day ASC
  `);

  // Fill missing days
  const map = new Map(rows.map((r) => [r.day, r]));
  const result = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const r = map.get(key);
    result.push({ day: key, total: r?.total ?? 0, revenue: r?.revenue ?? 0, count: r?.count ?? 0 });
  }
  res.json(result);
});

export const topProducts = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.all<{ name: string; qty: number; revenue: number }>(sql`
    SELECT product_name as name, SUM(quantity) as qty, SUM(subtotal) as revenue
    FROM sale_items
    GROUP BY product_name
    ORDER BY qty DESC
    LIMIT 5
  `);
  res.json(rows);
});

export const paymentBreakdown = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.all<{ method: string; total: number; count: number }>(sql`
    SELECT payment_method as method, SUM(total) as total, COUNT(*) as count
    FROM sales GROUP BY payment_method
  `);
  res.json(rows);
});

export const recentActivity = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db
    .select({
      id: activityLogs.id, action: activityLogs.action, description: activityLogs.description,
      userName: users.name, createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .orderBy(desc(activityLogs.id))
    .limit(10);
  res.json(rows);
});
