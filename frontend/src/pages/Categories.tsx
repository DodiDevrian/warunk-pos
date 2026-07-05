import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, Textarea } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { SearchInput } from '@/components/ui/search-input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ConfirmDialog } from '@/components/ui/misc';
import type { Category } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  description: z.string().optional(),
  color: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const COLORS = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

export default function Categories() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole('administrator');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', debounced],
    queryFn: async () => (await api.get<Category[]>('/categories', { params: { search: debounced } })).data,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const selectedColor = watch('color') || COLORS[0];

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '', color: COLORS[0] });
    setModalOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    reset({ name: c.name, description: c.description ?? '', color: c.color ?? COLORS[0] });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (editing) return api.put(`/categories/${editing.id}`, data);
      return api.post('/categories', data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success(editing ? 'Kategori diperbarui' : 'Kategori ditambahkan');
      setModalOpen(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategori dihapus');
      setDeleteId(null);
    },
    onError: (e) => { toast.error(apiError(e)); setDeleteId(null); },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategori"
        description="Kelola kategori produk toko Anda"
        actions={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Kategori</Button>}
      />

      <Card>
        <div className="border-b border-border p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari kategori..." className="max-w-xs" />
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<Tags className="h-8 w-8" />}
            title="Belum ada kategori"
            description="Tambahkan kategori pertama untuk mengelompokkan produk."
            action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Kategori</Button>}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH>Deskripsi</TH>
                <TH>Jumlah Produk</TH>
                {canManage && <TH className="text-right">Aksi</TH>}
              </TR>
            </THead>
            <TBody>
              {categories.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full" style={{ background: c.color ?? '#2563EB' }} />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">{c.description || '-'}</TD>
                  <TD><Badge variant="muted">{c.productCount ?? 0} produk</Badge></TD>
                  {canManage && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>
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
        title={editing ? 'Edit Kategori' : 'Tambah Kategori'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit((d) => saveMutation.mutate(d))} loading={saveMutation.isPending || isSubmitting}>
              Simpan
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <FormField label="Nama Kategori" error={errors.name?.message} required>
            <Input placeholder="cth. Minuman" {...register('name')} />
          </FormField>
          <FormField label="Deskripsi" error={errors.description?.message}>
            <Textarea placeholder="Deskripsi singkat..." {...register('description')} />
          </FormField>
          <FormField label="Warna Label">
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className="h-8 w-8 rounded-full ring-offset-2 ring-offset-card transition-all"
                  style={{ background: c, boxShadow: selectedColor === c ? `0 0 0 2px ${c}` : undefined }}
                />
              ))}
            </div>
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        message="Hapus kategori ini? Kategori yang masih dipakai produk tidak dapat dihapus."
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
