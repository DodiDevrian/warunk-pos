import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, X, ImageIcon, Wallet, CreditCard, QrCode, CheckCircle2,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { printInvoice } from '@/lib/printInvoice';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Product, Category, Customer, CartItem, Sale, Settings } from '@/types';

const PAYMENTS = [
  { id: 'cash', label: 'Tunai', icon: Wallet },
  { id: 'transfer', label: 'Transfer', icon: CreditCard },
  { id: 'qris', label: 'QRIS', icon: QrCode },
] as const;

export default function POS() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const debounced = useDebounce(search, 200);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [payment, setPayment] = useState<'cash' | 'transfer' | 'qris'>('cash');
  const [paid, setPaid] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ['pos-products', debounced, categoryId],
    queryFn: async () => (await api.get<Product[]>('/products', { params: { search: debounced, categoryId: categoryId || undefined } })).data,
  });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<Category[]>('/categories')).data });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: async () => (await api.get<Customer[]>('/customers')).data });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<Settings>('/settings')).data });

  const addToCart = (product: Product) => {
    if (product.stock <= 0) { toast.error('Stok habis'); return; }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error('Melebihi stok tersedia'); return prev; }
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product, quantity: 1 }];
    });
  };
  const setQty = (id: number, qty: number) => {
    setCart((prev) =>
      prev.flatMap((i) => {
        if (i.product.id !== id) return [i];
        if (qty <= 0) return [];
        if (qty > i.product.stock) { toast.error('Melebihi stok'); return [i]; }
        return [{ ...i, quantity: qty }];
      }),
    );
  };
  const removeItem = (id: number) => setCart((prev) => prev.filter((i) => i.product.id !== id));
  const clearCart = () => { setCart([]); setDiscount(0); setTaxPercent(0); setPaid(''); setCustomerId(''); };

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.product.sellPrice * i.quantity, 0), [cart]);
  const taxAmount = useMemo(() => Math.round(((subtotal - discount) * taxPercent) / 100), [subtotal, discount, taxPercent]);
  const total = Math.max(0, subtotal - discount + taxAmount);
  const paidNum = Number(paid) || 0;
  const change = paidNum - total;

  const checkout = useMutation({
    mutationFn: async () => {
      const body = {
        customerId: customerId || undefined,
        discount, tax: taxAmount, paid: paidNum, paymentMethod: payment,
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity, price: i.product.sellPrice, discount: 0 })),
      };
      return (await api.post<Sale>('/sales', body)).data;
    },
    onSuccess: (sale) => {
      setLastSale(sale);
      setCheckoutOpen(false);
      clearCart();
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Transaksi ${sale.invoiceNo} berhasil!`);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const openCheckout = () => {
    if (!cart.length) { toast.error('Keranjang kosong'); return; }
    setPaid(String(total));
    setCheckoutOpen(true);
  };

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
      {/* Product catalog */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk / scan barcode..." className="pl-9" />
          </div>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="sm:w-44">
            <option value="">Semua Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 xl:grid-cols-4">
          {products.length === 0 ? (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">Produk tidak ditemukan</p>
          ) : (
            products.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-all hover:border-primary hover:shadow-md disabled:opacity-50"
              >
                <div className="relative flex aspect-square items-center justify-center bg-muted">
                  {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
                  <Badge variant={p.stock <= p.minStock ? 'danger' : 'success'} className="absolute right-1.5 top-1.5">{p.stock}</Badge>
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-sm font-medium leading-tight">{p.name}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{formatCurrency(p.sellPrice)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Keranjang</h2>
            <Badge variant="primary">{cart.reduce((s, i) => s + i.quantity, 0)}</Badge>
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart}><X className="h-4 w-4" /> Kosongkan</Button>
          )}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <ShoppingCart className="mb-2 h-10 w-10 opacity-40" />
              <p className="text-sm">Keranjang kosong</p>
              <p className="text-xs">Pilih produk untuk memulai</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.product.sellPrice)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(item.product.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                  <input
                    value={item.quantity}
                    onChange={(e) => setQty(item.product.id, Number(e.target.value) || 0)}
                    className="h-7 w-10 rounded border border-border bg-card text-center text-sm"
                  />
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(item.product.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                </div>
                <p className="w-20 text-right text-sm font-semibold">{formatCurrency(item.product.sellPrice * item.quantity)}</p>
                <button onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 border-t border-border p-4">
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Pelanggan Umum</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Diskon (Rp)</label>
              <Input type="number" min={0} value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Pajak (%)</label>
              <Input type="number" min={0} max={100} value={taxPercent || ''} onChange={(e) => setTaxPercent(Number(e.target.value) || 0)} className="h-9" />
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Diskon</span><span>-{formatCurrency(discount)}</span></div>}
            {taxAmount > 0 && <div className="flex justify-between text-muted-foreground"><span>Pajak</span><span>{formatCurrency(taxAmount)}</span></div>}
            <div className="flex justify-between border-t border-border pt-1 text-lg font-bold"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
          </div>

          <Button className="w-full" size="lg" onClick={openCheckout} disabled={!cart.length}>
            Bayar · {formatCurrency(total)}
          </Button>
        </div>
      </div>

      {/* Checkout modal */}
      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Pembayaran"
        footer={
          <>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Batal</Button>
            <Button onClick={() => checkout.mutate()} loading={checkout.isPending} disabled={paidNum < total}>
              <CheckCircle2 className="h-4 w-4" /> Selesaikan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/60 p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Tagihan</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
          </div>

          <div>
            <label className="text-sm font-medium">Metode Pembayaran</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PAYMENTS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPayment(m.id)}
                  className={cn('flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-all', payment === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}
                >
                  <m.icon className="h-5 w-5" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Jumlah Bayar</label>
            <Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} className="mt-1 h-12 text-lg font-semibold" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[total, 50000, 100000, 150000, 200000].map((amt, i) => (
                <button key={i} onClick={() => setPaid(String(amt))} className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">
                  {i === 0 ? 'Uang Pas' : formatCurrency(amt)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-success/10 p-3">
            <span className="font-medium text-success">Kembalian</span>
            <span className="text-xl font-bold text-success">{formatCurrency(Math.max(0, change))}</span>
          </div>
        </div>
      </Modal>

      {/* Success / receipt modal */}
      <Modal
        open={!!lastSale}
        onClose={() => setLastSale(null)}
        title="Transaksi Berhasil"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setLastSale(null)}>Tutup</Button>
            <Button onClick={() => lastSale && printInvoice(lastSale, settings)}>Cetak Struk</Button>
          </>
        }
      >
        {lastSale && (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div>
              <p className="font-semibold">{lastSale.invoiceNo}</p>
              <p className="text-sm text-muted-foreground">Total {formatCurrency(lastSale.total)}</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3 text-left text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Bayar</span><span>{formatCurrency(lastSale.paid)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Kembali</span><span className="font-semibold">{formatCurrency(lastSale.change)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
