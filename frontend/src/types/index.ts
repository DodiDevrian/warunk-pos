export type Role = 'administrator' | 'kasir' | 'owner';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  roleId: number;
  phone?: string | null;
  avatar?: string | null;
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  productCount?: number;
  createdAt?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  description?: string | null;
  image?: string | null;
  costPrice: number;
  sellPrice: number;
  discount: number;
  tax: number;
  stock: number;
  minStock: number;
  unit?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  purchaseCount?: number;
  createdAt?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  totalSpent?: number;
  transactionCount?: number;
  createdAt?: string;
}

export interface SaleItem {
  id?: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  invoiceNo: string;
  customerId?: number | null;
  customerName?: string | null;
  cashierName?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: 'cash' | 'transfer' | 'qris';
  status: string;
  note?: string | null;
  createdAt: string;
  itemCount?: number;
  items?: SaleItem[];
}

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  type: 'in' | 'out' | 'adjustment' | 'opname';
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface Purchase {
  id: number;
  invoiceNo: string;
  supplierId?: number | null;
  supplierName?: string | null;
  userName?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  note?: string | null;
  createdAt: string;
  items?: {
    id?: number;
    productId: number;
    productName?: string;
    quantity: number;
    costPrice: number;
    subtotal: number;
  }[];
}

export interface Settings {
  id: number;
  storeName: string;
  logo?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  currency: string;
  taxRate: number;
  printerName?: string | null;
  footerNote?: string | null;
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  todaySales: number;
  todayTransactions: number;
  productsSold: number;
  totalTransactions: number;
  lowStockCount: number;
  productCount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AppRole {
  id: number;
  name: string;
  description?: string | null;
}
