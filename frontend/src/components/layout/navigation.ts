import {
  LayoutDashboard, ShoppingCart, Package, Tags, Truck, Users2, Boxes,
  ShoppingBag, Receipt, BarChart3, UserCog, Settings, type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: Role[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Kasir (POS)', to: '/pos', icon: ShoppingCart, roles: ['administrator', 'kasir'] },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { label: 'Produk', to: '/products', icon: Package },
      { label: 'Kategori', to: '/categories', icon: Tags },
      { label: 'Supplier', to: '/suppliers', icon: Truck },
      { label: 'Customer', to: '/customers', icon: Users2 },
    ],
  },
  {
    title: 'Inventory & Transaksi',
    items: [
      { label: 'Inventory', to: '/inventory', icon: Boxes },
      { label: 'Pembelian', to: '/purchases', icon: ShoppingBag },
      { label: 'Riwayat Penjualan', to: '/sales', icon: Receipt },
    ],
  },
  {
    title: 'Lainnya',
    items: [
      { label: 'Laporan', to: '/reports', icon: BarChart3, roles: ['administrator', 'owner'] },
      { label: 'Manajemen User', to: '/users', icon: UserCog, roles: ['administrator'] },
      { label: 'Pengaturan', to: '/settings', icon: Settings },
    ],
  },
];
