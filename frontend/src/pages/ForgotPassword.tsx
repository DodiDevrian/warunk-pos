import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Store, ArrowLeft } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/field';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  newPassword: z.string().min(6, 'Minimal 6 karakter'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/forgot-password', data);
      toast.success('Password berhasil direset. Silakan login.');
      navigate('/login');
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masukkan email dan password baru Anda</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Email" error={errors.email?.message} required>
            <Input type="email" placeholder="nama@email.com" {...register('email')} />
          </FormField>
          <FormField label="Password Baru" error={errors.newPassword?.message} required>
            <Input type="password" placeholder="••••••••" {...register('newPassword')} />
          </FormField>
          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Reset Password
          </Button>
        </form>

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke login
        </Link>
      </div>
    </div>
  );
}
