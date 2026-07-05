import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Save, KeyRound, ImageIcon, Mail, Phone, ShieldCheck } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Wajib diisi'),
  newPassword: z.string().min(6, 'Minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Password tidak cocok', path: ['confirmPassword'] });
type PwData = z.infer<typeof pwSchema>;

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('phone', phone ?? '');
      if (avatarFile) fd.append('avatar', avatarFile);
      return (await api.put<User>('/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: (data) => { updateUser({ ...user!, ...data }); toast.success('Profil diperbarui'); setAvatarFile(null); },
    onError: (e) => toast.error(apiError(e)),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PwData>({ resolver: zodResolver(pwSchema) });
  const changePw = useMutation({
    mutationFn: async (d: PwData) => api.post('/auth/change-password', { currentPassword: d.currentPassword, newPassword: d.newPassword }),
    onSuccess: () => { toast.success('Password berhasil diubah'); reset(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const initials = user?.name?.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <div className="space-y-6">
      <PageHeader title="Profil Saya" description="Kelola informasi akun Anda" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {avatarFile ? <img src={URL.createObjectURL(avatarFile)} alt="" className="h-full w-full object-cover" /> : user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : initials}
              </div>
              <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-card p-2 shadow-md ring-1 ring-border">
                <ImageIcon className="h-4 w-4" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{user?.name}</p>
              <Badge variant="primary" className="mt-1"><ShieldCheck className="mr-1 h-3 w-3" /> {user?.role}</Badge>
            </div>
            <div className="w-full space-y-2 border-t border-border pt-4 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {user?.email}</p>
              {user?.phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {user.phone}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Informasi Akun</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nama Lengkap"><Input value={name} onChange={(e) => setName(e.target.value)} /></FormField>
              <FormField label="Telepon"><Input value={phone ?? ''} onChange={(e) => setPhone(e.target.value)} /></FormField>
              <FormField label="Email"><Input value={user?.email ?? ''} disabled /></FormField>
              <FormField label="Role"><Input value={user?.role ?? ''} disabled className="capitalize" /></FormField>
            </CardContent>
            <div className="flex justify-end border-t border-border p-5">
              <Button onClick={() => saveProfile.mutate()} loading={saveProfile.isPending}><Save className="h-4 w-4" /> Simpan</Button>
            </div>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle>Ubah Password</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit((d) => changePw.mutate(d))}>
              <CardContent className="space-y-4">
                <FormField label="Password Saat Ini" error={errors.currentPassword?.message} required>
                  <Input type="password" {...register('currentPassword')} />
                </FormField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Password Baru" error={errors.newPassword?.message} required>
                    <Input type="password" {...register('newPassword')} />
                  </FormField>
                  <FormField label="Konfirmasi Password" error={errors.confirmPassword?.message} required>
                    <Input type="password" {...register('confirmPassword')} />
                  </FormField>
                </div>
              </CardContent>
              <div className="flex justify-end border-t border-border p-5">
                <Button type="submit" loading={changePw.isPending}>Ubah Password</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
