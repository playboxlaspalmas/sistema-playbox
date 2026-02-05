import jsPDF from 'jspdf';
import type { Venta, VentaItem } from '@/types';
import { formatCLP } from '@/lib/currency';

interface GenerateSalesReportPDFParams {
  fechaInicio: string;
  fechaFin: string;
  ventas: Venta[];
  ventasItems: Record<string, VentaItem[]>;
  cajaInicial: number;
  totales: {
    total_efectivo: number;
    total_tarjeta: number;
    total_transferencia: number;
    total_general: number;
    total_vueltos: number;
    cantidad_ventas: number;
  };
  sucursalId?: string | null;
}

export async function generateSalesReportPDF({
  fechaInicio,
  fechaFin,
  ventas,
  ventasItems,
  cajaInicial,
  totales,
  sucursalId,
}: GenerateSalesReportPDFParams) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPosition = margin;

  // Función para agregar nueva página si es necesario
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Encabezado
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte de Ventas', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const fechaInicioFormatted = new Date(fechaInicio).toLocaleDateString('es-CL');
  const fechaFinFormatted = new Date(fechaFin).toLocaleDateString('es-CL');
  
  if (fechaInicio === fechaFin) {
    doc.text(`Fecha: ${fechaInicioFormatted}`, margin, yPosition);
  } else {
    doc.text(`Período: ${fechaInicioFormatted} - ${fechaFinFormatted}`, margin, yPosition);
  }
  yPosition += 8;

  doc.text(`Generado el: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`, margin, yPosition);
  yPosition += 15;

  // Resumen
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const resumenItems = [
    ['Caja Inicial:', formatCLP(cajaInicial)],
    ['Total Ventas:', formatCLP(totales.total_general)],
    ['Vueltos Entregados:', `-${formatCLP(totales.total_vueltos)}`],
    ['Caja Final Estimada:', formatCLP(cajaInicial + totales.total_efectivo - totales.total_vueltos)],
    ['Cantidad de Ventas:', totales.cantidad_ventas.toString()],
  ];

  resumenItems.forEach(([label, value]) => {
    checkPageBreak(8);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 60, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Desglose por método de pago
  checkPageBreak(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Desglose por Método de Pago', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const metodosPago = [
    ['Efectivo:', formatCLP(totales.total_efectivo)],
    ['Tarjeta:', formatCLP(totales.total_tarjeta)],
    ['Transferencia:', formatCLP(totales.total_transferencia)],
  ];

  metodosPago.forEach(([metodo, monto]) => {
    checkPageBreak(8);
    doc.setFont('helvetica', 'bold');
    doc.text(metodo, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(monto, margin + 50, yPosition);
    yPosition += 6;
  });

  yPosition += 10;

  // Detalle de ventas
  if (ventas.length > 0) {
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Ventas', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    // Encabezados de tabla
    const tableHeaders = ['Fecha', 'N° Venta', 'Método', 'Efectivo', 'Vueltos', 'Total'];
    const colWidths = [30, 35, 25, 30, 25, 30];
    let xPos = margin;

    tableHeaders.forEach((header, index) => {
      doc.text(header, xPos, yPosition);
      xPos += colWidths[index];
    });

    yPosition += 6;
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    ventas.forEach((venta) => {
      checkPageBreak(10);
      
      const fecha = new Date(venta.created_at).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const hora = new Date(venta.created_at).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      });

      xPos = margin;
      doc.text(`${fecha} ${hora}`, xPos, yPosition);
      xPos += colWidths[0];
      
      doc.text(venta.numero_venta, xPos, yPosition);
      xPos += colWidths[1];
      
      doc.text(venta.metodo_pago, xPos, yPosition);
      xPos += colWidths[2];
      
      doc.text(venta.efectivo_recibido ? formatCLP(venta.efectivo_recibido) : '-', xPos, yPosition);
      xPos += colWidths[3];
      
      doc.text(venta.vueltos ? `-${formatCLP(venta.vueltos)}` : '-', xPos, yPosition);
      xPos += colWidths[4];
      
      doc.text(formatCLP(venta.total), xPos, yPosition);
      
      yPosition += 6;
    });
  }

  // Descargar PDF
  const nombreArchivo = `reporte_ventas_${fechaInicio}_${fechaFin}.pdf`;
  doc.save(nombreArchivo);
}
