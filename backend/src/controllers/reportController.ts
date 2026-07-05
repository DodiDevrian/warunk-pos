import { Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../database/db.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';

function dateRange(req: AuthRequest) {
  const start = (req.query.startDate as string) || '1970-01-01';
  const end = (req.query.endDate as string) || '2999-12-31';
  return { start: `${start} 00:00:00`, end: `${end} 23:59:59` };
}

export const salesReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { start, end } = dateRange(req);
  const rows = await db.all(sql`
    SELECT s.invoice_no as invoiceNo, s.created_at as date, c.name as customer,
           u.name as cashier, s.payment_method as paymentMethod,
           s.subtotal, s.discount, s.tax, s.total
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.created_at BETWEEN ${start} AND ${end}
    ORDER BY s.created_at DESC
  `);
  const summary = await db.all<{ count: number; total: number; profit: number }>(sql`
    SELECT COUNT(DISTINCT s.id) as count,
           COALESCE(SUM(si.subtotal),0) as total,
           COALESCE(SUM(si.subtotal - (p.cost_price * si.quantity)),0) as profit
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    JOIN products p ON p.id = si.product_id
    WHERE s.created_at BETWEEN ${start} AND ${end}
  `);
  res.json({ rows, summary: summary[0] });
});

export const purchaseReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { start, end } = dateRange(req);
  const rows = await db.all(sql`
    SELECT p.invoice_no as invoiceNo, p.created_at as date, s.name as supplier,
           p.subtotal, p.tax, p.total, p.status
    FROM purchases p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.created_at BETWEEN ${start} AND ${end}
    ORDER BY p.created_at DESC
  `);
  const summary = await db.all<{ count: number; total: number }>(sql`
    SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
    FROM purchases WHERE created_at BETWEEN ${start} AND ${end}
  `);
  res.json({ rows, summary: summary[0] });
});

export const productReport = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.all(sql`
    SELECT p.name, p.sku, c.name as category, p.stock, p.cost_price as costPrice, p.sell_price as sellPrice,
           COALESCE((SELECT SUM(quantity) FROM sale_items WHERE product_id = p.id), 0) as sold
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY sold DESC
  `);
  res.json({ rows });
});

export const stockReport = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.all(sql`
    SELECT p.name, p.sku, p.stock, p.min_stock as minStock, p.unit,
           (p.stock * p.cost_price) as stockValue,
           CASE WHEN p.stock <= p.min_stock THEN 'low' ELSE 'ok' END as status
    FROM products p WHERE p.is_active = 1
    ORDER BY p.stock ASC
  `);
  const summary = await db.all<{ totalValue: number; lowCount: number }>(sql`
    SELECT COALESCE(SUM(stock * cost_price),0) as totalValue,
           SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END) as lowCount
    FROM products WHERE is_active = 1
  `);
  res.json({ rows, summary: summary[0] });
});

export const customerReport = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.all(sql`
    SELECT c.name, c.phone,
           COUNT(s.id) as transactions,
           COALESCE(SUM(s.total),0) as totalSpent
    FROM customers c LEFT JOIN sales s ON s.customer_id = c.id
    GROUP BY c.id ORDER BY totalSpent DESC
  `);
  res.json({ rows });
});

export const supplierReport = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.all(sql`
    SELECT s.name, s.phone,
           COUNT(p.id) as purchases,
           COALESCE(SUM(p.total),0) as totalPurchased
    FROM suppliers s LEFT JOIN purchases p ON p.supplier_id = s.id
    GROUP BY s.id ORDER BY totalPurchased DESC
  `);
  res.json({ rows });
});

export const profitLossReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { start, end } = dateRange(req);
  const revenue = await db.all<{ v: number }>(sql`
    SELECT COALESCE(SUM(subtotal),0) as v FROM sales WHERE created_at BETWEEN ${start} AND ${end}`);
  const cogs = await db.all<{ v: number }>(sql`
    SELECT COALESCE(SUM(p.cost_price * si.quantity),0) as v
    FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN products p ON p.id = si.product_id
    WHERE s.created_at BETWEEN ${start} AND ${end}`);
  const tax = await db.all<{ v: number }>(sql`
    SELECT COALESCE(SUM(tax),0) as v FROM sales WHERE created_at BETWEEN ${start} AND ${end}`);
  const rev = revenue[0].v, cost = cogs[0].v;
  res.json({
    revenue: rev, cogs: cost, grossProfit: rev - cost,
    tax: tax[0].v, netProfit: rev - cost,
  });
});
