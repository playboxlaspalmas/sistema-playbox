import jsPDF from "jspdf";
import QRCode from "qrcode";
import { supabase } from "./supabase";
import type { WorkOrder, Service, Customer, Branch, DeviceChecklistItem } from "@/types";
import { formatCLP } from "./currency";
import { formatDate, formatDateTime } from "./date";
import { getSystemSettings } from "./settings";

/**
 * Optimiza una imagen Blob convirtiéndola a JPEG con compresión
 */
async function optimizeImageBlob(blob: Blob, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener contexto del canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      // Convertir a JPEG con compresión
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(img.src);
      resolve(optimizedDataUrl);
    };
    img.onerror = reject;
    const objectUrl = URL.createObjectURL(blob);
    img.src = objectUrl;
  });
}

/**
 * Optimiza una imagen desde data URL convirtiéndola a JPEG con compresión
 */
async function optimizeImageDataUrl(dataUrl: string, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener contexto del canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      // Convertir a JPEG con compresión
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(optimizedDataUrl);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function generatePDFBlob(
  order: WorkOrder & { customer?: Customer; sucursal?: Branch | null },
  services: Service[],
  serviceValue: number,
  replacementCost: number,
  warrantyDays: number,
  checklistData?: Record<string, 'ok' | 'damaged' | 'replaced' | 'no_probado'> | null,
  notes?: string[],
  orderServices?: Array<{ quantity: number; unit_price: number; total_price: number; service_name: string; description?: string | null }>
): Promise<Blob> {
  // Cargar datos actualizados de la sucursal desde la base de datos
  // Esto asegura que el PDF siempre refleje los datos más recientes de la sucursal
  let branchData = order.sucursal;
  
  if (order.sucursal_id) {
    const { data: updatedBranch, error: branchError } = await supabase
      .from("branches")
      .select("*")
      .eq("id", order.sucursal_id)
      .single();
    
    if (branchError) {
      console.error("[PDF] Error cargando sucursal:", branchError);
    }
    
    if (updatedBranch) {
      branchData = updatedBranch;
      console.log("[PDF] Sucursal cargada:", {
        id: updatedBranch.id,
        name: updatedBranch.name,
        razon_social: updatedBranch.razon_social,
        hasAddress: !!updatedBranch.address,
        hasPhone: !!updatedBranch.phone,
        hasEmail: !!updatedBranch.email
      });
    } else {
      console.warn("[PDF] No se encontró sucursal con ID:", order.sucursal_id);
    }
  } else {
    console.warn("[PDF] Orden no tiene sucursal_id, buscando Sucursal 1 por defecto");
    
    // Si no hay sucursal_id, buscar "Sucursal 1" por defecto
    // Esto es especialmente útil cuando un admin crea una orden sin sucursal asignada
    const { data: defaultBranch, error: defaultBranchError } = await supabase
      .from("branches")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (!defaultBranchError && defaultBranch) {
      branchData = defaultBranch;
      console.log("[PDF] Usando sucursal por defecto (primera creada):", {
        id: defaultBranch.id,
        name: defaultBranch.name,
        razon_social: defaultBranch.razon_social
      });
    } else {
      console.warn("[PDF] No se pudo cargar sucursal por defecto");
    }
  }

  // Crear orden con datos actualizados de sucursal
  const orderForPDF = {
    ...order,
    sucursal: branchData,
  };
  
  // Debug: Verificar datos de sucursal
  if (!orderForPDF.sucursal) {
    console.warn("[PDF] ADVERTENCIA: orderForPDF.sucursal es null/undefined");
  } else {
    console.log("[PDF] Datos de sucursal para PDF:", {
      name: orderForPDF.sucursal.name,
      razon_social: orderForPDF.sucursal.razon_social,
      address: orderForPDF.sucursal.address,
      phone: orderForPDF.sucursal.phone,
      email: orderForPDF.sucursal.email
    });
  }

  // Cargar items del checklist si existen
  let checklistItems: DeviceChecklistItem[] = [];
  if (checklistData && Object.keys(checklistData).length > 0) {
    const { data } = await supabase
      .from("device_checklist_items")
      .select("*")
      .eq("device_type", order.device_type)
      .order("item_order");
    if (data) {
      checklistItems = data;
    }
  }

  // Asegurar formato A4 (tamaño carta)
  // Habilitar compresión para reducir el tamaño del PDF
  const doc = new jsPDF({
    format: 'a4',
    unit: 'mm',
    compress: true // Habilitar compresión del PDF
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Cargar configuración del sistema (forzar recarga para obtener garantías más recientes)
  const settings = await getSystemSettings(true);

  // Color de las franjas (gris claro para ahorrar tinta)
  const stripeColor: [number, number, number] = [220, 220, 220]; // Gris claro
  const darkStripeColor: [number, number, number] = [200, 200, 200]; // Gris medio claro

  // Generar QR Code con menor resolución para reducir tamaño del PDF
  let qrDataUrl = "";
  try {
    // Reducir aún más el tamaño del QR (40px en lugar de 50px) y usar corrección de errores baja para menor tamaño
    qrDataUrl = await QRCode.toDataURL(
      `https://ordenes.playbox.cl/${order.order_number}`,
      { width: 40, margin: 0, errorCorrectionLevel: 'L' } // Menor resolución y corrección de errores baja = menor tamaño
    );
    console.log("[PDF] QR Code generado con tamaño optimizado (40px, errorCorrectionLevel: L)");
  } catch (error) {
    console.error("Error generando QR:", error);
  }

  // Cargar logo desde configuración y optimizarlo para reducir tamaño del PDF
  let logoDataUrl = "";
  let logoFormat = "PNG";
  try {
    if (settings.pdf_logo.url.startsWith("data:")) {
      // Si ya es base64, optimizarlo convirtiéndolo a JPEG con compresión más agresiva
      try {
        logoDataUrl = await optimizeImageDataUrl(settings.pdf_logo.url, 0.6); // 60% de calidad para reducir más el tamaño
        logoFormat = "JPEG";
        console.log("[PDF] Logo optimizado a JPEG (60% calidad)");
      } catch (optError) {
        console.warn("[PDF] Error optimizando logo, usando original:", optError);
        logoDataUrl = settings.pdf_logo.url;
      }
    } else {
      const logoResponse = await fetch(settings.pdf_logo.url);
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        // Convertir a JPEG con compresión más agresiva para reducir tamaño
        try {
          logoDataUrl = await optimizeImageBlob(logoBlob, 0.6); // 60% de calidad para reducir más el tamaño
          logoFormat = "JPEG";
          console.log("[PDF] Logo optimizado a JPEG (60% calidad)");
        } catch (optError) {
          console.warn("[PDF] Error optimizando logo, usando original:", optError);
          logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
        }
      }
    }
  } catch (error) {
    console.error("Error cargando logo:", error);
  }

  // === HEADER CON FRANJA AZUL OSCURA ===
  // Reducir altura del header (eliminado QR)
  const headerHeight = 25; // Reducido de 28 a 25 para más espacio
  doc.setFillColor(...darkStripeColor);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Logo de la empresa (sobre la franja, izquierda)
  if (logoDataUrl) {
    const logoHeight = settings.pdf_logo.height;
    const logoWidth = settings.pdf_logo.width;
    const logoY = (headerHeight - logoHeight) / 2;
    // Usar JPEG si fue optimizado, PNG si no
    doc.addImage(logoDataUrl, logoFormat as "PNG" | "JPEG", margin, logoY, logoWidth, logoHeight);
  }

  // N° Orden en caja pequeña (CENTRO del header) - solo el texto "N° Orden:" dentro
  doc.setFillColor(180, 180, 180); // Gris mucho más claro pero que se distinga del header
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const orderLabelText = "N° Orden:";
  const orderLabelWidth = doc.getTextWidth(orderLabelText);
  const orderBoxWidth = orderLabelWidth + 6; // Solo el ancho necesario + padding
  const orderBoxHeight = 7; // Altura más pequeña
  const orderBoxX = (pageWidth - orderBoxWidth) / 2;
  const orderBoxY = 5; // Ajustado para header más pequeño
  doc.rect(orderBoxX, orderBoxY, orderBoxWidth, orderBoxHeight, "F");
  
  // Texto "N° Orden:" dentro del cuadro (blanco)
  doc.setTextColor(255, 255, 255);
  doc.text(orderLabelText, orderBoxX + 3, orderBoxY + 5);
  
  // Número de orden y fecha fuera del cuadro, abajo (negro)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const orderNumberY = orderBoxY + orderBoxHeight + 3; // Reducido de 4 a 3
  doc.text(order.order_number, orderBoxX + (orderBoxWidth - doc.getTextWidth(order.order_number)) / 2, orderNumberY);
  doc.setFontSize(7);
  const dateTimeText = formatDateTime(order.created_at);
  const dateTimeY = orderNumberY + 3; // Reducido de 4 a 3
  doc.text(dateTimeText, orderBoxX + (orderBoxWidth - doc.getTextWidth(dateTimeText)) / 2, dateTimeY);

  // QR Code ELIMINADO según solicitud del usuario

  // ELIMINAR espacio excesivo después del header (área marcada en rojo)
  yPosition = headerHeight + 2; // Casi pegado al header (solo 2 puntos de separación)

  // === PANEL NEGOCIO (Izquierda) ===
  const panelStartY = yPosition;
  
  // Ancho disponible para contenido de paneles
  const panelWidth = (contentWidth - 10) / 2;
  const panelLineHeight = 6;
  // Ancho disponible para el VALOR del texto (desde donde empieza el valor hasta el final del panel)
  // El valor se dibuja en clientPanelX + 25 o margin + 25, y el panel termina en clientPanelX + panelWidth
  // Entonces el ancho disponible es: panelWidth - 25 (margen izquierdo del valor) - 5 (margen derecho)
  const panelContentWidth = panelWidth - 30; // Ancho desde donde empieza el valor hasta el final del panel
  
  // Calcular altura necesaria PRECISAMENTE antes de dibujar
  // Usar tamaño de fuente estándar para el cálculo
  doc.setFontSize(9);
  let tempPanelY = yPosition + 8; // Padding superior
  // Usar name o razon_social, o un valor por defecto
  const branchName = orderForPDF.sucursal?.name || orderForPDF.sucursal?.razon_social || "Sucursal";
  
  // Calcular líneas de texto reales
  const nameLines = doc.splitTextToSize(branchName, panelContentWidth);
  tempPanelY += nameLines.length * panelLineHeight;
  
  if (orderForPDF.sucursal?.address) {
    const addressLines = doc.splitTextToSize(orderForPDF.sucursal.address, panelContentWidth);
    tempPanelY += addressLines.length * panelLineHeight;
  }
  if (orderForPDF.sucursal?.phone) {
    const phoneLines = doc.splitTextToSize(orderForPDF.sucursal.phone, panelContentWidth);
    tempPanelY += phoneLines.length * panelLineHeight;
  }
  if (orderForPDF.sucursal?.email) {
    const emailLines = doc.splitTextToSize(orderForPDF.sucursal.email, panelContentWidth);
    tempPanelY += emailLines.length * panelLineHeight;
  }
  
  // Altura del panel de negocio
  const businessPanelHeight = tempPanelY - panelStartY + 1; // +1 para padding inferior mínimo
  
  // Calcular altura del panel de cliente primero para obtener fixedPanelHeight
  // (se calcula abajo antes de dibujar)
  
  // Título del panel con franja azul (se dibujará después con la altura fija)

  // === PANEL CLIENTE (Derecha) ===
  const clientPanelX = margin + (contentWidth - 10) / 2 + 10;
  const clientPanelStartY = yPosition;
  
  // Calcular altura necesaria PRECISAMENTE antes de dibujar
  doc.setFontSize(9);
  let tempClientPanelY = yPosition + 8; // Padding superior
  if (order.customer) {
    const customerNameLines = doc.splitTextToSize(order.customer.name, panelContentWidth);
    tempClientPanelY += customerNameLines.length * panelLineHeight;
    
    const phoneText = order.customer.phone_country_code
      ? `${order.customer.phone_country_code} ${order.customer.phone}`
      : order.customer.phone;
    const phoneLines = doc.splitTextToSize(phoneText, panelContentWidth);
    tempClientPanelY += phoneLines.length * panelLineHeight;
    
    const emailLines = doc.splitTextToSize(order.customer.email, panelContentWidth);
    tempClientPanelY += emailLines.length * panelLineHeight;
    
    if (order.customer.address) {
      const addressLines = doc.splitTextToSize(order.customer.address, panelContentWidth);
      tempClientPanelY += addressLines.length * panelLineHeight;
    }
  }
  // Altura del panel de cliente
  const clientPanelHeight = tempClientPanelY - clientPanelStartY + 1; // +1 para padding inferior mínimo
  
  // ALTURA FIJA IGUAL PARA AMBOS PANELES - el panel más alto determina la altura
  const fixedPanelHeight = Math.max(businessPanelHeight, clientPanelHeight);
  
  // Dibujar fondo y borde de AMBOS paneles con ALTURA FIJA
  // El panel NO se deforma - el texto se ajusta dentro
  // panelWidth ya está declarado arriba, no redeclarar
  
  // Panel de negocio (izquierda)
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, panelStartY, panelWidth, fixedPanelHeight, "F");
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, panelStartY, panelWidth, fixedPanelHeight, "S");
  
  // Panel de cliente (derecha)
  doc.setFillColor(250, 250, 250);
  doc.rect(clientPanelX, clientPanelStartY, panelWidth, fixedPanelHeight, "F");
  doc.setDrawColor(200, 200, 200);
  doc.rect(clientPanelX, clientPanelStartY, panelWidth, fixedPanelHeight, "S");
  
  // Títulos de los paneles con franja azul
  doc.setFillColor(...stripeColor);
  doc.rect(margin, yPosition, panelWidth, 8, "F");
  doc.rect(clientPanelX, yPosition, panelWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PLAYBOX", margin + 3, yPosition + 6);
  doc.text("CLIENTE", clientPanelX + 3, yPosition + 6);

  // === CONTENIDO PANEL SUCURSAL (Izquierda) ===
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let branchPanelY = yPosition + 12;

  doc.setFont("helvetica", "bold");
  doc.text("Sucursal:", margin + 3, branchPanelY);
  doc.setFont("helvetica", "normal");
  const nameLinesFinal = doc.splitTextToSize(branchName || "", panelContentWidth);
  if (nameLinesFinal.length > 0) {
    doc.text(nameLinesFinal[0], margin + 25, branchPanelY);
    if (nameLinesFinal.length > 1) {
      for (let i = 1; i < nameLinesFinal.length; i++) {
        branchPanelY += 6;
        doc.text(nameLinesFinal[i], margin + 25, branchPanelY);
      }
    }
    branchPanelY += 6;
  } else {
    branchPanelY += 6;
  }

  if (orderForPDF.sucursal?.address) {
    doc.setFont("helvetica", "bold");
    doc.text("Dirección:", margin + 3, branchPanelY);
    doc.setFont("helvetica", "normal");
    const addressLines = doc.splitTextToSize(orderForPDF.sucursal.address || "", panelContentWidth);
    if (addressLines.length > 0) {
      doc.text(addressLines[0], margin + 25, branchPanelY);
      if (addressLines.length > 1) {
        for (let i = 1; i < addressLines.length; i++) {
          branchPanelY += 6;
          doc.text(addressLines[i], margin + 25, branchPanelY);
        }
      }
      branchPanelY += 6;
    } else {
      branchPanelY += 6;
    }
  }

  if (orderForPDF.sucursal?.phone) {
    doc.setFont("helvetica", "bold");
    doc.text("Teléfono:", margin + 3, branchPanelY);
    doc.setFont("helvetica", "normal");
    const phoneText = doc.splitTextToSize(orderForPDF.sucursal.phone || "", panelContentWidth);
    if (phoneText.length > 0) {
      doc.text(phoneText[0], margin + 25, branchPanelY);
      if (phoneText.length > 1) {
        for (let i = 1; i < phoneText.length; i++) {
          branchPanelY += 6;
          doc.text(phoneText[i], margin + 25, branchPanelY);
        }
      }
      branchPanelY += 6;
    } else {
      branchPanelY += 6;
    }
  }

  if (orderForPDF.sucursal?.email) {
    doc.setFont("helvetica", "bold");
    doc.text("Correo:", margin + 3, branchPanelY);
    doc.setFont("helvetica", "normal");
    const emailText = doc.splitTextToSize(orderForPDF.sucursal.email || "", panelContentWidth);
    if (emailText.length > 0) {
      doc.text(emailText[0], margin + 25, branchPanelY);
      if (emailText.length > 1) {
        for (let i = 1; i < emailText.length; i++) {
          branchPanelY += 6;
          doc.text(emailText[i], margin + 25, branchPanelY);
        }
      }
      branchPanelY += 6;
    } else {
      branchPanelY += 6;
    }
  }

  if (order.customer) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    // Centrar verticalmente el contenido dentro del cuadro (más espacio arriba)
    let clientPanelY = yPosition + 12; // Aumentar solo el margen superior para centrar el texto

    doc.setFont("helvetica", "bold");
    doc.text("Nombre:", clientPanelX + 3, clientPanelY);
    doc.setFont("helvetica", "normal");
    // Texto se ajusta dentro del cuadro fijo - NO se sale
    const customerNameLines = doc.splitTextToSize(order.customer.name || "", panelContentWidth);
    if (customerNameLines.length > 0) {
      // Dibujar cada línea del nombre en posición separada
      customerNameLines.forEach((line: string, index: number) => {
        doc.text(line, clientPanelX + 25, clientPanelY + (index * panelLineHeight));
      });
      // Avanzar panelY después de todas las líneas del nombre
      clientPanelY += customerNameLines.length * panelLineHeight + panelLineHeight;
    } else {
      clientPanelY += panelLineHeight;
    }

    const phoneText = order.customer.phone_country_code
      ? `${order.customer.phone_country_code} ${order.customer.phone}`
      : order.customer.phone;
    doc.setFont("helvetica", "bold");
    doc.text("Teléfono:", clientPanelX + 3, clientPanelY);
    doc.setFont("helvetica", "normal");
    const phoneLines = doc.splitTextToSize(phoneText || "", panelContentWidth);
    if (phoneLines.length > 0) {
      // Dibujar cada línea del teléfono en posición separada
      phoneLines.forEach((line: string, index: number) => {
        doc.text(line, clientPanelX + 25, clientPanelY + (index * panelLineHeight));
      });
      // Avanzar panelY después de todas las líneas del teléfono
      clientPanelY += phoneLines.length * panelLineHeight + panelLineHeight;
    } else {
      clientPanelY += panelLineHeight;
    }

    // Email - Etiqueta y valor en la misma línea, valor a la derecha
    doc.setFont("helvetica", "bold");
    doc.text("Correo:", clientPanelX + 3, clientPanelY);
    doc.setFont("helvetica", "normal");
    const emailLines = doc.splitTextToSize(order.customer.email || "", panelContentWidth);
    if (emailLines.length > 0) {
      // Primera línea a la derecha de la etiqueta
      doc.text(emailLines[0], clientPanelX + 25, clientPanelY);
      // Líneas adicionales debajo, alineadas con la primera línea del valor
      if (emailLines.length > 1) {
        for (let i = 1; i < emailLines.length; i++) {
          clientPanelY += 6; // Interlineado más grande
          doc.text(emailLines[i], clientPanelX + 25, clientPanelY);
        }
      }
      clientPanelY += 6; // Espacio después del campo
    } else {
      clientPanelY += 6; // Si no hay correo, avanzar
    }

    // Dirección - Etiqueta y valor en la misma línea, valor a la derecha
    if (order.customer.address) {
      doc.setFont("helvetica", "bold");
      doc.text("Dirección:", clientPanelX + 3, clientPanelY);
      doc.setFont("helvetica", "normal");
      const addressLines = doc.splitTextToSize(order.customer.address, panelContentWidth);
      if (addressLines.length > 0) {
        // Primera línea a la derecha de la etiqueta
        doc.text(addressLines[0], clientPanelX + 25, clientPanelY);
        // Líneas adicionales debajo, alineadas con la primera línea del valor
        if (addressLines.length > 1) {
          for (let i = 1; i < addressLines.length; i++) {
            clientPanelY += 6; // Interlineado más grande
            doc.text(addressLines[i], clientPanelX + 25, clientPanelY);
          }
        }
        clientPanelY += 6; // Espacio después del campo
      } else {
        clientPanelY += 6; // Si no hay dirección, avanzar
      }
    }
  }

  // Usar la altura fija para continuar
  // ELIMINAR completamente el espacio entre paneles de sucursal/cliente y datos del equipo (área marcada en rojo)
  yPosition = panelStartY + fixedPanelHeight + 0;

  // === RECOPILAR TODOS LOS EQUIPOS ===
  // El primer equipo es el principal (orden principal)
  // Los equipos adicionales están en devices_data (JSONB) o all_devices (pasado desde OrderForm)
  const allDevices: Array<{
    index: number;
    device_type: string;
    device_model: string;
    device_serial_number?: string | null;
    device_unlock_code?: string | null;
    device_unlock_pattern?: number[] | null;
    problem_description: string;
    checklist_data?: Record<string, 'ok' | 'damaged' | 'replaced' | 'no_probado'> | null;
    replacement_cost: number;
    labor_cost: number;
    selected_services?: Array<{ id?: string; name: string; description?: string | null; quantity: number; unit_price: number; total_price: number }>;
  }> = [];

  // Agregar el primer equipo (equipo principal de la orden)
  // Si all_devices ya incluye el primer equipo, usarlo directamente; sino construirlo
  if ((order as any).all_devices && Array.isArray((order as any).all_devices) && (order as any).all_devices.length > 0) {
    // Si viene desde OrderForm o OrdersTable con all_devices, usar el primer elemento
    const firstDeviceData = (order as any).all_devices[0];
    allDevices.push({
      index: 1,
      device_type: firstDeviceData.device_type || order.device_type || "iphone",
      device_model: firstDeviceData.device_model || order.device_model || "",
      device_serial_number: firstDeviceData.device_serial_number || order.device_serial_number || null,
      device_unlock_code: firstDeviceData.device_unlock_code || order.device_unlock_code || null,
      device_unlock_pattern: firstDeviceData.device_unlock_pattern || order.device_unlock_pattern || null,
      problem_description: firstDeviceData.problem_description || order.problem_description || "",
      checklist_data: firstDeviceData.checklist_data || checklistData || null,
      replacement_cost: firstDeviceData.replacement_cost || 0,
      labor_cost: firstDeviceData.labor_cost || 0,
      selected_services: firstDeviceData.selected_services || [],
    });
  } else {
    // Si no hay all_devices, construir el primer equipo desde los datos de la orden
    // Calcular costos del primer equipo: si hay devices_data, restar los costos adicionales
    let firstDeviceReplacementCost = order.replacement_cost || 0;
    let firstDeviceLaborCost = order.labor_cost || 0;
    
    if ((order as any).devices_data && Array.isArray((order as any).devices_data) && (order as any).devices_data.length > 0) {
      // Calcular costos del primer equipo restando los costos de los equipos adicionales
      const additionalDevicesTotalReplacement = ((order as any).devices_data as any[]).reduce(
        (sum: number, device: any) => sum + (device.replacement_cost || 0), 
        0
      );
      const additionalDevicesTotalLabor = ((order as any).devices_data as any[]).reduce(
        (sum: number, device: any) => sum + (device.labor_cost || 0), 
        0
      );
      
      firstDeviceReplacementCost = Math.max(0, (order.replacement_cost || 0) - additionalDevicesTotalReplacement);
      firstDeviceLaborCost = Math.max(0, (order.labor_cost || 0) - additionalDevicesTotalLabor);
    }
    
    allDevices.push({
      index: 1,
      device_type: order.device_type || "iphone",
      device_model: order.device_model || "",
      device_serial_number: order.device_serial_number || null,
      device_unlock_code: order.device_unlock_code || null,
      device_unlock_pattern: order.device_unlock_pattern || null,
      problem_description: order.problem_description || "",
      checklist_data: checklistData || null,
      replacement_cost: firstDeviceReplacementCost,
      labor_cost: firstDeviceLaborCost,
      selected_services: (orderServices && orderServices.length > 0)
        ? orderServices.map(os => ({
            id: (os as any).service_id || (os as any).id,
            name: os.service_name,
            description: (os as any).description || null,
            quantity: os.quantity || 1,
            unit_price: os.unit_price || 0,
            total_price: os.total_price || (os.unit_price || 0) * (os.quantity || 1),
          }))
        : (services || []).map(s => ({
            id: s.id,
            name: s.name,
            description: s.description || null,
            quantity: 1,
            unit_price: s.default_price || 0,
            total_price: s.default_price || 0,
          })),
    });
  }

  // Agregar equipos adicionales si existen
  // IMPORTANTE: Si ya usamos all_devices para el primer equipo, usar all_devices para los adicionales también
  if ((order as any).all_devices && Array.isArray((order as any).all_devices) && (order as any).all_devices.length > 1) {
    // Si viene desde OrderForm o OrdersTable con all_devices, usar los elementos adicionales
    ((order as any).all_devices as any[]).slice(1).forEach((device: any, idx: number) => {
      allDevices.push({
        index: idx + 2,
        device_type: device.device_type || "iphone",
        device_model: device.device_model || "",
        device_serial_number: device.device_serial_number || null,
        device_unlock_code: device.device_unlock_code || null,
        device_unlock_pattern: device.device_unlock_pattern || null,
        problem_description: device.problem_description || "",
        checklist_data: device.checklist_data || null,
        replacement_cost: device.replacement_cost || 0,
        labor_cost: device.labor_cost || 0,
        selected_services: device.selected_services || [],
      });
    });
  } else if ((order as any).devices_data && Array.isArray((order as any).devices_data)) {
    // Si no hay all_devices pero sí devices_data (desde la base de datos con JSONB)
    ((order as any).devices_data as any[]).forEach((device: any, idx: number) => {
      allDevices.push({
        index: idx + 2,
        device_type: device.device_type || "iphone",
        device_model: device.device_model || "",
        device_serial_number: device.device_serial_number || null,
        device_unlock_code: device.device_unlock_code || null,
        device_unlock_pattern: device.device_unlock_pattern || null,
        problem_description: device.problem_description || "",
        checklist_data: device.checklist_data || null,
        replacement_cost: device.replacement_cost || 0,
        labor_cost: device.labor_cost || 0,
        selected_services: device.selected_services || [],
      });
    });
  }
  
  // Debug: Log para verificar que se están cargando los equipos
  console.log("[PDF] Total equipos encontrados:", allDevices.length);
  console.log("[PDF] Equipos:", allDevices.map(d => ({ 
    index: d.index, 
    model: d.device_model,
    selected_services_count: d.selected_services?.length || 0,
    selected_services: d.selected_services 
  })));

  // === PANEL DATOS DEL EQUIPO ===
  const equipmentPanelStartY = yPosition;
  
  // === SISTEMA DE CÁLCULO DE ESPACIO DINÁMICO ===
  // Calcular espacio disponible ANTES de dibujar el panel
  // Necesitamos espacio para: garantías + cuadro de firma + márgenes
  // pageHeight ya está declarado arriba, no redeclarar
  const sigBoxHeight = 18;
  const sigTextHeight = 6;
  const spaceAfterWarranty = 1; // Reducido al mínimo para maximizar espacio de garantías
  const bottomMargin = 1; // Mínimo absoluto - firma al final de la hoja
  const signatureTextSpacing = 4; // Espacio entre el cuadro de firma y el texto "FIRMA DEL CLIENTE" (reducido de 5 a 4)
  const spaceNeededForSignature = sigBoxHeight + sigTextHeight + spaceAfterWarranty + bottomMargin;
  const warrantyTitleHeight = 6;
  const warrantyPaddingTop = 4; // Reducido para dar más espacio al contenido
  const warrantyPaddingBottom = 2; // Reducido para maximizar espacio
  // Calcular altura mínima de garantías basada en el número de políticas
  const warrantyText = settings.warranty_policies.policies.map(policy => {
    return policy.replace("{warrantyDays}", warrantyDays.toString());
  });
  // CALCULAR espacio mínimo necesario para garantías de forma más realista
  // Reducir el espacio reservado inicialmente para dar más flexibilidad
  const minHeightPerWarranty = 3.5; // Reducido para dar más espacio a equipos
  const warrantyMinHeight = Math.max(25, warrantyText.length * minHeightPerWarranty); // Mínimo reducido
  const spaceNeededForWarranty = warrantyTitleHeight + warrantyPaddingTop + warrantyMinHeight + warrantyPaddingBottom;
  const totalSpaceNeeded = spaceNeededForWarranty + spaceNeededForSignature;
  // Reducir margen para dar más espacio a los equipos
  const maxEquipmentPanelHeight = Math.max(120, pageHeight - equipmentPanelStartY - totalSpaceNeeded - 3); // Reducido margen
  
  // Altura estimada inicial del panel (será ajustada dinámicamente)
  const estimatedPanelHeight = Math.min(300, maxEquipmentPanelHeight);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, yPosition, contentWidth, estimatedPanelHeight, "F");
  
  doc.setFillColor(...stripeColor);
  doc.rect(margin, yPosition, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL EQUIPO", margin + 3, yPosition + 6);

  yPosition += 12;

  // Tabla
  const tableY = yPosition;
  const tableHeaderHeight = 10;
  const colWidths = [10, 32, 95, 37];
  let colX = margin + 3;

  doc.setFillColor(230, 230, 230);
  const totalTableWidth = Math.min(colWidths.reduce((sum, w) => sum + w, 0), contentWidth - 6);
  doc.rect(margin + 3, tableY, totalTableWidth, 7, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("#", colX + 2, tableY + 5);
  colX += colWidths[0];
  doc.text("Modelo", colX + 2, tableY + 5);
  colX += colWidths[1];
  doc.text("Nota [Descripción]", colX + 2, tableY + 5);
  colX += colWidths[2];
  const totalHeaderText = "Total";
  const totalHeaderWidth = doc.getTextWidth(totalHeaderText);
  doc.text(totalHeaderText, colX + colWidths[3] - totalHeaderWidth - 2, tableY + 5);

  yPosition = tableY + 10;

  // === MOSTRAR TODOS LOS EQUIPOS EN FILAS DE LA TABLA ===
  // Iterar sobre todos los equipos con layout adaptativo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  // Calcular espacio disponible para equipos
  const equipmentPanelHeaderHeight = 12;
  const totalBoxHeight = 20;
  const spacingBetweenSections = 5;
  const reservedHeight = equipmentPanelHeaderHeight + tableHeaderHeight + totalBoxHeight + spacingBetweenSections;
  const maxItemsZoneHeight = Math.max(100, maxEquipmentPanelHeight - reservedHeight - 10);
  const numberOfDevices = allDevices.length;
  const minHeightPerDevice = 15;
  const availableHeightPerDevice = Math.max(minHeightPerDevice, (maxItemsZoneHeight - (numberOfDevices - 1) * spacingBetweenSections) / numberOfDevices);
  
  // Tipografía adaptativa
  let adaptiveFontSize = 8;
  if (numberOfDevices > 2) {
    adaptiveFontSize = 7;
  }
  if (numberOfDevices > 3) {
    adaptiveFontSize = 6;
  }
  doc.setFontSize(adaptiveFontSize);
  
  for (let deviceIndex = 0; deviceIndex < allDevices.length; deviceIndex++) {
    const device = allDevices[deviceIndex];
  const equipmentRowY = yPosition;
  colX = margin + 3;
    
    // Número de equipo
    doc.text(device.index.toString(), colX, yPosition);
  colX += colWidths[0];
  
    // Construir el texto del modelo con identificación clara del equipo
    let modelText = `EQUIPO ${device.index}\n${device.device_model || ""}`;
    if (device.device_serial_number) {
      modelText += `\nIMEI: ${device.device_serial_number}`;
    }
    if (device.device_unlock_code) {
      modelText += `\nPASSCODE: ${device.device_unlock_code}`;
    }
    if (device.device_unlock_pattern && Array.isArray(device.device_unlock_pattern)) {
      modelText += `\nPASSCODE: ${device.device_unlock_pattern.join("")}`;
    }
    
    // Dividir el texto del modelo en líneas
  const modelColWidth = colWidths[1] - 4;
  const modelLines = doc.splitTextToSize(modelText, modelColWidth);
  
  colX += colWidths[1];
  
    // Construir la descripción del problema con identificación clara del equipo
    let deviceDescription = `EQUIPO ${device.index} - ${device.problem_description || ""}`;
    
    // Notas adicionales (solo para el primer equipo)
    if (deviceIndex === 0 && notes && notes.length > 0) {
    if (deviceDescription) deviceDescription += "\n";
    notes.forEach((note) => {
      deviceDescription += `${note}\n`;
    });
  }
  
    // Dividir el texto en líneas que quepan en el ancho de la columna
  const descriptionColWidth = colWidths[2] - 6;
  
    // Dividir la descripción en líneas sin comprimir para evitar textos montados
    doc.setFontSize(adaptiveFontSize);
    const descriptionLines = doc.splitTextToSize(deviceDescription || "-", descriptionColWidth);
    const descLineSpacing = Math.max(6, adaptiveFontSize * 1.1);
    
    // Dibujar modelo (izquierda)
    doc.setFontSize(adaptiveFontSize);
    let modelY = yPosition;
    const modelLineSpacing = Math.max(6, adaptiveFontSize * 1.1);
    modelLines.forEach((line: string) => {
      doc.text(line, margin + 3 + colWidths[0] + 2, modelY);
      modelY += modelLineSpacing;
    });
    
    // Dibujar descripción (centro)
  let descY = yPosition;
  descriptionLines.forEach((line: string) => {
      doc.text(line, colX + 2, descY);
    descY += descLineSpacing;
  });
  
    // Calcular altura real usada por este equipo
    const modelHeight = Math.max(7, modelLines.length * modelLineSpacing);
    const descHeight = Math.max(7, descriptionLines.length * descLineSpacing);
    const deviceRowHeight = Math.max(modelHeight, descHeight);
    
    // Mostrar total del equipo
    const deviceTotal = (device.replacement_cost || 0) + (device.labor_cost || 0);
    const deviceTotalText = formatCLP(deviceTotal, { withLabel: false });
  
  colX = margin + 3 + colWidths[0] + colWidths[1] + colWidths[2];
    doc.setFontSize(adaptiveFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const deviceTotalWidth = doc.getTextWidth(deviceTotalText);
    const deviceTotalX = colX + colWidths[3] - deviceTotalWidth - 2;
    doc.text(deviceTotalText, deviceTotalX, equipmentRowY);
    
    // Mostrar detalles del total (repuesto + servicio) de manera discreta debajo
    doc.setFontSize(Math.max(5, adaptiveFontSize * 0.65));
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    const deviceDetailText = `${formatCLP(device.replacement_cost || 0, { withLabel: false })} + ${formatCLP(device.labor_cost || 0, { withLabel: false })}`;
    const deviceDetailWidth = doc.getTextWidth(deviceDetailText);
    const deviceDetailX = colX + colWidths[3] - deviceDetailWidth - 2;
    doc.text(deviceDetailText, deviceDetailX, equipmentRowY + 4);
    
    // Restaurar valores por defecto
    doc.setFontSize(adaptiveFontSize);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    // Actualizar posición Y después de los datos del equipo
    yPosition = equipmentRowY + deviceRowHeight + 2;
    
    // === MOSTRAR SERVICIOS DEL EQUIPO (ANTES DEL CHECKLIST) ===
    const deviceServices = device.selected_services || [];
    console.log(`[PDF] Equipo ${device.index} - Servicios encontrados:`, deviceServices.length, deviceServices);
    
    // SIEMPRE mostrar los servicios si existen, sin restricciones de espacio
    if (deviceServices.length > 0) {
      doc.setFontSize(adaptiveFontSize);
      const serviceLineSpacing = Math.max(6, adaptiveFontSize * 1.1);
      
      // Mostrar título "Servicios a realizar" antes de los servicios
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Servicios a realizar - Equipo ${device.index}:`, margin + 3, yPosition);
      yPosition += 3; // Reducido de 6 a 3
      
      deviceServices.forEach((serviceItem: any) => {
    colX = margin + 3;
    doc.text("-", colX + 2, yPosition);
    colX += colWidths[0];
        
        // UNIFICAR FORMATO: Todos los servicios en negritas, sin mayúsculas forzadas
        const serviceNameText = serviceItem.name || serviceItem.service_name || "";
        doc.setFontSize(adaptiveFontSize);
        doc.setFont("helvetica", "bold"); // NEGRITAS para todos
        doc.setTextColor(0, 0, 0);
    const serviceNameLines = doc.splitTextToSize(serviceNameText, colWidths[1] - 4);
    doc.text(serviceNameLines, colX + 2, yPosition);
    colX += colWidths[1];
        
    let serviceNote = serviceItem.description || "Servicio de reparación";
        if (serviceNote === device.problem_description) {
      serviceNote = "Servicio de reparación";
    }
        doc.setFont("helvetica", "normal"); // Descripción en normal
    const noteLines = doc.splitTextToSize(serviceNote, colWidths[2] - 4);
    let noteY = yPosition;
    noteLines.forEach((line: string) => {
      doc.text(line, colX + 2, noteY);
          noteY += serviceLineSpacing;
    });
    colX += colWidths[2];
        
        // Mostrar total del servicio
        const totalAmount = serviceItem.total_price || (serviceItem.unit_price || 0) * (serviceItem.quantity || 1);
    const totalText = formatCLP(totalAmount, { withLabel: false });
        
        doc.setFontSize(adaptiveFontSize);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
    const totalWidth = doc.getTextWidth(totalText);
    const totalX = colX + colWidths[3] - totalWidth - 2;
    doc.text(totalText, totalX, yPosition);
        
        // Mostrar cantidad y precio unitario
        doc.setFontSize(Math.max(5, adaptiveFontSize * 0.65));
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        const detailText = `${serviceItem.quantity || 1} x ${formatCLP(serviceItem.unit_price || 0, { withLabel: false })}`;
    const detailWidth = doc.getTextWidth(detailText);
    const detailX = colX + colWidths[3] - detailWidth - 2;
    doc.text(detailText, detailX, yPosition + 3);
        
        // Restaurar valores por defecto
        doc.setFontSize(adaptiveFontSize);
        doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
        // REDUCIR altura entre servicios para aprovechar mejor el espacio
        const maxHeight = Math.max(
          serviceNameLines.length * serviceLineSpacing,
          noteLines.length * serviceLineSpacing,
          serviceLineSpacing
        );
        yPosition += maxHeight + 2;
      });
    }
    
    // === MOSTRAR CHECKLIST DEL EQUIPO (DESPUÉS DE SERVICIOS, SIN TÍTULO) ===
    if (device.checklist_data && Object.keys(device.checklist_data).length > 0) {
      // Cargar items del checklist para este tipo de dispositivo
      let deviceChecklistItems: DeviceChecklistItem[] = [];
      try {
        const { data: checklistData } = await supabase
          .from("device_checklist_items")
          .select("*")
          .eq("device_type", device.device_type)
          .order("item_order");
        if (checklistData) {
          deviceChecklistItems = checklistData;
        }
      } catch (error) {
        console.error(`[PDF] Error cargando checklist para equipo ${device.index}:`, error);
      }
      
      if (deviceChecklistItems.length > 0 || Object.keys(device.checklist_data).length > 0) {
        // SIN TÍTULO - mostrar checklist directamente después de servicios
        // Items del checklist
        doc.setFontSize(adaptiveFontSize);
        doc.setFont("helvetica", "normal");
        const checklistItemsList: string[] = [];
        deviceChecklistItems.forEach((item) => {
          const status = device.checklist_data?.[item.item_name];
          if (status) {
            let statusText = "";
            if (status === "ok") {
              statusText = " (ok)";
            } else if (status === "replaced") {
              statusText = " (reparado)";
            } else if (status === "damaged") {
              statusText = " (dañado)";
            } else if (status === "no_probado") {
              statusText = " (no probado)";
            }
            checklistItemsList.push(`${item.item_name}${statusText}`);
          }
        });
        // También incluir items personalizados que no están en device_checklist_items
        Object.keys(device.checklist_data).forEach((itemName) => {
          if (!deviceChecklistItems.some(item => item.item_name === itemName)) {
            const status = device.checklist_data?.[itemName];
            let statusText = "";
            if (status === "ok") {
              statusText = " (ok)";
            } else if (status === "replaced") {
              statusText = " (reparado)";
            } else if (status === "damaged") {
              statusText = " (dañado)";
            } else if (status === "no_probado") {
              statusText = " (no probado)";
            }
            checklistItemsList.push(`${itemName}${statusText}`);
          }
        });
        
        if (checklistItemsList.length > 0) {
          const checklistText = checklistItemsList.join(", ");
          const totalBoxWidthForChecklist = 30;
          const totalBoxXForChecklist = margin + contentWidth - totalBoxWidthForChecklist - 3;
          const leftSideWidth = totalBoxXForChecklist - margin - 6;
          const checklistLines = doc.splitTextToSize(checklistText, leftSideWidth);
          checklistLines.forEach((line: string) => {
            doc.text(line, margin + 3, yPosition);
            yPosition += 2.5;
          });
          yPosition += 1;
        }
      }
    }
    
    // === MOSTRAR REPUESTO DEL EQUIPO ===
    if (device.replacement_cost > 0) {
    colX = margin + 3;
    doc.text("-", colX + 2, yPosition);
    colX += colWidths[0];
    doc.text("REPUESTO", colX, yPosition);
    colX += colWidths[1];
    const repuestoNote = doc.splitTextToSize("Repuesto original", colWidths[2] - 2);
    doc.text(repuestoNote, colX, yPosition);
    colX += colWidths[2];
      
      const repuestoTotalAmount = device.replacement_cost;
    const repuestoTotalText = formatCLP(repuestoTotalAmount, { withLabel: false });
      doc.setFontSize(adaptiveFontSize);
      doc.setFont("helvetica", "bold");
    const repuestoTotalWidth = doc.getTextWidth(repuestoTotalText);
    const repuestoTotalX = colX + colWidths[3] - repuestoTotalWidth - 2;
    doc.text(repuestoTotalText, repuestoTotalX, yPosition);
      
      doc.setFontSize(Math.max(5, adaptiveFontSize * 0.65));
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      const repuestoDetailText = `1 x ${formatCLP(device.replacement_cost, { withLabel: false })}`;
    const repuestoDetailWidth = doc.getTextWidth(repuestoDetailText);
    const repuestoDetailX = colX + colWidths[3] - repuestoDetailWidth - 2;
      doc.text(repuestoDetailText, repuestoDetailX, yPosition + 4);
      
      doc.setFontSize(adaptiveFontSize);
      doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    yPosition += 7;
    }
    
    // Espacio adicional antes del siguiente equipo
    yPosition += 3;
  }

  // === TOTAL Y ELEMENTOS ADJUNTOS (Checklist y Garantía) ===
  // Calcular posición del total basándose en dónde terminaron los servicios
  const totalBoxWidth = 30;
  const totalBoxX = margin + contentWidth - totalBoxWidth - 3;
  const totalYPosition = yPosition + 5;
  const actualTotalBoxHeight = 20;
  
  // Preparar checklist y garantía para mostrar al lado izquierdo del total
  let checklistText = "";
  if (checklistItems.length > 0 && checklistData && Object.keys(checklistData).length > 0) {
    const checklistItemsList: string[] = [];
    checklistItems.forEach((item) => {
      const status = checklistData[item.item_name];
      if (status) {
        let statusText = "";
        if (status === "ok") {
          statusText = " (ok)";
        } else if (status === "replaced") {
          statusText = " (reparado)";
        } else if (status === "damaged") {
          statusText = " (dañado)";
        } else if (status === "no_probado") {
          statusText = " (no probado)";
        }
        checklistItemsList.push(`${item.item_name}${statusText}`);
      }
    });
    if (checklistItemsList.length > 0) {
      checklistText = checklistItemsList.join(", ");
    }
  }
  
  // Calcular altura necesaria para checklist y garantía (lado izquierdo del total)
  const leftSideWidth = totalBoxX - margin - 6; // Ancho disponible a la izquierda del total
  let leftSideHeight = 0;
  let checklistLines: string[] = [];
  if (checklistText) {
    doc.setFontSize(5);
    checklistLines = doc.splitTextToSize(checklistText, leftSideWidth);
    leftSideHeight += 6 + (checklistLines.length * 3); // Título + líneas
  }
  // Garantía de días
  doc.setFontSize(6);
  leftSideHeight += 4; // Espacio para garantía
  
  // Ajustar altura del panel considerando el lado izquierdo
  const maxLeftRightHeight = Math.max(actualTotalBoxHeight, leftSideHeight);
  const panelEndY = Math.max(yPosition + 10, totalYPosition + maxLeftRightHeight + 5);
  const finalPanelHeight = panelEndY - equipmentPanelStartY;
  
  doc.setFillColor(240, 240, 240);
  doc.rect(totalBoxX, totalYPosition, totalBoxWidth, actualTotalBoxHeight, "F");
  doc.setDrawColor(150, 150, 150);
  doc.rect(totalBoxX, totalYPosition, totalBoxWidth, actualTotalBoxHeight, "S");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  
  // Calcular total con IVA - sumar todos los costos de todos los equipos
  const totalConIva = allDevices.reduce((sum, device) => {
    return sum + (device.replacement_cost || 0) + (device.labor_cost || 0);
  }, 0);
  // Calcular total sin IVA (si el total incluye IVA del 19%)
  const totalSinIva = totalConIva / 1.19;
  const iva = totalConIva - totalSinIva;
  
  // Mostrar total sin IVA
  doc.text("Subtotal:", totalBoxX + 2, totalYPosition + 4);
  const subtotalText = formatCLP(totalSinIva, { withLabel: false });
  const subtotalWidth = doc.getTextWidth(subtotalText);
  doc.text(subtotalText, totalBoxX + totalBoxWidth - subtotalWidth - 2, totalYPosition + 4);

  // Mostrar IVA (19%)
  doc.text("IVA (19%):", totalBoxX + 2, totalYPosition + 8);
  const ivaText = formatCLP(iva, { withLabel: false });
  const ivaWidth = doc.getTextWidth(ivaText);
  doc.text(ivaText, totalBoxX + totalBoxWidth - ivaWidth - 2, totalYPosition + 8);
  
  doc.setDrawColor(150, 150, 150);
  doc.line(totalBoxX, totalYPosition + 12, totalBoxX + totalBoxWidth, totalYPosition + 12);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalBoxX + 2, totalYPosition + 16);
  // Mostrar total con IVA
  doc.setFontSize(6);
  const totalText = formatCLP(totalConIva, { withLabel: false });
  const totalTextWidth = doc.getTextWidth(totalText);
  const totalTextX = Math.max(totalBoxX + 2, totalBoxX + totalBoxWidth - totalTextWidth - 2);
  doc.text(totalText, totalTextX, totalYPosition + 19);
  // === CHECKLIST Y GARANTÍA AL LADO IZQUIERDO DEL TOTAL ===
  let leftSideY = totalYPosition;
  
  // Checklist (si existe)
  if (checklistLines.length > 0) {
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Checklist:", margin + 3, leftSideY);
    leftSideY += 4;
    doc.setFont("helvetica", "normal");
    checklistLines.forEach((line: string) => {
      doc.text(line, margin + 3, leftSideY);
      leftSideY += 3;
    });
    leftSideY += 2; // Espacio antes de garantía
  }
  
  // Garantía de días
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text(`Garantía ${warrantyDays} días`, margin + 3, leftSideY);
  
  // Dibujar borde del panel
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(margin, equipmentPanelStartY, contentWidth, finalPanelHeight, "S");
  
  // Actualizar yPosition para las políticas de garantía (después de TODO el panel)
  // IMPORTANTE: Las garantías DEBEN empezar DESPUÉS de donde terminó realmente el panel de equipos
  // El panel termina en panelEndY (incluye el total box), así que las garantías empiezan después de eso
  // REDUCIR el espacio al mínimo para aprovechar todo el espacio disponible
  const spaceAfterPanel = 2; // Espacio mínimo después del panel antes de las garantías
  yPosition = panelEndY + spaceAfterPanel;

  // === POLÍTICAS DE GARANTÍA - Layout Adaptativo ===
  const warrantyPanelStartY = yPosition;
  
  // warrantyText ya está calculado arriba
  const columnWidth = (contentWidth - 12) / 2;
  
  // Calcular espacio disponible para garantías (asegurando que el cuadro de firma siempre quepa)
  // IMPORTANTE: Usar TODO el espacio REAL disponible, especialmente cuando hay un solo equipo
  const minSeparationForSignature = 2; // Separación MÍNIMA entre garantías y firmas (reducido)
  // Las dos firmas están lado a lado, así que solo necesitamos el espacio de una firma en altura
  const spaceForSignature = sigBoxHeight + signatureTextSpacing + sigTextHeight + minSeparationForSignature + bottomMargin;
  // Calcular el espacio disponible REAL - usar TODO el espacio disponible
  const calculatedAvailableHeight = pageHeight - warrantyPanelStartY - warrantyTitleHeight - warrantyPaddingTop - warrantyPaddingBottom - spaceForSignature;
  // Cuando hay un solo equipo, aprovechar TODO el espacio disponible (sin mínimo)
  // Cuando hay más equipos, usar el espacio disponible pero con un mínimo razonable
  const isSingleDevice = allDevices.length === 1;
  const availableHeight = isSingleDevice 
        ? Math.max(calculatedAvailableHeight, 30) // Usar TODO el espacio disponible, mínimo 30 solo para seguridad
        : Math.max(20, calculatedAvailableHeight); // Mínimo de 20 puntos cuando hay múltiples equipos
  
  // Asegurar que el espacio disponible sea positivo
  if (availableHeight <= 0) {
    console.error("[PDF] ERROR: No hay espacio disponible para garantías. Ajustando layout.");
    // En caso extremo, reducir el espacio de la firma
    const emergencySpace = pageHeight - warrantyPanelStartY - warrantyTitleHeight - warrantyPaddingTop - warrantyPaddingBottom - 20;
    if (emergencySpace > 0) {
      console.warn("[PDF] Usando espacio de emergencia:", emergencySpace);
    }
  }
  
  // Debug: mostrar espacio disponible
  console.log("[PDF] Espacio calculado disponible para garantías:", calculatedAvailableHeight, "puntos");
  console.log("[PDF] Espacio real disponible (con mínimo garantizado):", availableHeight, "puntos");
  console.log("[PDF] Número de garantías:", warrantyText.length);
  
  // Asegurar que siempre haya espacio mínimo para garantías
  if (availableHeight < 30) {
    console.warn("[PDF] Espacio muy limitado para garantías, ajustando layout");
  }
  
  // === CÁLCULO DINÁMICO DE TAMAÑO DE FUENTE PARA GARANTÍAS ===
  // Fórmula según especificaciones:
  // - 14 garantías = 6pt
  // - 10 garantías = 7pt
  // - 12 garantías = 8pt (usuario solicita 1pt más)
  // - Cada garantía suma/resta 0.25pt
  // - Fórmula ajustada: tamaño = 7 - (num_garantias - 10) * 0.25 + 1 (para garantías >= 10 y < 14)
  const numWarranties = warrantyText.length;
  let fontSize = 7 - (numWarranties - 10) * 0.25;
  
  // Ajuste: para 12 garantías debe ser 8pt (1pt más que el calculado)
  if (numWarranties === 12) {
    fontSize = 8;
  }
  // Para otras cantidades, usar la fórmula pero con ajuste para hacer texto más grande
  if (numWarranties >= 10 && numWarranties < 14) {
    fontSize = Math.max(fontSize, 7); // Mínimo 7pt para este rango
  }
  
  // Asegurar tamaño mínimo razonable (no menos de 5pt) y máximo (no más de 12pt)
  fontSize = Math.max(5, Math.min(12, fontSize));
  
  console.log("[PDF] Número de garantías:", numWarranties);
  console.log("[PDF] Tamaño de fuente calculado:", fontSize, "puntos");
  
  // Calcular interlineado y espacio entre garantías
  // AJUSTAR dinámicamente el tamaño de fuente para que TODAS las garantías quepan
  // Primero calcular cuánto espacio necesita cada garantía con el tamaño actual
  doc.setFontSize(fontSize);
  // jsPDF usa aproximadamente fontSize para el espaciado entre líneas cuando usas doc.text(lines, x, y)
  // Usar un valor intermedio que sea realista pero permita aprovechar el espacio
  let optimalLineSpacing = fontSize * 0.9;
  
  // Calcular el espacio total necesario con el tamaño de fuente actual
  // Primero calcular cuánto espacio necesita cada garantía en cada columna
  let leftColumnHeight = 0;
  let rightColumnHeight = 0;
  warrantyText.forEach((text, index) => {
    const textWithBullet = `• ${text}`;
    const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
    const textHeight = lines.length * optimalLineSpacing;
    if (index % 2 === 0) {
      leftColumnHeight += textHeight;
    } else {
      rightColumnHeight += textHeight;
    }
  });
  
  // El espacio necesario es el máximo de las dos columnas
  let totalHeightNeeded = Math.max(leftColumnHeight, rightColumnHeight);
  
  // AJUSTAR el tamaño de fuente para que TODAS las garantías quepan
  // Usar 90% del espacio disponible como máximo para dejar margen de seguridad
  const maxUsableHeight = availableHeight * 0.9;
  
  if (totalHeightNeeded > maxUsableHeight) {
    // Si el espacio necesario excede el disponible, reducir el tamaño de fuente
    const ratio = maxUsableHeight / totalHeightNeeded;
    fontSize = Math.max(3.5, fontSize * ratio); // Mínimo 3.5pt para que sea legible
    optimalLineSpacing = fontSize * 0.8;
    doc.setFontSize(fontSize);
    
    // Recalcular el espacio necesario con el nuevo tamaño
    leftColumnHeight = 0;
    rightColumnHeight = 0;
    warrantyText.forEach((text, index) => {
      const textWithBullet = `• ${text}`;
      const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
      const textHeight = lines.length * optimalLineSpacing;
      if (index % 2 === 0) {
        leftColumnHeight += textHeight;
      } else {
        rightColumnHeight += textHeight;
      }
    });
    totalHeightNeeded = Math.max(leftColumnHeight, rightColumnHeight);
    
    console.log("[PDF] Tamaño de fuente REDUCIDO para que quepan todas las garantías:", fontSize, "puntos");
    console.log("[PDF] Espacio necesario:", totalHeightNeeded, "puntos, disponible:", availableHeight, "puntos");
  }
  
  // No inflar el tamaño de fuente para "llenar" el espacio.
  // Esto provocaba garantías con demasiado espacio entre líneas.
  
  // Asegurar que el tamaño de fuente esté aplicado
  doc.setFontSize(fontSize);
  
  let maxY = 0;
  let warrantyPanelHeight = 0;
  
  // Calcular altura real necesaria con el tamaño calculado
    let tempLeftY = warrantyPanelStartY + warrantyPaddingTop;
    let tempRightY = warrantyPanelStartY + warrantyPaddingTop;
    const maxYPerColumn: number[] = [];
    
    warrantyText.forEach((text, index) => {
      const isLeftColumn = index % 2 === 0;
      const textWithBullet = `• ${text}`;
      const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
      const textHeight = lines.length * optimalLineSpacing;
      // ELIMINAR espacio entre garantías (solo el interlineado del texto)
      const minSpaceBetween = 0; // Sin espacio extra entre garantías
      const spaceBetweenWarranties = textHeight + minSpaceBetween;
      if (isLeftColumn) {
        tempLeftY += spaceBetweenWarranties;
        maxYPerColumn.push(tempLeftY);
      } else {
        tempRightY += spaceBetweenWarranties;
        maxYPerColumn.push(tempRightY);
      }
    });
    
  let testMaxY = Math.max(...maxYPerColumn, warrantyPanelStartY + warrantyPaddingTop);
  let testPanelHeight = testMaxY - warrantyPanelStartY + warrantyPaddingBottom;
  
  // No expandir interlineado para llenar espacio; mantener compacto.
  
  maxY = testMaxY;
  warrantyPanelHeight = Math.min(testPanelHeight, availableHeight + warrantyTitleHeight + warrantyPaddingTop + warrantyPaddingBottom);
  const initialWarrantyPanelHeight = warrantyPanelHeight;
  
  console.log("[PDF] Altura del panel de garantías:", warrantyPanelHeight, "puntos");
  console.log("[PDF] Interlineado óptimo:", optimalLineSpacing, "puntos");
  
  // Dibujar fondo del panel PRIMERO (el borde se redibuja después con la altura correcta)
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, warrantyPanelStartY, contentWidth, warrantyPanelHeight, "F");
  
  // Dibujar título
  doc.setFillColor(...stripeColor);
  doc.rect(margin, warrantyPanelStartY, contentWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("POLÍTICAS DE GARANTÍA", margin + 3, warrantyPanelStartY + 4.5);
  
  // Ahora dibujar el texto con el tamaño de fuente calculado
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");
  
  // Debug: confirmar el tamaño de fuente que se está usando
  console.log("[PDF] Tamaño de fuente final aplicado:", fontSize, "puntos");
  yPosition = warrantyPanelStartY + 10;
  
  const leftColumnX = margin + 3;
  const rightColumnX = margin + columnWidth + 9;
  
  let leftY = yPosition;
  let rightY = yPosition;
  
  // Usar el espaciado óptimo calculado (ya ajustado para ocupar todo el espacio)
  let lineSpacing = optimalLineSpacing;
  
  // Distribuir políticas entre las dos columnas
  // IMPORTANTE: Calcular el Y máximo permitido (justo antes de la firma)
  const signatureStartY = pageHeight - sigBoxHeight - signatureTextSpacing - sigTextHeight - minSeparationForSignature - bottomMargin;
  const maxAllowedY = signatureStartY - warrantyPaddingBottom; // Margen de seguridad
  
  warrantyText.forEach((text, index) => {
    const isLeftColumn = index % 2 === 0;
    const currentX = isLeftColumn ? leftColumnX : rightColumnX;
    let currentY = isLeftColumn ? leftY : rightY;
    
    // Agregar punto al inicio de cada política
    const textWithBullet = `• ${text}`;
    const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
    
        // Calcular altura del texto ANTES de dibujar
        const textHeight = lines.length * lineSpacing;
        // ELIMINAR espacio entre garantías (solo el interlineado del texto)
        const minSpaceBetween = 0; // Sin espacio extra entre garantías
        const spaceBetweenWarranties = textHeight + minSpaceBetween;
    
    // VERIFICAR que el texto completo quepa antes de dibujar
    const finalY = currentY + textHeight;
    if (finalY > maxAllowedY) {
      console.warn(`[PDF] ADVERTENCIA: Garantía ${index} no cabe. Y final: ${finalY}, máximo: ${maxAllowedY}`);
      // Si no cabe, NO dibujar esta garantía y detener el bucle
      // Esto previene que se monte sobre la firma
      return;
    }
    
    // VERIFICAR que la posición actual no exceda el máximo
    if (currentY > maxAllowedY) {
      console.warn(`[PDF] ADVERTENCIA: Garantía ${index} ya excede el máximo. Y: ${currentY}, máximo: ${maxAllowedY}`);
      return;
    }
    
    // Dibujar el texto solo si cabe completamente
    doc.text(lines, currentX, currentY);
    
    // Actualizar posición solo si el texto se dibujó correctamente
    if (isLeftColumn) {
      leftY += spaceBetweenWarranties;
      // Verificar que no exceda el máximo
      if (leftY > maxAllowedY) {
        leftY = maxAllowedY; // Limitar al máximo
      }
    } else {
      rightY += spaceBetweenWarranties;
      // Verificar que no exceda el máximo
      if (rightY > maxAllowedY) {
        rightY = maxAllowedY; // Limitar al máximo
      }
    }
  });
  
  // Calcular maxY real después de dibujar (usar el mayor entre leftY y rightY)
  const actualMaxY = Math.max(leftY, rightY);
  
  // NUNCA exceder el máximo permitido (justo antes de la firma)
  const finalMaxY = Math.min(actualMaxY, maxAllowedY);
  
  // Calcular altura del panel sin exceder el espacio disponible
  warrantyPanelHeight = finalMaxY - warrantyPanelStartY + warrantyPaddingBottom;
  
  // Verificar que la altura del panel no exceda el espacio disponible
  if (warrantyPanelHeight > availableHeight + warrantyTitleHeight + warrantyPaddingTop + warrantyPaddingBottom) {
    console.warn("[PDF] ADVERTENCIA: Altura del panel excede el espacio disponible. Ajustando...");
    warrantyPanelHeight = availableHeight + warrantyTitleHeight + warrantyPaddingTop + warrantyPaddingBottom;
  }
  
  // Si la altura final es menor, limpiar el exceso para no tapar firmas
  if (initialWarrantyPanelHeight > warrantyPanelHeight) {
    const excessHeight = initialWarrantyPanelHeight - warrantyPanelHeight;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, warrantyPanelStartY + warrantyPanelHeight, contentWidth, excessHeight, "F");
  }

  // Redibujar el borde del panel con la altura correcta (extendido hasta la firma)
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, warrantyPanelStartY, contentWidth, warrantyPanelHeight, "S");
  
  yPosition = finalMaxY;

  // === FIRMAS - Posicionar al final absoluto de la hoja ===
  // Dos firmas lado a lado: Cliente y Quien Recibe
  const signatureBoxWidth = 45;
  const signatureSpacing = 20; // Espacio entre las dos firmas
  const totalSignaturesWidth = (signatureBoxWidth * 2) + signatureSpacing;
  
  // Calcular posición de las firmas: al final absoluto de la página
  const signatureBoxY = pageHeight - sigBoxHeight - signatureTextSpacing - sigTextHeight - bottomMargin;
  
  // Verificar que las firmas NO se monten sobre las garantías
  const warrantyEndY = warrantyPanelStartY + warrantyPanelHeight;
  const requiredSeparation = minSeparationForSignature;
  
  if (signatureBoxY < warrantyEndY + requiredSeparation) {
    console.error("[PDF] ERROR CRÍTICO: Las garantías se están montando sobre las firmas!");
    console.error(`[PDF] warrantyEndY: ${warrantyEndY}, signatureBoxY: ${signatureBoxY}, requiredSeparation: ${requiredSeparation}`);
  }
  
  // Calcular posición X para centrar ambas firmas
  const signaturesStartX = (pageWidth - totalSignaturesWidth) / 2;
  
  // Cargar configuración de firma de quien recibe
  const recibidoPorSignature = settings.recibido_por_signature || { signature_url: "", nombre: "" };
  
  // === FIRMA DEL CLIENTE (izquierda) ===
  const clienteSignatureX = signaturesStartX;
  
  // Si hay firma del cliente guardada, mostrarla sobre fondo blanco (optimizada)
  if (order.cliente_signature_url) {
    // Dibujar solo el borde
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(clienteSignatureX, signatureBoxY, signatureBoxWidth, sigBoxHeight, "FD");
    
    try {
      // Optimizar la firma antes de agregarla (convertir a JPEG con compresión)
      let optimizedSignature = order.cliente_signature_url;
      try {
        optimizedSignature = await optimizeImageDataUrl(order.cliente_signature_url, 0.7); // 70% calidad
        console.log("[PDF] Firma del cliente optimizada a JPEG");
      } catch (optErr) {
        console.warn("[PDF] Error optimizando firma del cliente, usando original:", optErr);
      }
      
      const img = new Image();
      img.src = optimizedSignature;
      // Usar JPEG si fue optimizada, PNG si no
      const signatureFormat = optimizedSignature.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(img, signatureFormat, clienteSignatureX + 2, signatureBoxY + 2, signatureBoxWidth - 4, sigBoxHeight - 4);
    } catch (err) {
      console.warn("[PDF] Error cargando firma del cliente:", err);
      // Si falla cargar la imagen, mostrar cuadro gris
      doc.setFillColor(240, 240, 240);
      doc.rect(clienteSignatureX, signatureBoxY, signatureBoxWidth, sigBoxHeight, "FD");
    }
  } else {
    // Si no hay firma, mostrar cuadro gris claro
    doc.setFillColor(240, 240, 240);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(clienteSignatureX, signatureBoxY, signatureBoxWidth, sigBoxHeight, "FD");
  }
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  const clienteSignatureText = "FIRMA DEL CLIENTE";
  const clienteSignatureTextWidth = doc.getTextWidth(clienteSignatureText);
  const clienteSignatureTextY = signatureBoxY + sigBoxHeight + 5;
  doc.text(clienteSignatureText, clienteSignatureX + (signatureBoxWidth - clienteSignatureTextWidth) / 2, clienteSignatureTextY);
  
  // === FIRMA DE QUIEN RECIBE (derecha) ===
  const recibidoPorSignatureX = signaturesStartX + signatureBoxWidth + signatureSpacing;
  doc.setFillColor(230, 230, 230);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.rect(recibidoPorSignatureX, signatureBoxY, signatureBoxWidth, sigBoxHeight, "FD");
  
  // Si hay firma de quien recibe guardada, mostrarla (optimizada)
  if (order.recibido_por_signature_url || recibidoPorSignature.signature_url) {
    try {
      const signatureUrl = order.recibido_por_signature_url || recibidoPorSignature.signature_url;
      
      // Optimizar la firma antes de agregarla (convertir a JPEG con compresión)
      let optimizedSignature = signatureUrl;
      try {
        optimizedSignature = await optimizeImageDataUrl(signatureUrl, 0.7); // 70% calidad
        console.log("[PDF] Firma de quien recibe optimizada a JPEG");
      } catch (optErr) {
        console.warn("[PDF] Error optimizando firma de quien recibe, usando original:", optErr);
      }
      
      const img = new Image();
      img.src = optimizedSignature;
      // Usar JPEG si fue optimizada, PNG si no
      const signatureFormat = optimizedSignature.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(img, signatureFormat, recibidoPorSignatureX + 2, signatureBoxY + 2, signatureBoxWidth - 4, sigBoxHeight - 4);
    } catch (err) {
      console.warn("[PDF] Error cargando firma de quien recibe:", err);
    }
  }
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  const recibidoPorNombre = order.recibido_por_nombre || recibidoPorSignature.nombre || "QUIEN RECIBE";
  const recibidoPorText = recibidoPorNombre.length > 20 ? recibidoPorNombre.substring(0, 20) : recibidoPorNombre;
  const recibidoPorTextWidth = doc.getTextWidth(recibidoPorText);
  const recibidoPorTextY = signatureBoxY + sigBoxHeight + 5;
  doc.text(recibidoPorText, recibidoPorSignatureX + (signatureBoxWidth - recibidoPorTextWidth) / 2, recibidoPorTextY);

  // Retornar blob con tipo MIME explícito para asegurar que sea reconocido como PDF
  const blob = doc.output("blob");
  // Asegurar que el blob tenga el tipo MIME correcto
  if (blob.type !== "application/pdf") {
    console.warn("[PDF] Blob no tiene tipo application/pdf, corrigiendo...");
    return new Blob([blob], { type: "application/pdf" });
  }
  return blob;
}

