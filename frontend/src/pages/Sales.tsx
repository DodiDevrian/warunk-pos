import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Eye, Printer, Wallet, CreditCard, QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime, todayISO, daysAgoISO } from '@/lib/format';
import { printInvoice } from '@/lib/printInvoice';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { SearchInput } from '@/components/ui/search-input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState, Spinner } from '@/components/ui/misc';
import { useDebounce } from '@/hooks/useDebounce';
import type { Sale, Settings } from '@/types';

const payIcons = { cash: Wallet, transfer: CreditCard, qris: QrCode } as const;
const payLabels = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' } as const;

export default function Sales() {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', debounced, startDate, endDate, paymentMethod],
    queryFn: async () => (await api.get<Sale[]>('/sales', { params: { search: debounced, startDate, endDate, paymentMethod: paymentMethod || undefined } })).data,
  });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<Settings>('/settings')).data });
  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['sale', detailId],
    queryFn: async () => (await api.get<Sale>(`/sales/${detailId}`)).data,
    enabled: detailId !== null,
  });

  const totalOmzet = sales.reduce((s, x) => s + x.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Riwayat Penjualan" description="Semua transaksi penjualan" />

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari no. invoice..." />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="">Semua Pembayaran</option>
            <option value="cash">Tunai</option>
            <option value="transfer">Transfer</option>
            <option value="qris">QRIS</option>
          </Select>
          <div className="flex items-center justify-end rounded-lg bg-muted/60 px-3 text-sm">
            <span className="text-muted-foreground">Total:&nbsp;</span>
            <span className="font-semibold">{formatCurrency(totalOmzet)}</span>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : sales.length === 0 ? (
          <EmptyState icon={<Receipt className="h-8 w-8" />} title="Belum ada transaksi" description="Tidak ada transaksi pada rentang tanggal ini." />
        ) : (
          <Table>
            <THead>
              <TR><TH>No. Invoice</TH><TH>Tanggal</TH><TH>Kasir</TH><TH>Pembayaran</TH><TH>Item</TH><TH>Total</TH><TH className="text-right">Aksi</TH></TR>
            </THead>
            <TBody>
              {sales.map((s) => {
                const Icon = payIcons[s.paymentMethod];
                return (
                  <TR key={s.id}>
                    <TD className="font-medium">{s.invoiceNo}</TD>
                    <TD className="text-muted-foreground">{formatDateTime(s.createdAt)}</TD>
                    <TD>{s.cashierName ?? '-'}</TD>
                    <TD><Badge variant="muted"><Icon className="mr-1 h-3 w-3" /> {payLabels[s.paymentMethod]}</Badge></TD>
                    <TD>{s.itemCount ?? 0}</TD>
                    <TD className="font-semibold">{formatCurrency(s.total)}</TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetailId(s.id)}><Eye className="h-4 w-4" /> Detail</Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title="Detail Transaksi"
        footer={detail && <Button onClick={() => printInvoice(detail, settings)}><Printer className="h-4 w-4" /> Cetak Struk</Button>}
      >
        {loadingDetail || !detail ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-muted-foreground">No. Invoice</p><p className="font-medium">{detail.invoiceNo}</p></div>
              <div><p className="text-muted-foreground">Tanggal</p><p className="font-medium">{formatDateTime(detail.createdAt)}</p></div>
              <div><p className="text-muted-foreground">Kasir</p><p className="font-medium">{detail.cashierName ?? '-'}</p></div>
              <div><p className="text-muted-foreground">Pelanggan</p><p className="font-medium">{detail.customerName ?? 'Umum'}</p></div>
            </div>

            <div className="rounded-lg border border-border">
              <Table>
                <THead><TR><TH>Produk</TH><TH>Qty</TH><TH>Harga</TH><TH className="text-right">Subtotal</TH></TR></THead>
                <TBody>
                  {detail.items?.map((it) => (
                    <TR key={it.id}>
                      <TD className="font-medium">{it.productName}</TD>
                      <TD>{it.quantity}</TD>
                      <TD>{formatCurrency(it.price)}</TD>
                      <TD className="text-right">{formatCurrency(it.subtotal)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(detail.subtotal)}</span></div>
              {detail.discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Diskon</span><span>-{formatCurrency(detail.discount)}</span></div>}
              {detail.tax > 0 && <div className="flex justify-between text-muted-foreground"><span>Pajak</span><span>{formatCurrency(detail.tax)}</span></div>}
              <div className="flex justify-between border-t border-border pt-1 text-base font-bold"><span>Total</span><span>{formatCurrency(detail.total)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Bayar ({payLabels[detail.paymentMethod]})</span><span>{formatCurrency(detail.paid)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Kembali</span><span>{formatCurrency(detail.change)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
