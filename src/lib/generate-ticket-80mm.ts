import jsPDF from "jspdf";
import type { Venta, VentaItem, Producto, Branch, Customer } from "@/types";
import { formatCurrency } from "./currency";
import { formatDateTime } from "./date";
import { getSystemSettings } from "./settings";

interface TicketData {
  venta: Venta;
  items: Array<VentaItem & { producto: Producto }>;
  sucursal: Branch | null;
  customer?: Customer | null;
  total: number;
}

/**
 * Genera una boleta de 80mm (ticket térmico) para impresión
 * Formato: 80mm de ancho, contenido centrado
 */
export async function generateTicket80mm(data: TicketData): Promise<Blob> {
  const { venta, items, sucursal, customer, total } = data;
  const settings = await getSystemSettings();

  // Ancho de ticket 80mm en puntos (1mm = 2.83465 puntos)
  const ticketWidth = 80 * 2.83465; // ~226.77 puntos
  const margin = 10; // Márgenes laterales
  const contentWidth = ticketWidth - (margin * 2);
  
  // Crear documento con ancho fijo de 80mm
  const doc = new jsPDF({
    format: [ticketWidth, 1000], // Ancho fijo, alto dinámico
    unit: 'pt'
  });

  let yPosition = margin;

  // === LOGO EN BLANCO Y NEGRO ===
  try {
    if (settings.pdf_logo?.url && typeof window !== 'undefined') {
      const logoUrl = settings.pdf_logo.url.startsWith('http') 
        ? settings.pdf_logo.url 
        : `${window.location.origin}${settings.pdf_logo.url}`;
      
      // Convertir logo a escala de grises (blanco y negro)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = logoUrl;
      });

      // Crear canvas para convertir a escala de grises
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convertir a escala de grises
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = gray;     // R
          data[i + 1] = gray; // G
          data[i + 2] = gray; // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        const grayImageData = canvas.toDataURL('image/png');
        
        const logoWidth = settings.pdf_logo.width * 2.83465; // Convertir mm a puntos
        const logoHeight = settings.pdf_logo.height * 2.83465;
        const logoX = (ticketWidth - logoWidth) / 2;
        
        doc.addImage(grayImageData, 'PNG', logoX, yPosition, logoWidth, logoHeight);
        yPosition += logoHeight + 5;
      }
    }
  } catch (error) {
    console.error('Error cargando logo:', error);
    // Continuar sin logo si hay error
  }

  // Configurar fuente pequeña para ticket
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  // === HEADER: DATOS DE LA SUCURSAL ===
  if (sucursal) {
    const nombreSucursal = sucursal.name || sucursal.razon_social || "Sucursal";
    const nombreLines = doc.splitTextToSize(nombreSucursal, contentWidth);
    nombreLines.forEach((line: string) => {
      doc.text(line, ticketWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;
    });

    if (sucursal.address) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const addressLines = doc.splitTextToSize(sucursal.address, contentWidth);
      addressLines.forEach((line: string) => {
        doc.text(line, ticketWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;
      });
    }

    if (sucursal.phone) {
      doc.setFontSize(8);
      doc.text(`Tel: ${sucursal.phone}`, ticketWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }

    if (sucursal.email) {
      doc.setFontSize(8);
      doc.text(sucursal.email, ticketWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }
  }

  // Línea separadora
  yPosition += 5;
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, ticketWidth - margin, yPosition);
  yPosition += 10;

  // === DATOS DE LA VENTA ===
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BOLETA DE VENTA", ticketWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`N°: ${venta.numero_venta}`, ticketWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  const fechaHora = formatDateTime(venta.created_at);
  doc.text(fechaHora, ticketWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // === DATOS DEL CLIENTE ===
  if (customer) {
    yPosition += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", margin, yPosition);
    yPosition += 10;
    
    doc.setFont("helvetica", "normal");
    doc.text(customer.name, margin, yPosition);
    yPosition += 10;
    
    if (customer.rut_document) {
      doc.text(`RUT: ${customer.rut_document}`, margin, yPosition);
      yPosition += 10;
    }
    
    yPosition += 3;
  }

  // Línea separadora
  yPosition += 5;
  doc.line(margin, yPosition, ticketWidth - margin, yPosition);
  yPosition += 10;

  // === ARTÍCULOS ===
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ARTÍCULOS", margin, yPosition);
  yPosition += 12;

  // Agrupar items por producto_id para evitar duplicados
  // Si hay múltiples items del mismo producto, sumar cantidades y subtotales
  const itemsAgrupados = new Map<string, {
    producto: Producto;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>();

  items.forEach((item) => {
    const key = item.producto_id;
    if (itemsAgrupados.has(key)) {
      // Si ya existe, sumar cantidades y subtotales
      const existente = itemsAgrupados.get(key)!;
      existente.cantidad += item.cantidad;
      existente.subtotal += item.subtotal;
    } else {
      // Si no existe, agregar nuevo
      itemsAgrupados.set(key, {
        producto: item.producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      });
    }
  });

  // Mostrar items agrupados
  doc.setFont("helvetica", "normal");
  itemsAgrupados.forEach((itemAgrupado) => {
    // Nombre del producto
    const nombreLines = doc.splitTextToSize(itemAgrupado.producto.nombre, contentWidth - 60);
    nombreLines.forEach((line: string, index: number) => {
      doc.text(line, margin, yPosition);
      if (index === 0) {
        // Precio unitario y cantidad en la primera línea
        const precioInfo = `${itemAgrupado.cantidad} x ${formatCurrency(itemAgrupado.precio_unitario, { withLabel: false })}`;
        doc.text(precioInfo, ticketWidth - margin, yPosition, { align: 'right' });
      }
      yPosition += 10;
    });

    // Subtotal del item
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(itemAgrupado.subtotal, { withLabel: false }), ticketWidth - margin, yPosition, { align: 'right' });
    doc.setFont("helvetica", "normal");
    yPosition += 12;
  });

  // Línea separadora
  yPosition += 5;
  doc.line(margin, yPosition, ticketWidth - margin, yPosition);
  yPosition += 10;

  // === TOTALES ===
  // Calcular IVA: Total / 1.19 = Subtotal, IVA = Total - Subtotal
  const subtotal = total / 1.19;
  const iva = total - subtotal;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // Subtotal
  doc.text("Subtotal:", margin, yPosition);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(subtotal, { withLabel: false }), ticketWidth - margin, yPosition, { align: 'right' });
  yPosition += 12;

  // IVA
  doc.setFont("helvetica", "normal");
  doc.text("IVA (19%):", margin, yPosition);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(iva, { withLabel: false }), ticketWidth - margin, yPosition, { align: 'right' });
  yPosition += 12;

  // Línea separadora
  yPosition += 5;
  doc.setLineWidth(1);
  doc.line(margin, yPosition, ticketWidth - margin, yPosition);
  yPosition += 10;

  // Total
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", margin, yPosition);
  doc.text(formatCurrency(total, { withLabel: false }), ticketWidth - margin, yPosition, { align: 'right' });
  yPosition += 15;

  // === MÉTODO DE PAGO ===
  if (venta.metodo_pago) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Método de pago: ${venta.metodo_pago}`, ticketWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  }

  // === GARANTÍAS DE ACCESORIOS ===
  const warrantyPolicies = settings.accessory_warranty_policies || settings.warranty_policies;
  if (warrantyPolicies && warrantyPolicies.policies && warrantyPolicies.policies.length > 0) {
    yPosition += 5;
    doc.line(margin, yPosition, ticketWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("GARANTÍAS", ticketWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    
    // Limitar garantías a un máximo razonable para el ticket (5-6 líneas máximo)
    const maxWarrantyLines = 5;
    const policiesToShow = warrantyPolicies.policies.slice(0, maxWarrantyLines);
    
    policiesToShow.forEach((policy) => {
      const policyLines = doc.splitTextToSize(policy, contentWidth);
      policyLines.forEach((line: string) => {
        doc.text(line, margin, yPosition);
        yPosition += 9;
      });
      yPosition += 2; // Espacio entre políticas
    });
    
    if (warrantyPolicies.policies.length > maxWarrantyLines) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.text("(Ver más garantías en sistema)", ticketWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
    }
  }

  // === FOOTER ===
  yPosition += 10;
  doc.line(margin, yPosition, ticketWidth - margin, yPosition);
  yPosition += 10;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Gracias por su compra", ticketWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  doc.text("Playbox", ticketWidth / 2, yPosition, { align: 'center' });

  // Ajustar altura del documento al contenido
  doc.setPage(1);
  doc.deletePage(2); // Eliminar páginas extra si las hay

  return doc.output("blob");
}

/**
 * Imprime automáticamente el ticket usando la API de impresión del navegador
 */
export async function printTicket80mm(data: TicketData): Promise<void> {
  try {
    const blob = await generateTicket80mm(data);
    const url = URL.createObjectURL(blob);
    
    // Abrir en nueva ventana para imprimir
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // Cerrar ventana después de imprimir (opcional, con delay)
          setTimeout(() => {
            printWindow.close();
            URL.revokeObjectURL(url);
          }, 1000);
        }, 500);
      };
    } else {
      // Si no se puede abrir ventana (popup bloqueado), descargar
      const link = document.createElement('a');
      link.href = url;
      link.download = `boleta-${data.venta.numero_venta}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Mostrar mensaje para imprimir manualmente
      alert('Por favor, abre el PDF descargado e imprímelo en una impresora de 80mm');
    }
  } catch (error) {
    console.error('Error generando ticket:', error);
    throw error;
  }
}
