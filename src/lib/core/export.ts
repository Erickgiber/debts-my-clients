import type { AppState } from './types';
// NOTE: Se usa importación dinámica de jspdf y autotable para evitar que el bundle principal
// incluya estas librerías pesadas (pdf sólo se genera bajo demanda).
// Capacitor APIs siguen estáticas (son pequeñas comparado a jsPDF) pero podrían también
// cargarse dinámicamente si fuese necesario.
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const fmtDate = (iso: string) => new Date(iso).toLocaleString();

export async function exportPendingToPDF(state: AppState) {
  // Carga diferida de dependencias pesadas.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const title = 'Pagos pendientes';
  const createdAt = new Date();

  // Metadata
  doc.setProperties({
    title,
    subject: 'Listado de pagos pendientes',
    author: 'Gestor de ventas',
    keywords: 'Gestor de ventas, deudas, ventas, pagos, PDF',
    creator: 'Gestor de ventas',
  });

  const pendingSales = state.sales.filter((s) => s.status !== 'delivered');
  const debtorsById = new Map(state.debtors.map((d) => [d.id, d]));
  const byDebtor = new Map<string, typeof pendingSales>();
  for (const s of pendingSales) {
    const arr = byDebtor.get(s.debtorId) ?? [];
    arr.push(s);
    byDebtor.set(s.debtorId, arr);
  }

  const moneyUSD = (n: number) =>
    new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD' }).format(n);
  const moneyVES = (n: number) => `Bs ${n.toFixed(2)}`;

  const totalPending = pendingSales.reduce((sum, s) => sum + s.total, 0);
  const debtorsWithPending = [...byDebtor.keys()].length;

  // Header with flow layout
  const left = 40;
  const top = 40;
  let y = top;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, left, y);
  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generado: ${createdAt.toLocaleString()}`, left, y);
  y += 14;
  doc.text(`Total pendiente: ${moneyUSD(totalPending)}`, left, y);
  y += 14;
  doc.text(`Clientes con pendiente: ${debtorsWithPending}`, left, y);
  y += 14;
  doc.text(`Ventas pendientes: ${pendingSales.length}`, left, y);
  y += 20;

  let first = true;
  const debtorIds = [...byDebtor.keys()].sort((a, b) => {
    const an = (debtorsById.get(a)?.name ?? '').toLowerCase();
    const bn = (debtorsById.get(b)?.name ?? '').toLowerCase();
    return an.localeCompare(bn);
  });

  for (const debtorId of debtorIds) {
    const debtor = debtorsById.get(debtorId);
    const sales = byDebtor.get(debtorId) || [];
    const subtotal = sales.reduce((sum, s) => sum + s.total, 0);
    const subtotalVES = sales.reduce(
      (sum, s) =>
        s.currency === 'VES'
          ? sum + s.items.reduce((a, it) => a + (it.unitPriceVES || it.unitPrice) * it.quantity, 0)
          : sum,
      0,
    );

    if (!first) {
      doc.addPage();
      y = top;
    }
    first = false;

    // Section header (debtor)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(debtor?.name || 'Cliente', left, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
      `Total pendiente: ${moneyUSD(subtotal)}` +
        (subtotalVES ? ` (≈ Bs ${subtotalVES.toFixed(2)})` : ''),
      left,
      y,
    );
    y += 12;

    // Build rows: one row per item in each sale
    const rows: any[] = [];
    for (const sale of sales) {
      for (const it of sale.items) {
        const totalUSD = it.unitPrice * it.quantity;
        const showVES = sale.currency === 'VES';
        const unitOriginal = showVES ? it.unitPriceVES || it.unitPrice : null;
        const totalOriginal = showVES ? unitOriginal! * it.quantity : null;
        rows.push([
          fmtDate(sale.createdAt),
          it.product,
          it.quantity,
          showVES
            ? moneyVES(unitOriginal!) + '\n' + moneyUSD(it.unitPrice)
            : moneyUSD(it.unitPrice),
          showVES ? moneyVES(totalOriginal!) + '\n' + moneyUSD(totalUSD) : moneyUSD(totalUSD),
          sale.currency || 'USD',
        ]);
      }
    }

    autoTable(doc, {
      startY: Math.max(y + 8, y),
      head: [['Fecha', 'Producto', 'Cant.', 'Unitario (Orig / USD)', 'Total (Orig / USD)', 'Mon.']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [24, 24, 27] }, // zinc-900
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 50, halign: 'right' },
        3: { cellWidth: 90, halign: 'right' },
        4: { cellWidth: 90, halign: 'right' },
        5: { cellWidth: 40, halign: 'center' },
      },
      margin: { left: 40, right: 40 },
      didDrawPage(_data: any) {
        // Footer with page number
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Gestor de ventas • ${title}`, left, pageHeight - 24);
        const str = `Página ${doc.getNumberOfPages()}`;
        const textWidth = doc.getTextWidth(str);
        doc.text(str, pageWidth - left - textWidth, pageHeight - 24);
      },
    });
    // After table, advance y for potential next content on same page (not needed as we add new page per debtor)
  }

  if (debtorsIdsEmpty(byDebtor)) {
    // No pending: simple one page doc
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    doc.text('No hay pagos pendientes.', 40, 140);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const fn = `pendientes-${createdAt.getFullYear()}${pad(createdAt.getMonth() + 1)}${pad(createdAt.getDate())}-${pad(createdAt.getHours())}${pad(createdAt.getMinutes())}.pdf`;

  // Save differently on native (Android) vs web
  if (Capacitor.isNativePlatform()) {
    try {
      // jsPDF -> base64
      const dataUri = doc.output('datauristring');
      const base64 = dataUri.split('base64,')[1] ?? '';
      if (!base64) throw new Error('No se pudo generar el PDF (base64 vacío)');

      // Write to app Documents
      await Filesystem.writeFile({
        path: fn,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });

      // Get shareable uri (content:// en Android)
      const { uri } = await Filesystem.getUri({ path: fn, directory: Directory.Documents });
      try {
        await Share.share({ title: 'Pagos pendientes', text: 'PDF generado', url: uri });
      } catch {
        // Sharing not available; silently ignore
      }
      return;
    } catch (err) {
      console.error('Error guardando PDF en dispositivo:', err);
      // Fallback to open/save in webview if anything fails
      doc.save(fn);
      return;
    }
  }

  // Web fallback
  doc.save(fn);
}

function debtorsIdsEmpty(map: Map<string, any[]>) {
  for (const _ of map.keys()) return false;
  return true;
}
