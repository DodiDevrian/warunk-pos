import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Printer, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, todayISO, daysAgoISO } from '@/lib/format';
import { exportToCSV, printReport } from '@/lib/export';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { StatCard } from '@/components/StatCard';
import { Spinner, EmptyState } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

type Tab = 'sales' | 'purchases' | 'products' | 'stock' | 'customers' | 'suppliers' | 'profit-loss';

const TABS: { id: Tab; label: string }[] = [
  { id: 'sales', label: 'Penjualan' },
  { id: 'purchases', label: 'Pembelian' },
  { id: 'products', label: 'Produk' },
  { id: 'stock', label: 'Stok' },
  { id: 'customers', label: 'Customer' },
  { id: 'suppliers', label: 'Supplier' },
  { id: 'profit-loss', label: 'Laba Rugi' },
];

export default function Reports() {
  const [tab, setTab] = useState<Tab>('sales');
  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO());

  const usesDate = ['sales', 'purchases', 'profit-loss'].includes(tab);
  const { data, isLoading } = useQuery({
    queryKey: ['report', tab, usesDate ? startDate : '', usesDate ? endDate : ''],
    queryFn: async () => (await api.get(`/reports/${tab}`, { params: usesDate ? { startDate, endDate } : {} })).data,
  });

  const handleExport = () => {
    const rows = (data?.rows as Record<string, unknown>[]) ?? [];
    if (!rows.length) return;
    exportToCSV(`laporan-${tab}-${todayISO()}`, rows);
  };
  const handlePrint = () => {
    const rows = (data?.rows as Record<string, unknown>[]) ?? [];
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const html = `<table><thead><tr>${keys.map((k) => `<th>${k}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${keys.map((k) => `<td>${r[k] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    printReport(`Laporan ${TABS.find((t) => t.id === tab)?.label}`, html);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description="Analisis performa bisnis Anda"
        actions={
          tab !== 'profit-loss' && (
            <>
              <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4" /> Cetak</Button>
              <Button onClick={handleExport}><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
            </>
          )
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {usesDate && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div>
              <label className="text-xs text-muted-foreground">Dari Tanggal</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Sampai Tanggal</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><Spinner /></Card>
      ) : tab === 'profit-loss' ? (
        <ProfitLoss data={data} />
      ) : (
        <ReportTable tab={tab} data={data} />
      )}
    </div>
  );
}

function ProfitLoss({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendapatan" value={formatCurrency(data.revenue)} icon={DollarSign} tone="primary" />
        <StatCard label="HPP (Modal)" value={formatCurrency(data.cogs)} icon={TrendingDown} tone="warning" />
        <StatCard label="Laba Kotor" value={formatCurrency(data.grossProfit)} icon={TrendingUp} tone="success" />
        <StatCard label="Pajak Terkumpul" value={formatCurrency(data.tax)} icon={Percent} tone="danger" />
      </div>
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Ringkasan Laba Rugi</h3>
          <div className="space-y-3">
            <Row label="Total Pendapatan (Penjualan)" value={data.revenue} />
            <Row label="Harga Pokok Penjualan (HPP)" value={-data.cogs} />
            <div className="border-t border-border" />
            <Row label="Laba Kotor" value={data.grossProfit} bold />
            <div className="border-t border-border" />
            <Row label="Laba Bersih" value={data.netProfit} bold highlight />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: number; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={cn('flex justify-between', bold && 'font-bold', highlight && 'text-lg text-primary')}>
      <span>{label}</span>
      <span className={value < 0 ? 'text-danger' : ''}>{formatCurrency(value)}</span>
    </div>
  );
}

const columnMap: Record<string, { key: string; label: string; money?: boolean; date?: boolean }[]> = {
  sales: [
    { key: 'invoiceNo', label: 'No. Invoice' }, { key: 'date', label: 'Tanggal', date: true },
    { key: 'customer', label: 'Customer' }, { key: 'cashier', label: 'Kasir' },
    { key: 'paymentMethod', label: 'Bayar' }, { key: 'total', label: 'Total', money: true },
  ],
  purchases: [
    { key: 'invoiceNo', label: 'No. PO' }, { key: 'date', label: 'Tanggal', date: true },
    { key: 'supplier', label: 'Supplier' }, { key: 'total', label: 'Total', money: true }, { key: 'status', label: 'Status' },
  ],
  products: [
    { key: 'name', label: 'Produk' }, { key: 'sku', label: 'SKU' }, { key: 'category', label: 'Kategori' },
    { key: 'stock', label: 'Stok' }, { key: 'sold', label: 'Terjual' }, { key: 'sellPrice', label: 'Harga', money: true },
  ],
  stock: [
    { key: 'name', label: 'Produk' }, { key: 'sku', label: 'SKU' }, { key: 'stock', label: 'Stok' },
    { key: 'minStock', label: 'Min' }, { key: 'stockValue', label: 'Nilai Stok', money: true }, { key: 'status', label: 'Status' },
  ],
  customers: [
    { key: 'name', label: 'Customer' }, { key: 'phone', label: 'Telepon' },
    { key: 'transactions', label: 'Transaksi' }, { key: 'totalSpent', label: 'Total Belanja', money: true },
  ],
  suppliers: [
    { key: 'name', label: 'Supplier' }, { key: 'phone', label: 'Telepon' },
    { key: 'purchases', label: 'Pembelian' }, { key: 'totalPurchased', label: 'Total', money: true },
  ],
};

function ReportTable({ tab, data }: { tab: string; data: any }) {
  const cols = columnMap[tab] ?? [];
  const rows: any[] = data?.rows ?? [];
  const summary = data?.summary;

  return (
    <Card>
      {summary && (
        <div className="flex flex-wrap gap-6 border-b border-border p-4 text-sm">
          {'count' in summary && <div><span className="text-muted-foreground">Jumlah: </span><span className="font-semibold">{summary.count}</span></div>}
          {'total' in summary && <div><span className="text-muted-foreground">Total: </span><span className="font-semibold">{formatCurrency(summary.total)}</span></div>}
          {'profit' in summary && <div><span className="text-muted-foreground">Laba: </span><span className="font-semibold text-success">{formatCurrency(summary.profit)}</span></div>}
          {'totalValue' in summary && <div><span className="text-muted-foreground">Nilai Stok: </span><span className="font-semibold">{formatCurrency(summary.totalValue)}</span></div>}
          {'lowCount' in summary && <div><span className="text-muted-foreground">Stok Rendah: </span><span className="font-semibold text-danger">{summary.lowCount}</span></div>}
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={<FileSpreadsheet className="h-8 w-8" />} title="Tidak ada data" description="Tidak ada data untuk parameter ini." />
      ) : (
        <Table>
          <THead><TR>{cols.map((c) => <TH key={c.key}>{c.label}</TH>)}</TR></THead>
          <TBody>
            {rows.map((r, i) => (
              <TR key={i}>
                {cols.map((c) => (
                  <TD key={c.key} className={c.money ? 'font-medium' : ''}>
                    {c.money ? formatCurrency(r[c.key]) : c.date ? formatDate(r[c.key], 'dd MMM yyyy') : (r[c.key] ?? '-')}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
