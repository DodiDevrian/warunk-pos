/** Export an array of objects to a downloadable CSV (Excel-compatible). */
export function exportToCSV(filename: string, rows: Record<string, unknown>[], headers?: Record<string, string>) {
  if (!rows.length) return;
  const keys = headers ? Object.keys(headers) : Object.keys(rows[0]);
  const titles = headers ? Object.values(headers) : keys;

  const escape = (val: unknown) => {
    const s = val == null ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    titles.join(','),
    ...rows.map((r) => keys.map((k) => escape(r[k])).join(',')),
  ].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Open a print-friendly window for a report table. */
export function printReport(title: string, tableHTML: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #0F172A; }
    h1 { font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { background: #f1f5f9; }
    .date { color: #64748b; font-size: 12px; }
  </style></head><body>
    <h1>${title}</h1>
    <p class="date">Waru.NK POS · Dicetak ${new Date().toLocaleString('id-ID')}</p>
    ${tableHTML}
    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
  </body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) { w.document.write(html); w.document.close(); }
}
