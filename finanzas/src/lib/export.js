import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UNIT_LABELS, METHOD_LABELS } from './constants';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const fmtMoney = (n) => Number(n || 0).toFixed(2);

export async function exportMovementsToExcel(movements, filename = 'movimientos.xlsx') {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Movimientos');
  ws.columns = [
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Tipo', key: 'type', width: 10 },
    { header: 'Unidad', key: 'unit', width: 12 },
    { header: 'Categoría', key: 'category', width: 18 },
    { header: 'Alcance', key: 'scope', width: 12 },
    { header: 'Método de pago', key: 'method', width: 20 },
    { header: 'Monto (USD)', key: 'amount', width: 14 },
    { header: 'Descripción', key: 'description', width: 30 },
    { header: 'Nota', key: 'note', width: 30 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const mv of movements) {
    ws.addRow({
      date: mv.date,
      type: mv.type === 'income' ? 'Ingreso' : 'Gasto',
      unit: mv.unit ? UNIT_LABELS[mv.unit] || mv.unit : '',
      category: mv.category || '',
      scope: mv.scope === 'general' ? 'General' : mv.scope === 'individual' ? 'Individual' : '',
      method: METHOD_LABELS[mv.method] || mv.method || '',
      amount: Number(mv.amount || 0),
      description: mv.description || '',
      note: mv.note || '',
    });
  }
  ws.getColumn('amount').numFmt = '#,##0.00';

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(new Blob([buffer], { type: 'application/octet-stream' }), filename);
}

export async function exportSummaryToExcel(summaryRows, filename = 'reporte.xlsx') {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Reporte');
  ws.columns = [
    { header: 'Concepto', key: 'label', width: 30 },
    { header: 'Monto (USD)', key: 'value', width: 16 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const row of summaryRows) ws.addRow(row);
  ws.getColumn('value').numFmt = '#,##0.00';

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(new Blob([buffer], { type: 'application/octet-stream' }), filename);
}

export function exportMovementsToPDF(movements, title, filename = 'movimientos.pdf') {
  const docPdf = new jsPDF();
  docPdf.setFontSize(14);
  docPdf.text(title || 'Reporte El Poblado 5H', 14, 16);
  docPdf.setFontSize(9);
  docPdf.text(`Generado: ${new Date().toLocaleString('es-VE')}`, 14, 22);

  autoTable(docPdf, {
    startY: 28,
    head: [['Fecha', 'Tipo', 'Unidad', 'Categoría', 'Método', 'Monto', 'Descripción']],
    body: movements.map((mv) => [
      mv.date,
      mv.type === 'income' ? 'Ingreso' : 'Gasto',
      mv.unit ? UNIT_LABELS[mv.unit] || mv.unit : '-',
      mv.category || '-',
      METHOD_LABELS[mv.method] || mv.method || '-',
      `$${fmtMoney(mv.amount)}`,
      mv.description || '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 95] },
  });

  docPdf.save(filename);
}

export function exportSummaryToPDF(title, sections, filename = 'reporte.pdf') {
  const docPdf = new jsPDF();
  docPdf.setFontSize(14);
  docPdf.text(title, 14, 16);
  docPdf.setFontSize(9);
  docPdf.text(`Generado: ${new Date().toLocaleString('es-VE')}`, 14, 22);

  let y = 30;
  for (const section of sections) {
    docPdf.setFontSize(11);
    docPdf.text(section.heading, 14, y);
    autoTable(docPdf, {
      startY: y + 3,
      head: [['Concepto', 'Monto']],
      body: section.rows.map((r) => [r.label, `$${fmtMoney(r.value)}`]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 95] },
      margin: { left: 14 },
    });
    y = docPdf.lastAutoTable.finalY + 10;
  }

  docPdf.save(filename);
}
