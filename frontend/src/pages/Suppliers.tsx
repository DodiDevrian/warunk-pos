import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Truck, Phone, Mail } from 'lucide-react';
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
import type { Supplier } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function Suppliers() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole('administrator');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', debounced],
    queryFn: async () => (await api.get<Supplier[]>('/suppliers', { params: { search: debounced } })).data,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openCreate = () => { setEditing(null); reset({ name: '', contactPerson: '', phone: '', email: '', address: '' }); setModalOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    reset({ name: s.name, contactPerson: s.contactPerson ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '' });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => (editing ? api.put(`/suppliers/${editing.id}`, data) : api.post('/suppliers', data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier disimpan'); setModalOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier dihapus'); setDeleteId(null); },
    onError: (e) => { toast.error(apiError(e)); setDeleteId(null); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Supplier" description="Kelola data pemasok barang" actions={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Supplier</Button>} />

      <Card>
        <div className="border-b border-border p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari supplier..." className="max-w-xs" />
        </div>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : suppliers.length === 0 ? (
          <EmptyState icon={<Truck className="h-8 w-8" />} title="Belum ada supplier" action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Supplier</Button>} />
        ) : (
          <Table>
            <THead>
              <TR><TH>Supplier</TH><TH>Kontak</TH><TH>Alamat</TH><TH>Pembelian</TH>{canManage && <TH className="text-right">Aksi</TH>}</TR>
            </THead>
            <TBody>
              {suppliers.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <p className="font-medium">{s.name}</p>
                    {s.contactPerson && <p className="text-xs text-muted-foreground">{s.contactPerson}</p>}
                  </TD>
                  <TD>
                    <div className="space-y-0.5 text-xs">
                      {s.phone && <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" /> {s.phone}</p>}
                      {s.email && <p className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3 w-3" /> {s.email}</p>}
                    </div>
                  </TD>
                  <TD className="max-w-[200px] truncate text-muted-foreground">{s.address || '-'}</TD>
                  <TD><Badge variant="muted">{s.purchaseCount ?? 0}x</Badge></TD>
                  {canManage && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Supplier' : 'Tambah Supplier'}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSubmit((d) => saveMutation.mutate(d))} loading={saveMutation.isPending}>Simpan</Button></>}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <FormField label="Nama Supplier" error={errors.name?.message} required><Input {...register('name')} /></FormField>
          <FormField label="Nama Kontak"><Input {...register('contactPerson')} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Telepon"><Input {...register('phone')} /></FormField>
            <FormField label="Email" error={errors.email?.message}><Input type="email" {...register('email')} /></FormField>
          </div>
          <FormField label="Alamat"><Textarea {...register('address')} /></FormField>
        </form>
      </Modal>

      <ConfirmDialog open={deleteId !== null} message="Hapus supplier ini?" loading={deleteMutation.isPending} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onClose={() => setDeleteId(null)} />
    </div>
  );
}
