import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, ImageIcon } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, Select, Textarea } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { SearchInput } from '@/components/ui/search-input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ConfirmDialog } from '@/components/ui/misc';
import type { Product, Category } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  sku: z.string().min(1, 'SKU wajib diisi'),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.coerce.number().min(0),
  sellPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).max(100).default(0),
  tax: z.coerce.number().min(0).max(100).default(0),
  stock: z.coerce.number().int().min(0),
  minStock: z.coerce.number().int().min(0),
  unit: z.string().optional(),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function Products() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole('administrator');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const debounced = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', debounced, categoryId],
    queryFn: async () => (await api.get<Product[]>('/products', { params: { search: debounced, categoryId: categoryId || undefined } })).data,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditing(null);
    setImageFile(null);
    reset({ name: '', sku: `SKU-${Date.now().toString().slice(-6)}`, barcode: '', categoryId: '', costPrice: 0, sellPrice: 0, discount: 0, tax: 0, stock: 0, minStock: 5, unit: 'pcs', description: '' });
    setModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setImageFile(null);
    reset({
      name: p.name, sku: p.sku, barcode: p.barcode ?? '', categoryId: p.categoryId ? String(p.categoryId) : '',
      costPrice: p.costPrice, sellPrice: p.sellPrice, discount: p.discount, tax: p.tax,
      stock: p.stock, minStock: p.minStock, unit: p.unit ?? 'pcs', description: p.description ?? '',
    });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => fd.append(k, v == null ? '' : String(v)));
      if (imageFile) fd.append('image', imageFile);
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editing) return api.put(`/products/${editing.id}`, fd, config);
      return api.post('/products', fd, config);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(editing ? 'Produk diperbarui' : 'Produk ditambahkan');
      setModalOpen(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk dinonaktifkan');
      setDeleteId(null);
    },
    onError: (e) => { toast.error(apiError(e)); setDeleteId(null); },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        description="Kelola daftar produk, harga, dan stok"
        actions={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Produk</Button>}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama / SKU / barcode..." className="sm:max-w-xs" />
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="sm:max-w-[200px]">
            <option value="">Semua Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : products.length === 0 ? (
          <EmptyState icon={<Package className="h-8 w-8" />} title="Belum ada produk" description="Tambahkan produk untuk mulai berjualan." action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Produk</Button>} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Produk</TH>
                <TH>Kategori</TH>
                <TH>Harga Modal</TH>
                <TH>Harga Jual</TH>
                <TH>Stok</TH>
                {canManage && <TH className="text-right">Aksi</TH>}
              </TR>
            </THead>
            <TBody>
              {products.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}{p.barcode ? ` · ${p.barcode}` : ''}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>{p.categoryName ? <Badge variant="muted">{p.categoryName}</Badge> : <span className="text-muted-foreground">-</span>}</TD>
                  <TD className="text-muted-foreground">{formatCurrency(p.costPrice)}</TD>
                  <TD className="font-medium">{formatCurrency(p.sellPrice)}</TD>
                  <TD>
                    <Badge variant={p.stock <= p.minStock ? 'danger' : 'success'}>
                      {p.stock} {p.unit ?? 'pcs'}
                    </Badge>
                  </TD>
                  {canManage && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Produk' : 'Tambah Produk'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit((d) => saveMutation.mutate(d))} loading={saveMutation.isPending}>Simpan</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nama Produk" error={errors.name?.message} required className="sm:col-span-2">
            <Input {...register('name')} />
          </FormField>
          <FormField label="SKU" error={errors.sku?.message} required>
            <Input {...register('sku')} />
          </FormField>
          <FormField label="Barcode" error={errors.barcode?.message}>
            <Input {...register('barcode')} />
          </FormField>
          <FormField label="Kategori">
            <Select {...register('categoryId')}>
              <option value="">Tanpa kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Satuan">
            <Input placeholder="pcs" {...register('unit')} />
          </FormField>
          <FormField label="Harga Modal" error={errors.costPrice?.message} required>
            <Input type="number" min={0} {...register('costPrice')} />
          </FormField>
          <FormField label="Harga Jual" error={errors.sellPrice?.message} required>
            <Input type="number" min={0} {...register('sellPrice')} />
          </FormField>
          <FormField label="Diskon (%)" error={errors.discount?.message}>
            <Input type="number" min={0} max={100} {...register('discount')} />
          </FormField>
          <FormField label="Pajak (%)" error={errors.tax?.message}>
            <Input type="number" min={0} max={100} {...register('tax')} />
          </FormField>
          <FormField label="Stok" error={errors.stock?.message} required>
            <Input type="number" min={0} disabled={!!editing} {...register('stock')} />
          </FormField>
          <FormField label="Stok Minimum" error={errors.minStock?.message} required>
            <Input type="number" min={0} {...register('minStock')} />
          </FormField>
          <FormField label="Foto Produk" className="sm:col-span-2">
            <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs" />
          </FormField>
          <FormField label="Deskripsi" className="sm:col-span-2">
            <Textarea {...register('description')} />
          </FormField>
          {editing && <p className="text-xs text-muted-foreground sm:col-span-2">Stok tidak dapat diubah di sini. Gunakan menu Inventory untuk penyesuaian stok.</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        message="Nonaktifkan produk ini? Produk tidak akan muncul di kasir."
        confirmLabel="Nonaktifkan"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
