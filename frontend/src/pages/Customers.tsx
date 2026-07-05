import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users2, Phone, Mail } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/lib/format';
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
import type { Customer } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function Customers() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canDelete = hasRole('administrator');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', debounced],
    queryFn: async () => (await api.get<Customer[]>('/customers', { params: { search: debounced } })).data,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openCreate = () => { setEditing(null); reset({ name: '', phone: '', email: '', address: '' }); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); reset({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '' }); setModalOpen(true); };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => (editing ? api.put(`/customers/${editing.id}`, data) : api.post('/customers', data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer disimpan'); setModalOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/customers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer dihapus'); setDeleteId(null); },
    onError: (e) => { toast.error(apiError(e)); setDeleteId(null); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Customer" description="Kelola data pelanggan" actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Customer</Button>} />

      <Card>
        <div className="border-b border-border p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari customer..." className="max-w-xs" />
        </div>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : customers.length === 0 ? (
          <EmptyState icon={<Users2 className="h-8 w-8" />} title="Belum ada customer" action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Customer</Button>} />
        ) : (
          <Table>
            <THead>
              <TR><TH>Customer</TH><TH>Kontak</TH><TH>Transaksi</TH><TH>Total Belanja</TH><TH className="text-right">Aksi</TH></TR>
            </THead>
            <TBody>
              {customers.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <p className="font-medium">{c.name}</p>
                    {c.address && <p className="max-w-[220px] truncate text-xs text-muted-foreground">{c.address}</p>}
                  </TD>
                  <TD>
                    <div className="space-y-0.5 text-xs">
                      {c.phone && c.phone !== '-' && <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" /> {c.phone}</p>}
                      {c.email && <p className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3 w-3" /> {c.email}</p>}
                    </div>
                  </TD>
                  <TD><Badge variant="muted">{c.transactionCount ?? 0}x</Badge></TD>
                  <TD className="font-medium">{formatCurrency(c.totalSpent ?? 0)}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      {canDelete && <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'Tambah Customer'}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSubmit((d) => saveMutation.mutate(d))} loading={saveMutation.isPending}>Simpan</Button></>}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <FormField label="Nama" error={errors.name?.message} required><Input {...register('name')} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Telepon"><Input {...register('phone')} /></FormField>
            <FormField label="Email" error={errors.email?.message}><Input type="email" {...register('email')} /></FormField>
          </div>
          <FormField label="Alamat"><Textarea {...register('address')} /></FormField>
        </form>
      </Modal>

      <ConfirmDialog open={deleteId !== null} message="Hapus customer ini?" loading={deleteMutation.isPending} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onClose={() => setDeleteId(null)} />
    </div>
  );
}
