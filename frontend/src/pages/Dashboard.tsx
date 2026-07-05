import { useQuery } from '@tanstack/react-query';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  DollarSign, TrendingUp, ShoppingBag, AlertTriangle, Package, Receipt, Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate, formatRelative } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import type { DashboardStats } from '@/types';

interface ChartPoint { day: string; total: number; revenue: number; count: number }
interface TopProduct { name: string; qty: number; revenue: number }
interface Payment { method: string; total: number; count: number }
interface ActivityLog { id: number; action: string; description: string; userName: string; createdAt: string }

const PAYMENT_COLORS: Record<string, string> = { cash: '#22C55E', transfer: '#2563EB', qris: '#F59E0B' };
const PAYMENT_LABELS: Record<string, string> = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{label ? formatDate(label) : payload[0]?.name}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-medium">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => (await api.get<DashboardStats>('/dashboard/stats')).data,
  });
  const { data: chart = [] } = useQuery({
    queryKey: ['dashboard', 'sales-chart'],
    queryFn: async () => (await api.get<ChartPoint[]>('/dashboard/sales-chart')).data,
  });
  const { data: topProducts = [] } = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: async () => (await api.get<TopProduct[]>('/dashboard/top-products')).data,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ['dashboard', 'payments'],
    queryFn: async () => (await api.get<Payment[]>('/dashboard/payment-breakdown')).data,
  });
  const { data: activity = [] } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: async () => (await api.get<ActivityLog[]>('/dashboard/recent-activity')).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Ringkasan performa bisnis Anda secara realtime" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Penjualan" value={formatCurrency(stats?.totalSales ?? 0)} icon={DollarSign} tone="primary" hint={`${formatNumber(stats?.totalTransactions ?? 0)} transaksi`} loading={isLoading} />
        <StatCard label="Total Pendapatan" value={formatCurrency(stats?.totalRevenue ?? 0)} icon={TrendingUp} tone="success" hint="Setelah pajak" loading={isLoading} />
        <StatCard label="Produk Terjual" value={formatNumber(stats?.productsSold ?? 0)} icon={ShoppingBag} tone="warning" hint={`${formatNumber(stats?.productCount ?? 0)} produk aktif`} loading={isLoading} />
        <StatCard label="Stok Hampir Habis" value={formatNumber(stats?.lowStockCount ?? 0)} icon={AlertTriangle} tone="danger" hint="Perlu restock" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Grafik Penjualan</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">14 hari terakhir</p>
            </div>
            <Badge variant="primary">Penjualan & Pendapatan</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chart} margin={{ left: -12, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="day" tickFormatter={(d) => formatDate(d, 'dd/MM')} tick={{ fontSize: 11 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="total" name="Penjualan" stroke="#2563EB" strokeWidth={2} fill="url(#gSales)" />
                <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="#22C55E" strokeWidth={2} fill="url(#gRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Distribusi transaksi</p>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <EmptyState title="Belum ada data" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={payments} dataKey="total" nameKey="method" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                      {payments.map((p) => (
                        <Cell key={p.method} fill={PAYMENT_COLORS[p.method] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-2">
                  {payments.map((p) => (
                    <div key={p.method} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_COLORS[p.method] }} />
                        {PAYMENT_LABELS[p.method] ?? p.method}
                      </span>
                      <span className="font-medium">{formatCurrency(p.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Produk Terlaris</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Top 5 berdasarkan kuantitas terjual</p>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <EmptyState icon={<Package className="h-8 w-8" />} title="Belum ada penjualan" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={({ active, payload }: any) =>
                      active && payload?.length ? (
                        <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-lg">
                          <p className="font-semibold">{payload[0].payload.name}</p>
                          <p className="text-muted-foreground">Terjual: {formatNumber(payload[0].payload.qty)} pcs</p>
                          <p className="text-muted-foreground">Omzet: {formatCurrency(payload[0].payload.revenue)}</p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="qty" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState icon={<Receipt className="h-8 w-8" />} title="Belum ada aktivitas" />
            ) : (
              <div className="space-y-4">
                {activity.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize">{a.action}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {a.userName ?? 'Sistem'} · {formatRelative(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
