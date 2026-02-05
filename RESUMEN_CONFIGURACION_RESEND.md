# ⚡ Resumen Rápido: Configurar Resend

## ✅ Código Actualizado

El sistema ya está configurado para usar variables de entorno. Solo necesitas configurar:

## 🔑 Variables de Entorno en Vercel

Ve a **Vercel → Tu Proyecto → Settings → Environment Variables** y agrega:

1. **RESEND_API_KEY**
   - Valor: Tu API Key de Resend (formato: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - Obtener en: https://resend.com/api-keys

2. **RESEND_FROM_EMAIL**
   - Valor: Email de tu dominio verificado (ej: `noreply@tudominio.com`)
   - Debe ser del dominio que verificaste en Resend

3. **RESEND_FROM_NAME** (Opcional)
   - Valor: `Tec-Solution` (o el nombre que prefieras)

## 📋 Pasos Rápidos

### 1. Configurar Dominio en Vercel (5 min)

**Opción A: Usar Nameservers (RECOMENDADO - Especialmente para nic.cl)**
- Vercel → Settings → Domains → Agregar tu dominio
- Anotar los nameservers que Vercel te da (ej: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`)
- Cambiar nameservers en tu proveedor de dominio (nic.cl u otro)
- Ver guía específica: **CONFIGURAR_NIC_CL_VERCEL.md**

**Opción B: Usar Registros DNS Individuales**
- Vercel → Settings → Domains → Agregar tu dominio
- Anotar los registros DNS que Vercel te da

### 2. Configurar DNS en tu Proveedor (5 min)
- Agregar registros A y CNAME que Vercel te indicó
- Esperar 10-30 minutos para propagación

### 3. Configurar Resend (10 min)
- Crear cuenta en https://resend.com
- Obtener API Key en https://resend.com/api-keys
- Agregar dominio en https://resend.com/domains
- Anotar registros DNS que Resend te da

### 4. Agregar DNS de Resend (5 min)
- Volver a tu proveedor de dominio
- Agregar registros SPF, DKIM, DMARC que Resend te indicó
- Esperar 10-30 minutos

### 5. Verificar en Resend (2 min)
- Volver a Resend → Domains
- Click en "Verify"
- Esperar hasta que diga "Verified"

### 6. Configurar Variables en Vercel (3 min)
- Agregar las 3 variables de entorno mencionadas arriba
- Hacer redeploy

## 📖 Guía Completa

Para instrucciones detalladas paso a paso, ve a: **CONFIGURAR_RESEND_COMPLETO.md**

## ✅ Verificación

Después de configurar todo:
1. Crea una orden de prueba
2. El sistema enviará el email automáticamente con el PDF adjunto
3. Revisa los logs en Vercel Functions si hay problemas
