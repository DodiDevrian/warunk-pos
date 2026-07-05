import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, ShoppingBag, Trash2, Eye } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState, Spinner } from '@/components/ui/misc';
import type { Product, Supplier, Purchase } from '@/types';

interface Line { productId: number; name: string; quantity: number; costPrice: number }

export default function Purchases() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole('administrator');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [pickProduct, setPickProduct] = useState('');

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => (await api.get<Purchase[]>('/purchases')).data,
  });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: async () => (await api.get<Product[]>('/products')).data });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data });
  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['purchase', detailId],
    queryFn: async () => (await api.get<Purchase>(`/purchases/${detailId}`)).data,
    enabled: detailId !== null,
  });

  const total = useMemo(() => lines.reduce((s, l) => s + l.costPrice * l.quantity, 0), [lines]);

  const addLine = () => {
    const p = products.find((x) => x.id === Number(pickProduct));
    if (!p) return;
    if (lines.some((l) => l.productId === p.id)) { toast.error('Produk sudah ditambahkan'); return; }
    setLines((prev) => [...prev, { productId: p.id, name: p.name, quantity: 1, costPrice: p.costPrice }]);
    setPickProduct('');
  };
  const updateLine = (id: number, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, ...patch } : l)));
  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l.productId !== id));

  const create = useMutation({
    mutationFn: async () =>
      api.post('/purchases', {
        supplierId: supplierId || undefined,
        status: 'received',
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, costPrice: l.costPrice })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Pembelian berhasil dicatat & stok bertambah');
      setModalOpen(false);
      setLines([]); setSupplierId('');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembelian"
        description="Purchase order & penerimaan barang dari supplier"
        actions={canManage && <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Buat Pembelian</Button>}
      />

      <Card>
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : purchases.length === 0 ? (
          <EmptyState icon={<ShoppingBag className="h-8 w-8" />} title="Belum ada pembelian" action={canManage && <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Buat Pembelian</Button>} />
        ) : (
          <Table>
            <THead>
              <TR><TH>No. PO</TH><TH>Tanggal</TH><TH>Supplier</TH><TH>Status</TH><TH>Total</TH><TH className="text-right">Aksi</TH></TR>
            </THead>
            <TBody>
              {purchases.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.invoiceNo}</TD>
                  <TD className="text-muted-foreground">{formatDateTime(p.createdAt)}</TD>
                  <TD>{p.supplierName ?? '-'}</TD>
                  <TD><Badge variant={p.status === 'received' ? 'success' : 'warning'}>{p.status === 'received' ? 'Diterima' : 'Pending'}</Badge></TD>
                  <TD className="font-semibold">{formatCurrency(p.total)}</TD>
                  <TD className="text-right"><Button variant="ghost" size="sm" onClick={() => setDetailId(p.id)}><Eye className="h-4 w-4" /> Detail</Button></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Create purchase modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buat Pembelian"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!lines.length}>
              Simpan · {formatCurrency(total)}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Supplier">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Pilih supplier...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormField>

          <div className="flex gap-2">
            <Select value={pickProduct} onChange={(e) => setPickProduct(e.target.value)}>
              <option value="">Tambah produk...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Button variant="outline" onClick={addLine} disabled={!pickProduct}><Plus className="h-4 w-4" /></Button>
          </div>

          {lines.length > 0 && (
            <div className="rounded-lg border border-border">
              <Table>
                <THead><TR><TH>Produk</TH><TH>Qty</TH><TH>Harga Modal</TH><TH>Subtotal</TH><TH></TH></TR></THead>
                <TBody>
                  {lines.map((l) => (
                    <TR key={l.productId}>
                      <TD className="font-medium">{l.name}</TD>
                      <TD><Input type="number" min={1} value={l.quantity} onChange={(e) => updateLine(l.productId, { quantity: Number(e.target.value) || 1 })} className="h-8 w-20" /></TD>
                      <TD><Input type="number" min={0} value={l.costPrice} onChange={(e) => updateLine(l.productId, { costPrice: Number(e.target.value) || 0 })} className="h-8 w-28" /></TD>
                      <TD>{formatCurrency(l.costPrice * l.quantity)}</TD>
                      <TD><button onClick={() => removeLine(l.productId)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></button></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}

          <div className="flex justify-between rounded-lg bg-muted/60 p-3 text-base font-bold">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={detailId !== null} onClose={() => setDetailId(null)} title="Detail Pembelian">
        {loadingDetail || !detail ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-muted-foreground">No. PO</p><p className="font-medium">{detail.invoiceNo}</p></div>
              <div><p className="text-muted-foreground">Supplier</p><p className="font-medium">{detail.supplierName ?? '-'}</p></div>
              <div><p className="text-muted-foreground">Tanggal</p><p className="font-medium">{formatDateTime(detail.createdAt)}</p></div>
              <div><p className="text-muted-foreground">Status</p><Badge variant={detail.status === 'received' ? 'success' : 'warning'}>{detail.status}</Badge></div>
            </div>
            <div className="rounded-lg border border-border">
              <Table>
                <THead><TR><TH>Produk</TH><TH>Qty</TH><TH>Harga</TH><TH className="text-right">Subtotal</TH></TR></THead>
                <TBody>
                  {detail.items?.map((it, i) => (
                    <TR key={i}>
                      <TD className="font-medium">{it.productName}</TD>
                      <TD>{it.quantity}</TD>
                      <TD>{formatCurrency(it.costPrice)}</TD>
                      <TD className="text-right">{formatCurrency(it.subtotal)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span>{formatCurrency(detail.total)}</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
