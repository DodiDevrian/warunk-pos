import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Store, Save, ImageIcon } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, Select, Textarea } from '@/components/ui/field';
import { Spinner } from '@/components/ui/misc';
import type { Settings as SettingsType } from '@/types';

export default function Settings() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canEdit = hasRole('administrator');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<SettingsType>('/settings')).data });
  const { register, handleSubmit, reset } = useForm<SettingsType>();

  useEffect(() => { if (settings) reset(settings); }, [settings, reset]);

  const save = useMutation({
    mutationFn: async (d: SettingsType) => {
      const fd = new FormData();
      Object.entries(d).forEach(([k, v]) => fd.append(k, v == null ? '' : String(v)));
      if (logoFile) fd.append('logo', logoFile);
      return api.put('/settings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Pengaturan disimpan'); setLogoFile(null); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading) return <Card><Spinner /></Card>;

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" description="Konfigurasi informasi toko dan sistem" />

      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Logo Toko</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              {logoFile ? (
                <img src={URL.createObjectURL(logoFile)} alt="" className="h-full w-full object-cover" />
              ) : settings?.logo ? (
                <img src={settings.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            {canEdit && (
              <label className="cursor-pointer text-sm font-medium text-primary hover:underline">
                <ImageIcon className="mr-1 inline h-4 w-4" /> Ganti Logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Informasi Toko</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nama Toko" className="sm:col-span-2"><Input disabled={!canEdit} {...register('storeName')} /></FormField>
            <FormField label="Telepon"><Input disabled={!canEdit} {...register('phone')} /></FormField>
            <FormField label="Email"><Input disabled={!canEdit} type="email" {...register('email')} /></FormField>
            <FormField label="Alamat" className="sm:col-span-2"><Textarea disabled={!canEdit} {...register('address')} /></FormField>
            <FormField label="Mata Uang">
              <Select disabled={!canEdit} {...register('currency')}>
                <option value="IDR">IDR (Rupiah)</option>
                <option value="USD">USD (Dollar)</option>
              </Select>
            </FormField>
            <FormField label="Pajak Default (%)"><Input disabled={!canEdit} type="number" step="0.1" {...register('taxRate')} /></FormField>
            <FormField label="Nama Printer"><Input disabled={!canEdit} {...register('printerName')} /></FormField>
            <FormField label="Catatan Struk"><Input disabled={!canEdit} {...register('footerNote')} /></FormField>
          </CardContent>
          {canEdit && (
            <div className="flex justify-end border-t border-border p-5">
              <Button type="submit" loading={save.isPending}><Save className="h-4 w-4" /> Simpan Perubahan</Button>
            </div>
          )}
        </Card>
      </form>
    </div>
  );
}
