import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, Bell, Moon, Sun, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  administrator: 'Administrator',
  kasir: 'Kasir',
  owner: 'Owner',
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Notification[]>('/notifications')).data,
    refetchInterval: 60_000,
  });
  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initials = user?.name?.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md lg:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block">
        <p className="text-sm text-muted-foreground">
          Selamat datang kembali, <span className="font-semibold text-foreground">{user?.name}</span> 👋
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={toggle} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Toggle theme">
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotifOpen((o) => !o)} className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-2 shadow-xl animate-scale-in">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-sm font-semibold">Notifikasi</p>
                {unread > 0 && <Badge variant="danger">{unread} baru</Badge>}
              </div>
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">Tidak ada notifikasi</p>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div key={n.id} className={cn('rounded-lg p-2.5 text-sm', !n.isRead && 'bg-muted/60')}>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg p-1.5 pr-2 hover:bg-muted"
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground">{user && roleLabels[user.role]}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-scale-in">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <UserIcon className="h-4 w-4" /> Profil Saya
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
              >
                <LogOut className="h-4 w-4" /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
