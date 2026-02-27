import { useRef, useEffect, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import type { WorkOrder, Service, Customer, Branch, DeviceChecklistItem } from "@/types";
import { formatCLP } from "@/lib/currency";
import { formatDate, formatDateTime } from "@/lib/date";
import { getSystemSettings } from "@/lib/settings";
import { generatePDFBlob } from "@/lib/generate-pdf-blob";

interface PDFPreviewProps {
  order: WorkOrder & { customer?: Customer; sucursal?: Branch | null };
  services: Service[];
  orderServices?: Array<{ quantity: number; unit_price: number; total_price: number; service_name: string; description?: string | null }>;
  serviceValue: number;
  replacementCost: number;
  warrantyDays: number;
  checklistData?: Record<string, 'ok' | 'damaged' | 'replaced' | 'no_probado'> | null;
  notes?: string[];
  onClose: () => void;
  onDownload: (pdf: jsPDF) => void;
}

export default function PDFPreview({
  order,
  services,
  orderServices,
  serviceValue,
  replacementCost,
  warrantyDays,
  checklistData,
  notes,
  onClose,
  onDownload,
}: PDFPreviewProps) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfDoc, setPdfDoc] = useState<jsPDF | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);
  
  // Detectar si es un dispositivo móvil
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768)
  );

  useEffect(() => {
    // Limpiar caché de settings al montar el componente para asegurar datos frescos
    // Esto garantiza que todas las sucursales vean las mismas políticas de garantía
    import("@/lib/settings").then((module) => {
      if (module.clearSettingsCache) {
        module.clearSettingsCache();
      }
    });
    // Forzar regeneración del PDF cuando cambian los datos críticos
    if (order) {
      console.log("[PDF Preview] Regenerando PDF con order:", {
        order_number: order.order_number,
        has_all_devices: !!(order as any).all_devices,
        all_devices_length: (order as any).all_devices?.length || 0,
        all_devices: (order as any).all_devices
      });
    generatePDF();
    }
  }, [order?.id, order?.order_number]);

  // Descarga automática en móviles cuando el PDF está listo
  useEffect(() => {
    if (isMobile && pdfBlob && !loading) {
      // Pequeño delay para asegurar que el usuario vea el mensaje
      const timer = setTimeout(() => {
        handleDownload();
      }, 800);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, pdfBlob, loading]);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
        setShowPrintMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function generatePDF() {
    setLoading(true);
    try {
      // Cargar datos actualizados de la sucursal desde la base de datos
      // Esto asegura que el PDF siempre refleje los datos más recientes de la sucursal
      let branchData = null;
      
      // Si order.sucursal es un array (relación de Supabase), tomar el primer elemento
      if (order.sucursal) {
        branchData = Array.isArray(order.sucursal) ? order.sucursal[0] : order.sucursal;
      }
      
      // Siempre intentar cargar datos actualizados desde la BD
      if (order.sucursal_id) {
        const { data: updatedBranch, error: branchError } = await supabase
          .from("branches")
          .select("*")
          .eq("id", order.sucursal_id)
          .single();
        
        if (!branchError && updatedBranch) {
          branchData = updatedBranch;
        }
      }

      // Crear orden con datos actualizados de sucursal
      const orderWithUpdatedBranch = {
        ...order,
        sucursal: branchData,
      };

      // Generar el PDF usando el mismo generador que se usa para emails
      // Esto garantiza que el preview, la descarga y el adjunto sean idénticos.
      const pdfOutput = await generatePDFBlob(
        orderWithUpdatedBranch,
        services,
        serviceValue,
        replacementCost,
        warrantyDays,
        checklistData,
        notes,
        orderServices
      );
      setPdfBlob(pdfOutput);
      setPdfDoc(null);
      return;

    } catch (error) {
      console.error("Error generando PDF:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generatePDFBoleta() {
    try {
      // Cargar datos actualizados de la sucursal desde la base de datos
      let branchData = null;
      
      // Si order.sucursal es un array (relación de Supabase), tomar el primer elemento
      if (order.sucursal) {
        branchData = Array.isArray(order.sucursal) ? order.sucursal[0] : order.sucursal;
      }
      
      // Siempre intentar cargar datos actualizados desde la BD
      if (order.sucursal_id) {
        const { data: updatedBranch, error: branchError } = await supabase
          .from("branches")
          .select("*")
          .eq("id", order.sucursal_id)
          .single();
        
        if (!branchError && updatedBranch) {
          branchData = updatedBranch;
        }
      }

      // Crear orden con datos actualizados de sucursal
      const orderForPDF = {
        ...order,
        sucursal: branchData,
      };

      // Cargar configuración del sistema (forzar recarga para obtener garantías más recientes)
      const settings = await getSystemSettings(true);

      // Cargar logo desde configuración
      let logoDataUrl = "";
      try {
        // Si el logo es una data URL (base64), usarla directamente
        if (settings.pdf_logo.url.startsWith("data:")) {
          logoDataUrl = settings.pdf_logo.url;
        } else {
          // Si es una URL normal, cargarla
          const logoResponse = await fetch(settings.pdf_logo.url);
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            logoDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(logoBlob);
            });
          }
        }
      } catch (error) {
        console.error("Error cargando logo:", error);
      }

      // Generar QR Code
      let qrDataUrl = "";
      try {
        qrDataUrl = await QRCode.toDataURL(
          `https://ordenes.playbox.cl/${order.order_number}`,
          { width: 80, margin: 1 }
        );
      } catch (error) {
        console.error("Error generando QR:", error);
      }

      // Formato 80mm x 2000mm (boleta larga)
      // Convertir mm a puntos: 1mm = 2.83465 puntos
      const widthMM = 80;
      const heightMM = 2000;
      const width = widthMM * 2.83465;
      const height = heightMM * 2.83465;
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [width, height]
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Logo Playbox en el medio arriba - el doble de grande
      if (logoDataUrl) {
        const logoHeight = settings.pdf_logo.height * 2; // Doble de grande
        const logoWidth = settings.pdf_logo.width * 2; // Doble de grande
        const logoX = (pageWidth - logoWidth) / 2; // Centrado
        doc.addImage(logoDataUrl, "PNG", logoX, yPosition, logoWidth, logoHeight);
        yPosition += logoHeight + 15;
      }

      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Datos del local - alineados a la izquierda con márgenes
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL LOCAL", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const branchName = orderForPDF.sucursal?.razon_social || orderForPDF.sucursal?.name || "Playbox";
      doc.text(`Nombre: ${branchName}`, margin, yPosition);
      yPosition += 8; // Aumentado de 6 a 8 para igualar datos del cliente
      doc.text(`Fecha de Emisión: ${formatDateTime(order.created_at)}`, margin, yPosition);
      yPosition += 8; // Aumentado de 6 a 8
      if (orderForPDF.sucursal?.phone) {
        doc.text(`Teléfono: ${orderForPDF.sucursal.phone}`, margin, yPosition);
        yPosition += 8; // Aumentado de 6 a 8
      }
      if (orderForPDF.sucursal?.address) {
        const addressLines = doc.splitTextToSize(`Dirección: ${orderForPDF.sucursal.address}`, contentWidth);
        doc.text(addressLines, margin, yPosition);
        yPosition += addressLines.length * 8; // Aumentado de 6 a 8
      }
      if (orderForPDF.sucursal?.email) {
        doc.text(`Email: ${orderForPDF.sucursal.email}`, margin, yPosition);
        yPosition += 8; // Aumentado de 6 a 8
      }
      yPosition += 10;

      // Datos del cliente - alineados a la izquierda con márgenes
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL CLIENTE", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      if (order.customer) {
        doc.text(`Nombre: ${order.customer.name}`, margin, yPosition);
        yPosition += 8;
        doc.text(`Teléfono: ${order.customer.phone_country_code || "+56"} ${order.customer.phone}`, margin, yPosition);
        yPosition += 8;
        if (order.customer.email) {
          doc.text(`Email: ${order.customer.email}`, margin, yPosition);
          yPosition += 8;
        }
      }
      yPosition += 8;

      // Fecha de compromiso
      if (order.commitment_date) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`Fecha de Compromiso: ${formatDate(order.commitment_date)}`, margin, yPosition);
        yPosition += 8;
      }

      // Número de orden con recuadro
      yPosition += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const orderBoxWidth = 50;
      const orderBoxHeight = 7;
      const orderBoxX = (pageWidth - orderBoxWidth) / 2; // Centrado
      doc.setFillColor(80, 80, 80); // Gris oscuro
      doc.rect(orderBoxX, yPosition, orderBoxWidth, orderBoxHeight, "F");
      doc.setTextColor(255, 255, 255);
      const orderLabelText = "N° Orden:";
      const orderLabelWidth = doc.getTextWidth(orderLabelText);
      doc.text(orderLabelText, orderBoxX + (orderBoxWidth - orderLabelWidth) / 2, yPosition + 5);
      yPosition += orderBoxHeight + 10; // Separar más el recuadro del número
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const orderNumberText = order.order_number;
      const orderNumberWidth = doc.getTextWidth(orderNumberText);
      doc.text(orderNumberText, (pageWidth - orderNumberWidth) / 2, yPosition);
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      yPosition += 10;

      // === DATOS DEL EQUIPO - Layout Adaptativo ===
      const equipmentSectionStartY = yPosition;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL EQUIPO", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      // Calcular espacio disponible para el resto del documento
      const pageHeight = doc.internal.pageSize.getHeight();
      const qrSize = 60;
      const qrMargin = 15;
      const signatureBoxHeight = 40;
      const signatureTextHeight = 8;
      const warrantySectionHeight = 50; // Estimado
      const bottomMargin = margin;
      const reservedSpace = qrSize + qrMargin + signatureBoxHeight + signatureTextHeight + warrantySectionHeight + bottomMargin + 20;
      const maxEquipmentSectionHeight = pageHeight - equipmentSectionStartY - reservedSpace;
      
      // Interlineado adaptativo según espacio disponible
      const lineSpacing = maxEquipmentSectionHeight > 200 ? 7 : (maxEquipmentSectionHeight > 150 ? 6 : 5);
      
      doc.text(`Modelo: ${order.device_model}`, margin, yPosition);
      yPosition += lineSpacing;
      if (order.device_serial_number) {
        doc.text(`IMEI: ${order.device_serial_number}`, margin, yPosition);
        yPosition += lineSpacing;
      }
      if (order.device_unlock_code) {
        doc.text(`Passcode: ${order.device_unlock_code}`, margin, yPosition);
        yPosition += lineSpacing;
      }
      yPosition += lineSpacing;

      // Servicios - con interlineado adaptativo
      if (services.length > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("SERVICIOS", margin, yPosition);
        yPosition += 8;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const serviceLineSpacing = maxEquipmentSectionHeight > 200 ? 6 : 5;
        services.forEach((service) => {
          doc.text(`• ${service.name}`, margin, yPosition);
          yPosition += serviceLineSpacing;
        });
        yPosition += 8;
      }

      // Valor presupuestado - alineado al medio
      yPosition += 5;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const valorPresupuestadoText = "VALOR PRESUPUESTADO";
      const valorPresupuestadoWidth = doc.getTextWidth(valorPresupuestadoText);
      doc.text(valorPresupuestadoText, (pageWidth - valorPresupuestadoWidth) / 2, yPosition);
      yPosition += 10;
      
      // Calcular total con IVA (esta función no tiene acceso a allDevices, usar serviceValue + replacementCost)
      const totalConIva = serviceValue + replacementCost;
      const totalSinIva = totalConIva / 1.19;
      const iva = totalConIva - totalSinIva;
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const subtotalText = `Subtotal: ${formatCLP(totalSinIva, { withLabel: false })}`;
      const subtotalWidth = doc.getTextWidth(subtotalText);
      doc.text(subtotalText, (pageWidth - subtotalWidth) / 2, yPosition);
      yPosition += 7;
      
      const ivaText = `IVA (19%): ${formatCLP(iva, { withLabel: false })}`;
      const ivaWidth = doc.getTextWidth(ivaText);
      doc.text(ivaText, (pageWidth - ivaWidth) / 2, yPosition);
      yPosition += 7;
      
      doc.setDrawColor(150, 150, 150);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 12; // Separar más la línea del total
      
      // Total - alineado al medio y destacado
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const totalText = `TOTAL: ${formatCLP(totalConIva, { withLabel: true })}`;
      const totalWidth = doc.getTextWidth(totalText);
      doc.text(totalText, (pageWidth - totalWidth) / 2, yPosition);
      yPosition += 15;

      // QR Code en el medio
      if (qrDataUrl) {
        const qrSize = 60;
        const qrX = (pageWidth - qrSize) / 2; // Centrado
        doc.addImage(qrDataUrl, "PNG", qrX, yPosition, qrSize, qrSize);
        yPosition += qrSize + 15;
      }

      // Recuadro de firma
      // signatureBoxHeight ya está declarado arriba (línea 1119) para el cálculo de espacio
      const signatureBoxWidth = contentWidth;
      doc.setFillColor(230, 230, 230);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, signatureBoxWidth, signatureBoxHeight, "FD");
      yPosition += signatureBoxHeight + 10; // Aumentado de 6 a 10
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const signatureText = "FIRMA DEL CLIENTE";
      const signatureTextWidth = doc.getTextWidth(signatureText);
      doc.text(signatureText, (pageWidth - signatureTextWidth) / 2, yPosition);
      yPosition += 18; // Aumentado de 12 a 18

      // === GARANTÍA Y CONDICIONES - Layout Adaptativo ===
      // Calcular espacio disponible para garantías
      const warrantySectionStartY = yPosition;
      const availableWarrantyHeight = pageHeight - warrantySectionStartY - bottomMargin - 10;
      
      // Ajustar tamaño de fuente si el espacio es limitado
      let warrantyFontSize = 8;
      if (availableWarrantyHeight < 40) {
        warrantyFontSize = 7;
      } else if (availableWarrantyHeight < 30) {
        warrantyFontSize = 6;
      }
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const warrantyTitle = "GARANTÍA Y CONDICIONES DEL SERVICIO";
      const warrantyTitleWidth = doc.getTextWidth(warrantyTitle);
      const warrantyTitleX = Math.max(margin, Math.min((pageWidth - warrantyTitleWidth) / 2, pageWidth - margin - warrantyTitleWidth));
      doc.text(warrantyTitle, warrantyTitleX, yPosition);
      yPosition += 10;
      
      doc.setFontSize(warrantyFontSize);
      doc.setFont("helvetica", "normal");
      const warrantyText = "Las condiciones generales del servicio, garantías y exclusiones fueron informadas de forma previa y enviadas al correo electrónico del cliente. La firma de este documento constituye aceptación expresa de dichas condiciones.";
      const warrantyLines = doc.splitTextToSize(warrantyText, contentWidth);
      
      // Interlineado adaptativo
      const warrantyLineSpacing = warrantyFontSize === 6 ? 5 : (warrantyFontSize === 7 ? 5.5 : 6);
      
      warrantyLines.forEach((line: string) => {
        // Verificar que no exceda el espacio disponible
        if (yPosition + warrantyLineSpacing > pageHeight - bottomMargin - 5) {
          return; // No dibujar más líneas si excede
        }
        const lineWidth = doc.getTextWidth(line);
        const lineX = Math.max(margin, Math.min((pageWidth - lineWidth) / 2, pageWidth - margin - lineWidth));
        doc.text(line, lineX, yPosition);
        yPosition += warrantyLineSpacing;
      });

      const pdfOutput = doc.output("blob");
      return pdfOutput;
    } catch (error) {
      console.error("Error generando PDF boleta:", error);
      throw error;
    }
  }

  async function generatePDFEtiqueta() {
    try {
      // Cargar configuración del sistema (forzar recarga para obtener datos más recientes)
      // Aunque este formato no muestra garantías, cargamos settings para consistencia
      await getSystemSettings(true);
      
      // Cargar datos actualizados de la sucursal desde la base de datos
      let branchData = null;
      
      // Si order.sucursal es un array (relación de Supabase), tomar el primer elemento
      if (order.sucursal) {
        branchData = Array.isArray(order.sucursal) ? order.sucursal[0] : order.sucursal;
      }
      
      // Siempre intentar cargar datos actualizados desde la BD
      if (order.sucursal_id) {
        const { data: updatedBranch, error: branchError } = await supabase
          .from("branches")
          .select("*")
          .eq("id", order.sucursal_id)
          .single();
        
        if (!branchError && updatedBranch) {
          branchData = updatedBranch;
        }
      }

      // Crear orden con datos actualizados de sucursal
      const orderForPDF = {
        ...order,
        sucursal: branchData,
      };

      // Formato etiqueta 80mm x 2000mm (mismo formato que boleta)
      const widthMM = 80;
      const heightMM = 2000;
      const width = widthMM * 2.83465;
      const height = heightMM * 2.83465;
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [width, height]
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Título centrado
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const titleText = "ETIQUETA DE ORDEN";
      const titleWidth = doc.getTextWidth(titleText);
      doc.text(titleText, (pageWidth - titleWidth) / 2, yPosition);
      yPosition += 15;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      // Número de orden destacado
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Orden: ${order.order_number}`, margin, yPosition);
      yPosition += 12;

      // Nombre y WhatsApp del cliente (dato clave en la etiqueta)
      doc.setFontSize(8);
      if (order.customer) {
        // Nombre
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", margin, yPosition);
        doc.setFont("helvetica", "normal");
        const customerLines = doc.splitTextToSize(order.customer.name, contentWidth - 60);
        doc.text(customerLines, margin + 60, yPosition);
        yPosition += customerLines.length * 6 + 5;

        // Teléfono / WhatsApp del cliente (siempre que exista teléfono)
        if (order.customer.phone) {
          doc.setFont("helvetica", "bold");
          doc.text("WhatsApp:", margin, yPosition);
          doc.setFont("helvetica", "normal");
          const phoneText = `${order.customer.phone_country_code || "+56"} ${order.customer.phone}`;
          const phoneLines = doc.splitTextToSize(phoneText, contentWidth - 60);
          doc.text(phoneLines, margin + 60, yPosition);
          yPosition += phoneLines.length * 6 + 5;
        }
      }

      // Dispositivo
      doc.setFont("helvetica", "bold");
      doc.text("Dispositivo:", margin, yPosition);
      doc.setFont("helvetica", "normal");
      const deviceLines = doc.splitTextToSize(order.device_model, contentWidth - 60);
      doc.text(deviceLines, margin + 60, yPosition);
      yPosition += deviceLines.length * 6 + 5;

      // Passcode / Patrón (movido encima de la descripción del problema)
      if (order.device_unlock_code || (Array.isArray(order.device_unlock_pattern) && order.device_unlock_pattern.length > 0)) {
        if (order.device_unlock_code) {
          doc.setFont("helvetica", "bold");
          doc.text("Passcode:", margin, yPosition);
          doc.setFont("helvetica", "normal");
          doc.text(order.device_unlock_code, margin + 60, yPosition);
          yPosition += 8;
        }

        // Mostrar patrón como secuencia de números 1–9 (para que quede registrado en la etiqueta)
        if (Array.isArray(order.device_unlock_pattern) && order.device_unlock_pattern.length > 0) {
          const patternText = order.device_unlock_pattern.join("");
          doc.setFont("helvetica", "bold");
          doc.text("Patrón:", margin, yPosition);
          doc.setFont("helvetica", "normal");
          doc.text(patternText, margin + 60, yPosition);
          yPosition += 8;
        }

        yPosition += 4; // Espacio extra antes del problema
      }

      // === PROBLEMA O DESCRIPCIÓN - Layout Adaptativo ===
      // Calcular espacio disponible para el resto del documento
      const problemSectionStartY = yPosition;
      const localInfoHeight = 30; // Estimado para local y fecha compromiso
      const bottomMarginEtiqueta = margin;
      const reservedSpaceEtiqueta = localInfoHeight + bottomMarginEtiqueta + 10; // Reducido de 15 a 10
      
      // NO truncar - permitir que la descripción use todo el espacio disponible
      // El formato tiene altura de 2000mm, así que puede crecer dinámicamente
      doc.setFont("helvetica", "bold");
      doc.text("Problema:", margin, yPosition);
      doc.setFont("helvetica", "normal");
      
      // Dividir el texto en líneas sin truncar
      let problemLines = doc.splitTextToSize(order.problem_description || "", contentWidth - 60);
      
      // Calcular espacio disponible dinámicamente
      const availableProblemHeight = pageHeight - problemSectionStartY - reservedSpaceEtiqueta;
      
      // Calcular interlineado adaptativo para que TODO el texto quepa sin apretarse
      // Aumentar el interlineado base para mejor legibilidad
      let problemLineSpacing = 8; // Espaciado aumentado de 6 a 8 para mejor legibilidad
      if (problemLines.length > 0) {
        // Calcular el interlineado necesario para que todas las líneas quepan
        const requiredHeight = problemLines.length * 8; // Altura necesaria con interlineado aumentado
        if (requiredHeight > availableProblemHeight) {
          // Ajustar interlineado para que quepa todo, pero mantener mínimo de 6 puntos
          problemLineSpacing = Math.max(6, availableProblemHeight / problemLines.length);
        } else {
          // Hay espacio suficiente, usar interlineado aumentado
          problemLineSpacing = 8;
        }
      }
      
      // Dibujar TODAS las líneas con el interlineado adaptativo calculado
      // No truncar, solo adaptar el espaciado
      let currentProblemY = yPosition;
      problemLines.forEach((line: string) => {
        doc.text(line, margin + 60, currentProblemY);
        currentProblemY += problemLineSpacing;
      });
      
      // Actualizar yPosition basándose en todas las líneas dibujadas
      yPosition = currentProblemY + 8;

      // Local asignado
      if (orderForPDF.sucursal?.name) {
        doc.setFont("helvetica", "bold");
        doc.text("Local:", margin, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(orderForPDF.sucursal.name, margin + 50, yPosition);
        yPosition += 12; // Aumentado de 8 a 12
      }

      // Fecha de compromiso
      if (order.commitment_date) {
        doc.setFont("helvetica", "bold");
        doc.text("Fecha Compromiso:", margin, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(formatDate(order.commitment_date), margin + 90, yPosition);
      }

      const pdfOutput = doc.output("blob");
      return pdfOutput;
    } catch (error) {
      console.error("Error generando PDF etiqueta:", error);
      throw error;
    }
  }

  async function handlePrint(format: 'a4' | 'boleta' | 'etiqueta', e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoading(true);
    try {
      let pdfToPrint: Blob;
      
      if (format === 'a4') {
        pdfToPrint = pdfBlob!;
      } else if (format === 'boleta') {
        pdfToPrint = await generatePDFBoleta();
      } else {
        pdfToPrint = await generatePDFEtiqueta();
      }

      const printWindow = window.open(URL.createObjectURL(pdfToPrint), '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
      setShowPrintMenu(false);
    } catch (error) {
      console.error("Error imprimiendo:", error);
      alert("Error al generar el PDF para imprimir");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!pdfBlob) return;
    
    try {
      // Método compatible con Android y móviles
      const fileName = `Orden_${order.order_number}_${formatDate(order.created_at).replace(/\//g, "-")}.pdf`;
      
      // Crear URL del blob
      const url = URL.createObjectURL(pdfBlob);
      
      // Método 1: Usar link de descarga (funciona en la mayoría de navegadores)
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      link.setAttribute('target', '_blank'); // Para Android
      
      // Agregar al DOM, hacer click y remover
      document.body.appendChild(link);
      link.click();
      
      // Limpiar después de un momento
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 200);
      
      // Método 2: Fallback con jsPDF (si está disponible)
      if (pdfDoc) {
        try {
          pdfDoc.save(fileName);
        } catch (pdfError) {
          console.log("Método jsPDF.save falló, usando método de link");
        }
      }
      
      // Método 3: Para Android Chrome, intentar abrir en nueva pestaña como último recurso
      if (isMobile && /Android/i.test(navigator.userAgent)) {
        setTimeout(() => {
          // Si después de 500ms no se descargó, abrir en nueva pestaña
          const newUrl = URL.createObjectURL(pdfBlob);
          window.open(newUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(newUrl), 1000);
        }, 500);
      }
    } catch (error) {
      console.error("Error descargando PDF:", error);
      // Fallback final: abrir en nueva ventana
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
      }
    }
  }

  function handleWhatsApp(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!order.customer || !pdfBlob) return;
    
    const phone = order.customer.phone_country_code
      ? order.customer.phone_country_code.replace("+", "") + order.customer.phone.replace(/\D/g, "")
      : "56" + order.customer.phone.replace(/\D/g, "");
    
    const message = encodeURIComponent(
      `Hola ${order.customer.name},\n\nTu orden ${order.order_number} ha sido creada.\n\nTotal: ${formatCLP(order.total_repair_cost)}\n\nDetalle de servicios:\n${services.map(s => `• ${s.name}`).join("\n")}`
    );
    
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Vista Previa del PDF</h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="text-white hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-600">Generando PDF...</p>
            </div>
          ) : pdfBlob ? (
            isMobile ? (
              // Vista para móviles: mostrar información y botón de descarga prominente
              <div className="bg-white shadow-lg mx-auto p-6 max-w-md rounded-lg">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Orden {order.order_number}
                  </h3>
                  <p className="text-slate-600 mb-4">
                    PDF generado exitosamente
                  </p>
                  <p className="text-sm text-gray-600 mb-6">
                    En dispositivos móviles, el PDF se descarga automáticamente. 
                    Si no se descargó, usa el botón de abajo.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full px-6 py-4 bg-brand text-white rounded-lg font-bold text-lg shadow-md hover:bg-brand-dark transition-colors flex items-center justify-center gap-3"
                  >
                    <span>⬇️</span>
                    <span>Descargar PDF</span>
                  </button>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Cliente:</strong> {order.customer?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Total:</strong> {formatCLP(order.total_repair_cost)}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Fecha:</strong> {formatDate(order.created_at)}
                  </p>
                </div>
              </div>
            ) : (
              // Vista para desktop: iframe con preview
              <div className="bg-white shadow-lg mx-auto" style={{ width: "210mm" }}>
                <iframe
                  src={URL.createObjectURL(pdfBlob)}
                  className="w-full border-0"
                  style={{ minHeight: "297mm", width: "210mm" }}
                  title="PDF Preview"
                />
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-600">Error al generar PDF</p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-200 flex-wrap">
          {!isMobile && (
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark flex items-center gap-2 shadow-sm"
              disabled={!pdfBlob}
            >
              ⬇️ Descargar
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
            disabled={!order.customer || !pdfBlob}
          >
            📱 Enviar por WhatsApp
          </button>
          <div className="relative" ref={printMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPrintMenu(!showPrintMenu);
              }}
              className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark flex items-center gap-2 shadow-sm"
              disabled={!pdfBlob}
            >
              🖨️ Imprimir
              {showPrintMenu ? ' ▲' : ' ▼'}
            </button>
            {showPrintMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] z-50">
                <button
                  type="button"
                  onClick={(e) => handlePrint('a4', e)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-200 first:rounded-t-lg"
                >
                  📄 Formato A4 (Carta)
                </button>
                <button
                  type="button"
                  onClick={(e) => handlePrint('boleta', e)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-200"
                >
                  📋 Formato 80x2000 (Boleta)
                </button>
                <button
                  type="button"
                  onClick={(e) => handlePrint('etiqueta', e)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 last:rounded-b-md"
                >
                  🏷️ Formato Etiqueta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
