import { formatCurrency, formatDateTime } from './format';
import type { Sale, Settings } from '@/types';

export function printInvoice(sale: Sale, settings?: Settings | null) {
  const store = settings?.storeName ?? 'Waru.NK POS';
  const rows = (sale.items ?? [])
    .map(
      (it) => `
      <tr>
        <td colspan="3">${it.productName}</td>
      </tr>
      <tr class="muted">
        <td>${it.quantity} x ${formatCurrency(it.price)}</td>
        <td></td>
        <td class="right">${formatCurrency(it.subtotal)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><title>${sale.invoiceNo}</title>
  <style>
    * { font-family: 'Courier New', monospace; box-sizing: border-box; }
    body { width: 300px; margin: 0 auto; padding: 12px; color: #000; }
    h1 { font-size: 16px; text-align: center; margin: 0; }
    .center { text-align: center; }
    .muted { color: #444; font-size: 11px; }
    .right { text-align: right; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; font-size: 12px; }
    .total { font-weight: bold; font-size: 14px; }
    .small { font-size: 11px; }
  </style></head>
  <body>
    <h1>${store}</h1>
    ${settings?.address ? `<p class="center small">${settings.address}</p>` : ''}
    ${settings?.phone ? `<p class="center small">${settings.phone}</p>` : ''}
    <hr />
    <div class="row"><span>${sale.invoiceNo}</span></div>
    <div class="row small"><span>${formatDateTime(sale.createdAt)}</span></div>
    <div class="row small"><span>Kasir: ${sale.cashierName ?? '-'}</span></div>
    <div class="row small"><span>Pelanggan: ${sale.customerName ?? 'Umum'}</span></div>
    <hr />
    <table>${rows}</table>
    <hr />
    <div class="row"><span>Subtotal</span><span>${formatCurrency(sale.subtotal)}</span></div>
    ${sale.discount ? `<div class="row"><span>Diskon</span><span>-${formatCurrency(sale.discount)}</span></div>` : ''}
    ${sale.tax ? `<div class="row"><span>Pajak</span><span>${formatCurrency(sale.tax)}</span></div>` : ''}
    <div class="row total"><span>TOTAL</span><span>${formatCurrency(sale.total)}</span></div>
    <div class="row"><span>Bayar (${sale.paymentMethod.toUpperCase()})</span><span>${formatCurrency(sale.paid)}</span></div>
    <div class="row"><span>Kembali</span><span>${formatCurrency(sale.change)}</span></div>
    <hr />
    <p class="center small">${settings?.footerNote ?? 'Terima kasih atas kunjungan Anda!'}</p>
    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=380,height=640');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
