import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getSystemSettings } from "../../lib/settings";

const resendApiKey = import.meta.env.RESEND_API_KEY;

export const POST: APIRoute = async ({ request }) => {
  // Logging inmediato para verificar que la función se ejecuta
  console.log("[EMAIL API] ========================================");
  console.log("[EMAIL API] FUNCIÓN EJECUTADA - Iniciando envío de email");
  console.log("[EMAIL API] Timestamp:", new Date().toISOString());
  console.log("[EMAIL API] ========================================");
  
  try {
    if (!resendApiKey) {
      console.error("[EMAIL API] ERROR: RESEND_API_KEY no configurada");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log("[EMAIL API] API Key encontrada");
    console.log("[EMAIL API] API Key length:", resendApiKey ? resendApiKey.length : 0);

    const resend = new Resend(resendApiKey);

    // Cargar configuración del sistema para obtener el logo
    const settings = await getSystemSettings();
    let logoDataUrl = "";
    try {
      // Evitar data URLs para reducir tamaño del HTML y prevenir "clipped" en Gmail
      let logoUrl = settings.header_logo.url;
      if (logoUrl && !logoUrl.startsWith("http") && !logoUrl.startsWith("data:")) {
        const baseUrl = import.meta.env.PUBLIC_SITE_URL || "https://sistema-playbox.vercel.app";
        logoUrl = `${baseUrl}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
      }
      if (logoUrl && !logoUrl.startsWith("data:")) {
        logoDataUrl = logoUrl;
      }
    } catch (error) {
      console.error("[EMAIL API] Error cargando configuración del logo:", error);
      // Continuar sin logo si hay error
    }

    const body = await request.json();
    const { 
      to, 
      customerName, 
      orderNumber, 
      pdfBase64, 
      pdfUrl, // URL del PDF si se subió a storage
      branchName,
      branchEmail,
      branchPhone,
      branchAddress,
      emailType = 'order_created' // 'order_created' o 'ready_for_pickup'
    } = body;
    
    console.log("[EMAIL API] Datos recibidos:", {
      to: to ? `${to.substring(0, 3)}***` : 'no especificado',
      orderNumber,
      emailType,
      hasPdfBase64: !!pdfBase64,
      hasPdfUrl: !!pdfUrl,
      branchName: branchName || 'no especificado'
    });

    if (!to || !orderNumber) {
      return new Response(
        JSON.stringify({ error: "Faltan datos requeridos: to, orderNumber" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // PDF (base64 o URL) es requerido para order_created
    if (emailType === 'order_created' && !pdfBase64 && !pdfUrl) {
      return new Response(
        JSON.stringify({ error: "pdfBase64 o pdfUrl es requerido para order_created" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Email de origen: Configuración desde variables de entorno
    const resendFromEmail = import.meta.env.RESEND_FROM_EMAIL;
    const resendFromName = import.meta.env.RESEND_FROM_NAME || "Playbox";
    
    let fromEmail: string;
    if (resendFromEmail) {
      fromEmail = resendFromEmail;
    } else if (branchEmail && branchEmail.includes('@')) {
      fromEmail = branchEmail;
    } else {
      console.error("[EMAIL API] ERROR: RESEND_FROM_EMAIL no configurada en variables de entorno");
      return new Response(
        JSON.stringify({ 
          error: "RESEND_FROM_EMAIL no configurada. Configura esta variable de entorno en Vercel con un email de tu dominio verificado en Resend (ej: noreply@tudominio.com)",
          hint: "Ve a Vercel → Settings → Environment Variables y agrega RESEND_FROM_EMAIL"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const fromName = resendFromName || (branchName ? `${branchName} - Playbox` : "Playbox");
    
    // Validar que el email del destinatario sea válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error("Email del destinatario inválido:", to);
      return new Response(
        JSON.stringify({ error: `Email del destinatario inválido: ${to}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Log para debugging (sin exponer información sensible)
    console.log("[EMAIL API] Preparando email:", {
      to: to ? `${to.substring(0, 3)}***` : 'no especificado',
      from: fromEmail,
      subject: emailType === 'ready_for_pickup' ? `Orden ${orderNumber} - Listo` : `Orden ${orderNumber} - Creada`,
      emailType: emailType,
      hasPdfBase64: !!pdfBase64,
      hasPdfUrl: !!pdfUrl
    });

    // Determinar contenido del email según el tipo
    let htmlContent = '';
    let subject = '';
    
    if (emailType === 'ready_for_pickup') {
      // Email para cuando el equipo está listo para retirar
      subject = `Notificación: Orden ${orderNumber} - Equipo listo para retirar`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial, sans-serif;color:#111827;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px 0;">
              <tr>
                <td align="center">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;">
                    <tr>
                      <td style="background:#1e3a8a;color:#ffffff;text-align:center;padding:18px;">
                        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Playbox" width="140" style="display:block;margin:0 auto 8px auto;height:auto;max-width:140px;">` : ""}
                        <div style="font-size:20px;font-weight:bold;">✅ Playbox</div>
                        <div style="font-size:14px;margin-top:4px;">¡Su equipo está listo!</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:22px 26px;background:#f9fafb;">
                        <div style="font-size:16px;margin-bottom:10px;">Estimado/a ${customerName || "Cliente"},</div>
                        <div style="background:#dbeafe;border-left:4px solid #3b82f6;padding:10px 12px;margin:12px 0;border-radius:4px;font-weight:bold;">
                          🎉 ¡Excelentes noticias! Su equipo está listo para retirar.
                        </div>
                        <div style="text-align:center;margin:16px 0;">
                          <span style="background:#3b82f6;color:#ffffff;padding:8px 16px;border-radius:5px;display:inline-block;font-weight:bold;">
                            Orden: ${orderNumber}
                          </span>
                        </div>
                        <div style="font-size:14px;line-height:1.5;">
                          Nos complace informarle que la reparación de su equipo ha sido completada exitosamente y está disponible para retiro en nuestra sucursal.
                        </div>
                        <div style="font-size:14px;margin-top:12px;">
                          <strong>Próximos pasos:</strong>
                          <ul style="margin:8px 0 0 18px;padding:0;">
                            <li>Puede retirar su equipo en nuestra sucursal durante nuestro horario de atención</li>
                            <li>No olvide traer su documento de identidad</li>
                            <li>Si tiene alguna consulta, no dude en contactarnos</li>
                          </ul>
                        </div>
                        ${branchName ? `
                          <div style="margin-top:14px;font-size:14px;">
                            <div><strong>Sucursal:</strong> ${branchName}</div>
                            ${branchEmail ? `<div><strong>Email:</strong> ${branchEmail}</div>` : ""}
                            ${branchPhone ? `<div><strong>Teléfono:</strong> ${branchPhone}</div>` : ""}
                            ${branchAddress ? `<div><strong>Dirección:</strong> ${branchAddress}</div>` : ""}
                          </div>
                        ` : ""}
                        <div style="margin-top:14px;font-size:14px;">Esperamos verlo pronto para entregarle su equipo.</div>
                        <div style="margin-top:12px;font-size:14px;">Atentamente,<br><strong>Equipo Playbox</strong></div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:14px 18px;text-align:center;font-size:12px;color:#6b7280;background:#ffffff;border-top:1px solid #e5e7eb;">
                        Este es un correo automático, por favor no responda a este mensaje.<br>
                        &copy; ${new Date().getFullYear()} Playbox. Todos los derechos reservados.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;
    } else {
      // Email para cuando se crea la orden (EXACTAMENTE como en el proyecto de referencia)
      subject = `Notificación: Orden ${orderNumber} - Equipo ingresado`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial, sans-serif;color:#111827;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px 0;">
              <tr>
                <td align="center">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;">
                    <tr>
                      <td style="background:#1e3a8a;color:#ffffff;text-align:center;padding:18px;">
                        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Playbox" width="140" style="display:block;margin:0 auto 8px auto;height:auto;max-width:140px;">` : ""}
                        <div style="font-size:20px;font-weight:bold;">Playbox</div>
                        <div style="font-size:14px;margin-top:4px;">Servicio Especializado en Reparación</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:22px 26px;background:#f9fafb;">
                        <div style="font-size:16px;margin-bottom:10px;">Estimado/a ${customerName || "Cliente"},</div>
                        <div style="font-size:14px;line-height:1.5;">
                          Nos complace informarle que su equipo ha sido ingresado con éxito en nuestro sistema y se encuentra actualmente en proceso de preparación.
                        </div>
                        <div style="text-align:center;margin:16px 0;">
                          <span style="background:#3b82f6;color:#ffffff;padding:8px 16px;border-radius:5px;display:inline-block;font-weight:bold;">
                            Orden: ${orderNumber}
                          </span>
                        </div>
                        ${pdfUrl ? `
                          <div style="font-size:14px;margin:10px 0;">Puede descargar el PDF con todos los detalles de su orden:</div>
                          <div style="text-align:center;margin:12px 0;">
                            <a href="${pdfUrl}" style="background:#3b82f6;color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:5px;display:inline-block;font-weight:bold;">📄 Descargar PDF de la Orden</a>
                          </div>
                        ` : `
                          <div style="font-size:14px;margin:10px 0;">En el archivo PDF adjunto encontrará todos los detalles de su orden, incluyendo:</div>
                        `}
                        <ul style="margin:8px 0 0 18px;padding:0;font-size:14px;">
                          <li>Información del equipo ingresado</li>
                          <li>Servicios solicitados</li>
                          <li>Presupuesto detallado</li>
                          <li>Políticas de garantía</li>
                          <li>Datos de contacto de nuestra sucursal</li>
                        </ul>
                        <div style="font-size:14px;margin-top:12px;">Nuestro equipo técnico revisará su equipo y se pondrá en contacto con usted en caso de ser necesario.</div>
                        <div style="font-size:14px;margin-top:10px;">Si tiene alguna consulta o necesita más información, no dude en contactarnos.</div>
                        <div style="margin-top:12px;font-size:14px;">Atentamente,<br><strong>Equipo Playbox</strong></div>
                        ${branchName ? `<div style="margin-top:14px;font-size:14px;"><strong>Sucursal:</strong> ${branchName}</div>` : ""}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:14px 18px;text-align:center;font-size:12px;color:#6b7280;background:#ffffff;border-top:1px solid #e5e7eb;">
                        Este es un correo automático, por favor no responda a este mensaje.<br>
                        &copy; ${new Date().getFullYear()} Playbox. Todos los derechos reservados.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;
    }

    const emailData: any = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: htmlContent,
      // Headers para que el email llegue a la bandeja principal (no promociones)
      // Importante: NO usar 'Precedence: bulk' ni 'Auto-Submitted' ya que pueden marcar como promocional
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'X-Auto-Response-Suppress': 'All',
        // Marcar como transaccional para evitar que vaya a promociones
        'X-Mailer': 'Playbox-Order-System',
      },
      // Tags para identificar como email transaccional en Resend
      tags: [
        { name: 'transactional', value: 'order-notification' },
        { name: 'order-number', value: orderNumber },
      ],
    };

    // Adjuntar PDF: Priorizar pdfBase64 si está disponible (mismo PDF del preview)
    // Si no hay pdfBase64, descargar desde pdfUrl (storage)
    if (emailType === 'order_created') {
      let pdfToAttach: string | null = null;
      
      if (pdfBase64) {
        // Usar pdfBase64 directamente si está disponible (mismo PDF del preview, garantiza formato correcto)
        pdfToAttach = pdfBase64;
      const base64Size = pdfBase64.length;
        console.log("[EMAIL API] Usando pdfBase64 para adjuntar (tamaño:", base64Size, "caracteres) - MISMO PDF DEL PREVIEW");
      } else if (pdfUrl && pdfUrl.includes('supabase.co')) {
        // Si no hay pdfBase64 pero hay pdfUrl de storage, descargarlo
        // CRÍTICO: El PDF descargado debe ser exactamente igual al original para evitar corrupción
        try {
          console.log("[EMAIL API] ========================================");
          console.log("[EMAIL API] No hay pdfBase64, descargando PDF desde Supabase Storage...");
          console.log("[EMAIL API] URL del PDF:", pdfUrl);
          
          // Descargar el PDF SIN headers adicionales (Supabase Storage maneja el Content-Type automáticamente)
          const pdfResponse = await fetch(pdfUrl);
          
          console.log("[EMAIL API] Response status:", pdfResponse.status);
          console.log("[EMAIL API] Response ok:", pdfResponse.ok);
          
          if (pdfResponse.ok) {
            // Verificar que el Content-Type sea application/pdf
            const contentType = pdfResponse.headers.get('content-type');
            const contentLength = pdfResponse.headers.get('content-length');
            console.log("[EMAIL API] Content-Type:", contentType);
            console.log("[EMAIL API] Content-Length:", contentLength, "bytes");
            
            if (contentType && !contentType.includes('application/pdf')) {
              console.warn("[EMAIL API] ⚠️ ADVERTENCIA: Content-Type no es application/pdf:", contentType);
            }
            
            // Leer como ArrayBuffer para preservar los bytes exactos (sin conversión de texto)
            const pdfArrayBuffer = await pdfResponse.arrayBuffer();
            console.log("[EMAIL API] PDF descargado como ArrayBuffer, tamaño:", pdfArrayBuffer.byteLength, "bytes");
            
            // Verificar que el tamaño coincida con el Content-Length si está disponible
            if (contentLength) {
              const expectedSize = parseInt(contentLength, 10);
              if (pdfArrayBuffer.byteLength !== expectedSize) {
                console.warn("[EMAIL API] ⚠️ ADVERTENCIA: Tamaño descargado (", pdfArrayBuffer.byteLength, ") no coincide con Content-Length (", expectedSize, ")");
              } else {
                console.log("[EMAIL API] ✅ Tamaño del PDF descargado coincide con Content-Length");
              }
            }
            
            // Verificar que el PDF comience con el header PDF correcto (%PDF)
            const pdfHeader = new Uint8Array(pdfArrayBuffer.slice(0, 4));
            const pdfHeaderString = String.fromCharCode(...pdfHeader);
            console.log("[EMAIL API] Primeros 4 bytes del PDF:", pdfHeaderString);
            
            if (pdfHeaderString !== '%PDF') {
              console.error("[EMAIL API] ❌ ERROR: El PDF descargado no tiene el header correcto. Esperado: %PDF, Obtenido:", pdfHeaderString);
            } else {
              console.log("[EMAIL API] ✅ Header PDF correcto verificado");
            }
            
            // Convertir a base64 usando Buffer (preserva los bytes exactos)
            pdfToAttach = Buffer.from(pdfArrayBuffer).toString('base64');
            
            // Validar que el base64 sea válido
            if (!/^[A-Za-z0-9+/=]+$/.test(pdfToAttach)) {
              console.warn("[EMAIL API] ⚠️ Base64 descargado contiene caracteres inválidos, limpiando...");
              pdfToAttach = pdfToAttach.replace(/[^A-Za-z0-9+/=]/g, '');
            }
            
            console.log("[EMAIL API] PDF descargado desde storage y convertido a base64 exitosamente");
            console.log("[EMAIL API] Tamaño del base64:", pdfToAttach.length, "caracteres");
            console.log("[EMAIL API] Primeros 50 caracteres:", pdfToAttach.substring(0, 50));
            console.log("[EMAIL API] Últimos 50 caracteres:", pdfToAttach.substring(pdfToAttach.length - 50));
            console.log("[EMAIL API] ========================================");
          } else {
            console.error("[EMAIL API] ❌ Error descargando PDF desde storage: status", pdfResponse.status);
            console.error("[EMAIL API] Response headers:", Object.fromEntries(pdfResponse.headers.entries()));
            const errorText = await pdfResponse.text();
            console.error("[EMAIL API] Response body:", errorText.substring(0, 500));
          }
        } catch (fetchError: any) {
          console.error("[EMAIL API] ❌ Error descargando PDF desde storage:", fetchError);
          console.error("[EMAIL API] Error message:", fetchError.message);
          console.error("[EMAIL API] Error stack:", fetchError.stack);
        }
      }
      
      // Adjuntar PDF si tenemos uno disponible
      // IMPORTANTE: NO especificar 'type' - Resend lo detecta automáticamente desde el filename
      // El formato debe ser EXACTAMENTE como en el proyecto de referencia
      if (pdfToAttach) {
        // Validar que el base64 sea válido antes de adjuntar
        if (!/^[A-Za-z0-9+/=]+$/.test(pdfToAttach)) {
          console.warn("[EMAIL API] Base64 contiene caracteres inválidos, limpiando...");
          pdfToAttach = pdfToAttach.replace(/[^A-Za-z0-9+/=]/g, '');
        }
        
        emailData.attachments = [
          {
            filename: `orden-${orderNumber}.pdf`,
            content: pdfToAttach, // Base64 puro, sin tipo MIME explícito (EXACTAMENTE como en el proyecto de referencia)
          },
        ];
        console.log("[EMAIL API] PDF adjuntado al email exitosamente");
        console.log("[EMAIL API] Tamaño del base64 adjuntado:", pdfToAttach.length, "caracteres");
        console.log("[EMAIL API] Primeros 50 caracteres:", pdfToAttach.substring(0, 50));
        console.log("[EMAIL API] Últimos 50 caracteres:", pdfToAttach.substring(pdfToAttach.length - 50));
      } else {
        console.warn("[EMAIL API] No se pudo obtener PDF para adjuntar (solo se enviará el link si pdfUrl está disponible)");
      }
    }

    console.log("[EMAIL API] Enviando email a Resend...");
    const result = await resend.emails.send(emailData);

    if (result.error) {
      console.error("[EMAIL API] ERROR desde Resend:", {
        error: result.error,
        message: result.error.message,
        name: result.error.name,
        from: fromEmail,
        to: to ? `${to.substring(0, 3)}***` : 'no especificado'
      });
      return new Response(
        JSON.stringify({ 
          error: result.error.message || "Error enviando email",
          details: result.error.name || "Error desconocido",
          from: fromEmail
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Logging más visible y detallado
    console.log("[EMAIL API] ========================================");
    console.log("[EMAIL API] ✅ EMAIL ENVIADO EXITOSAMENTE");
    console.log("[EMAIL API] Email ID de Resend:", result.data?.id);
    console.log("[EMAIL API] Para:", to ? `${to.substring(0, 3)}***` : 'no especificado');
    console.log("[EMAIL API] Desde:", fromEmail);
    console.log("[EMAIL API] Tipo:", emailType);
    console.log("[EMAIL API] Orden:", orderNumber);
    console.log("[EMAIL API] Timestamp:", new Date().toISOString());
    console.log("[EMAIL API] ========================================");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado exitosamente",
        emailId: result.data?.id,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("[EMAIL API] ========================================");
    console.error("[EMAIL API] ERROR EXCEPCIÓN CAPTURADA:");
    console.error("[EMAIL API] Message:", error.message);
    console.error("[EMAIL API] Name:", error.name);
    console.error("[EMAIL API] Stack:", error.stack);
    console.error("[EMAIL API] ========================================");
    
    // Asegurar que siempre devolvemos JSON válido
    const errorResponse = {
      error: error.message || "Error interno del servidor",
      details: error.name || "Error desconocido",
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }
};
