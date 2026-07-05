import { db } from '../database/db.js';
import { activityLogs } from '../database/schema.js';

/** Generate an invoice number, e.g. INV-20240705-0001 */
export function generateInvoiceNo(prefix: string, seq: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${prefix}-${y}${m}${d}-${String(seq).padStart(4, '0')}`;
}

export async function logActivity(userId: number | null, action: string, description?: string) {
  try {
    await db.insert(activityLogs).values({ userId: userId ?? undefined, action, description });
  } catch {
    /* logging must never break the request */
  }
}
