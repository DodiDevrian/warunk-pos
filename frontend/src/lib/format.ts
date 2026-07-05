import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatCurrency(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID').format(Number(value ?? 0));
}

function toDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  // SQLite timestamps come as "YYYY-MM-DD HH:mm:ss" (UTC)
  const normalized = date.includes('T') ? date : date.replace(' ', 'T') + 'Z';
  try {
    return parseISO(normalized);
  } catch {
    return new Date(date);
  }
}

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy'): string {
  if (!date) return '-';
  return format(toDate(date), pattern);
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '-';
  return format(toDate(date), 'dd MMM yyyy, HH:mm');
}

export function formatRelative(date: string | Date): string {
  if (!date) return '-';
  return formatDistanceToNow(toDate(date), { addSuffix: true });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
