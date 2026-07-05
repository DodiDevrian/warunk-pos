import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Boxes, ArrowDownToLine, ArrowUpFromLine, ClipboardList, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, Select, Textarea } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/misc';
import type { Product, StockMovement } from '@/types';

const typeConfig: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'primary'; icon: typeof ArrowDownToLine }> = {
  in: { label: 'Masuk', variant: 'success', icon: ArrowDownToLine },
  out: { label: 'Keluar', variant: 'danger', icon: ArrowUpFromLine },
  opname: { label: 'Opname', variant: 'primary', icon: ClipboardList },
  adjustment: { label: 'Penyesuaian', variant: 'warning', icon: SlidersHorizontal },
};

export default function Inventory() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', type: 'in', quantity: '', note: '' });

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['movements', filter],
    queryFn: async () => (await api.get<StockMovement[]>('/inventory/movements', { params: { type: filter || undefined } })).data,
  });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: async () => (await api.get<Product[]>('/products')).data });
  const { data: lowStock = [] } = useQuery({ queryKey: ['low-stock'], queryFn: async () => (await api.get<Product[]>('/inventory/low-stock')).data });

  const adjust = useMutation({
    mutationFn: async () =>
      api.post('/inventory/adjust', {
        productId: Number(form.productId),
        type: form.type,
        quantity: Number(form.quantity),
        note: form.note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      toast.success('Stok berhasil diperbarui');
      setModalOpen(false);
      setForm({ productId: '', type: 'in', quantity: '', note: '' });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const selectedProduct = products.find((p) => p.id === Number(form.productId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Kelola pergerakan stok: masuk, keluar, opname & penyesuaian"
        actions={<Button onClick={() => setModalOpen(true)}><SlidersHorizontal className="h-4 w-4" /> Penyesuaian Stok</Button>}
      />

      {lowStock.length > 0 && (
        <Card className="border-danger/30 bg-danger/5">
          <CardHeader className="flex-row items-center gap-2 pb-2">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <CardTitle className="text-danger">Stok Hampir Habis ({lowStock.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((p) => (
                <Badge key={p.id} variant="danger">{p.name}: {p.stock} {p.unit ?? 'pcs'}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-[200px]">
            <option value="">Semua Tipe</option>
            <option value="in">Stok Masuk</option>
            <option value="out">Stok Keluar</option>
            <option value="opname">Stok Opname</option>
            <option value="adjustment">Penyesuaian</option>
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : movements.length === 0 ? (
          <EmptyState icon={<Boxes className="h-8 w-8" />} title="Belum ada pergerakan stok" />
        ) : (
          <Table>
            <THead>
              <TR><TH>Tanggal</TH><TH>Produk</TH><TH>Tipe</TH><TH>Qty</TH><TH>Stok Akhir</TH><TH>Referensi</TH></TR>
            </THead>
            <TBody>
              {movements.map((m) => {
                const cfg = typeConfig[m.type] ?? typeConfig.adjustment;
                return (
                  <TR key={m.id}>
                    <TD className="text-muted-foreground">{formatDateTime(m.createdAt)}</TD>
                    <TD className="font-medium">{m.productName}</TD>
                    <TD><Badge variant={cfg.variant}><cfg.icon className="mr-1 h-3 w-3" /> {cfg.label}</Badge></TD>
                    <TD className={m.type === 'out' ? 'text-danger' : 'text-success'}>
                      {m.type === 'out' ? '-' : '+'}{Math.abs(m.quantity)}
                    </TD>
                    <TD>{m.stockBefore} → <span className="font-medium">{m.stockAfter}</span></TD>
                    <TD className="text-muted-foreground">{m.reference || m.note || '-'}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Penyesuaian Stok"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={() => adjust.mutate()} loading={adjust.isPending} disabled={!form.productId || !form.quantity}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Produk" required>
            <Select value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
              <option value="">Pilih produk...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stok: {p.stock})</option>)}
            </Select>
          </FormField>
          <FormField label="Tipe Penyesuaian" required>
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="in">Stok Masuk (tambah)</option>
              <option value="out">Stok Keluar (kurang)</option>
              <option value="opname">Stok Opname (set jumlah aktual)</option>
              <option value="adjustment">Penyesuaian (+/-)</option>
            </Select>
          </FormField>
          <FormField label={form.type === 'opname' ? 'Jumlah Stok Aktual' : 'Jumlah'} required>
            <Input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            {selectedProduct && form.type === 'opname' && (
              <p className="mt-1 text-xs text-muted-foreground">Stok tercatat saat ini: {selectedProduct.stock}</p>
            )}
          </FormField>
          <FormField label="Catatan">
            <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Alasan penyesuaian..." />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
