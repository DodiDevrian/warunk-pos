import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Store, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/field';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});
type FormData = z.infer<typeof schema>;

const demoAccounts = [
  { role: 'Administrator', email: 'admin@warunk.com', password: 'admin123' },
  { role: 'Kasir', email: 'kasir@warunk.com', password: 'kasir123' },
  { role: 'Owner', email: 'owner@warunk.com', password: 'owner123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success('Login berhasil!');
      navigate('/');
    } catch (err) {
      toast.error(apiError(err, 'Login gagal'));
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-secondary p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <Store className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">Waru.NK POS</span>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Kelola bisnis Anda<br />dengan lebih cerdas.
          </h1>
          <p className="max-w-md text-white/70">
            Sistem Point of Sale modern untuk mengelola penjualan, inventaris, dan laporan bisnis secara realtime.
          </p>
        </div>
        <div className="relative flex gap-8 text-sm text-white/60">
          <div><p className="text-2xl font-bold text-white">100%</p>Realtime</div>
          <div><p className="text-2xl font-bold text-white">Fast</p>Performa</div>
          <div><p className="text-2xl font-bold text-white">Secure</p>Terpercaya</div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Store className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Waru.NK POS</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold">Masuk ke akun Anda</h2>
            <p className="mt-1 text-sm text-muted-foreground">Silakan masukkan kredensial Anda</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email" error={errors.email?.message} required>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" placeholder="nama@email.com" className="pl-9" {...register('email')} />
              </div>
            </FormField>

            <FormField label="Password" error={errors.password?.message} required>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Lupa password?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Masuk
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/40 p-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">AKUN DEMO (klik untuk isi)</p>
            <div className="space-y-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => {
                    setValue('email', acc.email);
                    setValue('password', acc.password);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-card"
                >
                  <span className="font-medium">{acc.role}</span>
                  <span className="text-muted-foreground">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
