import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserCog, ShieldCheck } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ConfirmDialog } from '@/components/ui/misc';
import type { User, AppRole } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().optional(),
  roleId: z.string().min(1, 'Role wajib dipilih'),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const roleBadge: Record<string, 'primary' | 'success' | 'warning'> = {
  administrator: 'primary', kasir: 'success', owner: 'warning',
};

export default function Users() {
  const qc = useQueryClient();
  const { user: current } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<User[]>('/users')).data });
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get<AppRole[]>('/users/roles')).data });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', email: '', password: '', roleId: roles[0] ? String(roles[0].id) : '', phone: '', isActive: true });
    setModalOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    reset({ name: u.name, email: u.email, password: '', roleId: String(u.roleId), phone: u.phone ?? '', isActive: u.isActive ?? true });
    setModalOpen(true);
  };

  const save = useMutation({
    mutationFn: async (d: FormData) => {
      const body = { ...d, roleId: Number(d.roleId) };
      return editing ? api.put(`/users/${editing.id}`, body) : api.post('/users', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User disimpan'); setModalOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User dihapus'); setDeleteId(null); },
    onError: (e) => { toast.error(apiError(e)); setDeleteId(null); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Manajemen User" description="Kelola pengguna dan hak akses" actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah User</Button>} />

      <Card>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : users.length === 0 ? (
          <EmptyState icon={<UserCog className="h-8 w-8" />} title="Belum ada user" />
        ) : (
          <Table>
            <THead>
              <TR><TH>User</TH><TH>Role</TH><TH>Status</TH><TH>Login Terakhir</TH><TH className="text-right">Aksi</TH></TR>
            </THead>
            <TBody>
              {users.map((u) => {
                const initials = u.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <TR key={u.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initials}</div>
                        <div>
                          <p className="font-medium">{u.name} {current?.id === u.id && <span className="text-xs text-muted-foreground">(Anda)</span>}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TD>
                    <TD><Badge variant={roleBadge[u.role] ?? 'muted'}><ShieldCheck className="mr-1 h-3 w-3" /> {u.role}</Badge></TD>
                    <TD><Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TD>
                    <TD className="text-muted-foreground">{u.lastLogin ? formatDate(u.lastLogin, 'dd MMM yyyy, HH:mm') : 'Belum pernah'}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                        {current?.id !== u.id && <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Tambah User'}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSubmit((d) => save.mutate(d))} loading={save.isPending}>Simpan</Button></>}>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <FormField label="Nama Lengkap" error={errors.name?.message} required><Input {...register('name')} /></FormField>
          <FormField label="Email" error={errors.email?.message} required><Input type="email" {...register('email')} /></FormField>
          <FormField label={editing ? 'Password (kosongkan jika tidak diubah)' : 'Password'} error={errors.password?.message} required={!editing}>
            <Input type="password" placeholder="••••••••" {...register('password')} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role" error={errors.roleId?.message} required>
              <Select {...register('roleId')}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Telepon"><Input {...register('phone')} /></FormField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4 rounded border-border" />
            Akun aktif
          </label>
        </form>
      </Modal>

      <ConfirmDialog open={deleteId !== null} message="Hapus user ini?" loading={del.isPending} onConfirm={() => deleteId && del.mutate(deleteId)} onClose={() => setDeleteId(null)} />
    </div>
  );
}
