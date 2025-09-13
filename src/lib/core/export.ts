import type { AppState } from './types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const fmtDate = (iso: string) => new Date(iso).toLocaleString();

export async function exportPendingToPDF(state: AppState) {
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

  const money = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

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
  doc.text(`Total pendiente: ${money(totalPending)}`, left, y);
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
    doc.text(`Total pendiente: ${money(subtotal)}`, left, y);
    y += 12;

    // Build rows: one row per item in each sale
    const rows: any[] = [];
    for (const sale of sales) {
      for (const it of sale.items) {
        rows.push([
          fmtDate(sale.createdAt),
          it.product,
          it.quantity,
          money(it.unitPrice),
          money(it.unitPrice * it.quantity),
        ]);
      }
    }

    autoTable(doc, {
      startY: Math.max(y + 8, y),
      head: [['Fecha', 'Producto', 'Cant.', 'Unitario', 'Total']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [24, 24, 27] }, // zinc-900
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 50, halign: 'right' },
        3: { cellWidth: 80, halign: 'right' },
        4: { cellWidth: 80, halign: 'right' },
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
