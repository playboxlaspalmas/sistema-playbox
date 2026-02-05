# 📧 Guía Completa: Configurar Resend con Dominio en Vercel

Esta guía te llevará paso a paso para configurar Resend con tu dominio personalizado en Vercel, desde cero.

## 📋 Requisitos Previos

- ✅ Cuenta en Vercel (gratuita)
- ✅ Cuenta en Resend (gratuita)
- ✅ Dominio personalizado (puede ser gratuito de Freenom, No-IP, etc.)

---

## 🚀 PASO 1: Configurar Dominio en Vercel

### Opción A: Usar Nameservers de Vercel (RECOMENDADO - Más Fácil)

Esta es la opción más simple, especialmente para nic.cl. Solo cambias los nameservers y Vercel maneja todo automáticamente.

#### 1.1 Agregar Dominio en Vercel

1. **Ve a tu proyecto en Vercel:**
   - Abre: https://vercel.com/dashboard
   - Selecciona tu proyecto `sistema-playbox`

2. **Ve a la configuración del dominio:**
   - Click en **Settings** (Configuración)
   - En el menú lateral, click en **Domains** (Dominios)

3. **Agregar dominio:**
   - En el campo de texto, ingresa tu dominio (ej: `tudominio.cl`)
   - Click en **Add** (Agregar)

4. **Vercel te mostrará los Nameservers:**
   - Anota estos nameservers, los necesitarás en nic.cl
   - Ejemplo de lo que verás:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```
   - O puede mostrar:
     ```
     a.vercel-dns.com
     b.vercel-dns.com
     ```

#### 1.2 Configurar Nameservers en nic.cl

1. **Acceder a nic.cl:**
   - Ve a: https://www.nic.cl
   - Inicia sesión con tu cuenta

2. **Buscar tu dominio:**
   - Ve a la sección de "Mis Dominios" o "Gestión de Dominios"
   - Selecciona tu dominio `.cl`

3. **Cambiar Nameservers:**
   - Busca la opción "Nameservers" o "Servidores de Nombre"
   - Cambia los nameservers actuales por los de Vercel:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```
   - O los que Vercel te haya dado (pueden ser `a.vercel-dns.com` y `b.vercel-dns.com`)

4. **Guardar cambios:**
   - Click en "Guardar" o "Actualizar"
   - nic.cl puede pedir confirmación

5. **Esperar propagación:**
   - ⏱️ Tiempo: 5 minutos a 48 horas (generalmente 10-30 minutos)
   - Verificar en: https://dnschecker.org
   - Busca tu dominio y verifica que los nameservers sean los de Vercel

#### 1.3 Verificar en Vercel

1. **Después de la propagación:**
   - Vuelve a Vercel → Settings → Domains
   - Tu dominio debería aparecer como **Valid** (Válido)
   - Si no, espera un poco más

---

### Opción B: Usar Registros DNS Individuales (Alternativa)

Si prefieres mantener tus nameservers actuales, puedes usar registros DNS individuales:

#### 1.1 Agregar Dominio en Vercel

1. **Ve a tu proyecto en Vercel:**
   - Abre: https://vercel.com/dashboard
   - Selecciona tu proyecto `sistema-playbox`

2. **Ve a la configuración del dominio:**
   - Click en **Settings** (Configuración)
   - En el menú lateral, click en **Domains** (Dominios)

3. **Agregar dominio:**
   - En el campo de texto, ingresa tu dominio (ej: `tudominio.cl` o `app.tudominio.cl`)
   - Click en **Add** (Agregar)

4. **Vercel te mostrará los registros DNS necesarios:**
   - Anota estos registros, los necesitarás en el siguiente paso
   - Ejemplo de lo que verás:
     ```
     Tipo: A
     Nombre: @
     Valor: 76.76.21.21
     
     Tipo: CNAME
     Nombre: www
     Valor: cname.vercel-dns.com
     ```

---

## 🔧 PASO 2: Configurar DNS (Solo si usaste Opción B)

**Si usaste la Opción A (Nameservers de Vercel), puedes saltar este paso.** Vercel maneja todo automáticamente.

### 2.1 Acceder a la Configuración DNS

1. **Ve al panel de tu proveedor de dominio:**
   - Si usas Cloudflare: https://dash.cloudflare.com
   - Si usas Namecheap: https://ap.www.namecheap.com
   - Si usas GoDaddy: https://dcc.godaddy.com
   - Si usas Freenom: https://my.freenom.com
   - Si usas nic.cl: https://www.nic.cl
   - (O el panel de tu proveedor)

2. **Busca la sección de DNS:**
   - Generalmente está en "DNS Management", "DNS Records", o "Zone Editor"
   - En nic.cl puede estar en "Zona DNS" o "Registros DNS"

### 2.2 Agregar Registros DNS de Vercel

1. **Agregar registro A (si Vercel lo requiere):**
   - Tipo: `A`
   - Nombre: `@` (o deja en blanco, según tu proveedor)
   - Valor: La IP que Vercel te dio (ej: `76.76.21.21`)
   - TTL: `3600` (o automático)

2. **Agregar registro CNAME para www:**
   - Tipo: `CNAME`
   - Nombre: `www`
   - Valor: `cname.vercel-dns.com` (o el que Vercel te indique)
   - TTL: `3600`

3. **Si Vercel te dio otros registros, agrégalos también**

4. **Guardar los cambios**

### 2.3 Esperar Propagación DNS

- ⏱️ **Tiempo de propagación:** 5 minutos a 48 horas (generalmente 10-30 minutos)
- 🔍 **Verificar propagación:** Usa https://dnschecker.org
  - Ingresa tu dominio
  - Selecciona tipo `A` o `CNAME`
  - Verifica que los valores coincidan con lo que configuraste

---

## 📧 PASO 3: Configurar Resend

### 3.1 Crear Cuenta en Resend

1. **Ve a Resend:**
   - Abre: https://resend.com
   - Click en **Sign Up** (Registrarse)
   - Crea tu cuenta (puedes usar GitHub para registro rápido)

2. **Verificar tu email:**
   - Revisa tu bandeja de entrada
   - Click en el enlace de verificación

### 3.2 Obtener API Key

1. **Ve al Dashboard de Resend:**
   - Después de iniciar sesión, ve a: https://resend.com/api-keys

2. **Crear API Key:**
   - Click en **Create API Key** (Crear API Key)
   - Dale un nombre: `Sistema Playbox - Vercel`
   - Selecciona permisos: `Sending access` (Acceso de envío)
   - Click en **Add** (Agregar)

3. **Copiar la API Key:**
   - ⚠️ **IMPORTANTE:** Copia la API Key inmediatamente
   - Tiene el formato: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **No podrás verla de nuevo**, así que guárdala en un lugar seguro

### 3.3 Verificar Dominio en Resend

1. **Ve a la sección de Dominios:**
   - En el menú lateral, click en **Domains** (Dominios)
   - O ve directamente a: https://resend.com/domains

2. **Agregar dominio:**
   - Click en **Add Domain** (Agregar Dominio)
   - Ingresa tu dominio: `tudominio.com` (sin www)
   - Click en **Add** (Agregar)

3. **Resend te mostrará los registros DNS necesarios:**
   - Anota estos registros, son diferentes a los de Vercel
   - Ejemplo de lo que verás:
     ```
     Tipo: TXT
     Nombre: @
     Valor: "v=spf1 include:resend.com ~all"
     
     Tipo: CNAME
     Nombre: resend._domainkey
     Valor: resend._domainkey.resend.com
     
     Tipo: TXT
     Nombre: @
     Valor: "v=DMARC1; p=none;"
     ```

### 3.4 Agregar Registros DNS de Resend

**IMPORTANTE:** Si usaste nameservers de Vercel (Opción A), necesitas agregar los registros DNS de Resend **en Vercel**, no en nic.cl.

#### Si usaste Nameservers de Vercel (Opción A):

1. **Ve a Vercel → Tu Proyecto → Settings → Domains**
2. **Click en tu dominio**
3. **Ve a la pestaña "DNS Records" o "DNS"**
4. **Agregar registros DNS de Resend aquí:**
   - Click en "Add Record" (Agregar Registro)
   - Agrega cada registro que Resend te indicó:
     - **SPF (TXT):**
       - Tipo: `TXT`
       - Nombre: `@` (o deja en blanco)
       - Valor: `v=spf1 include:resend.com ~all`
     - **DKIM (CNAME):**
       - Tipo: `CNAME`
       - Nombre: `resend._domainkey` (o el que Resend te indique)
       - Valor: `resend._domainkey.resend.com` (o el que Resend te indique)
     - **DMARC (TXT):**
       - Tipo: `TXT`
       - Nombre: `_dmarc` (o el que Resend te indique)
       - Valor: `v=DMARC1; p=none;` (o el que Resend te indique)
5. **Guardar cada registro**

#### Si usaste Registros DNS Individuales (Opción B):

1. **Vuelve al panel DNS de tu proveedor de dominio (nic.cl u otro)**

2. **Agregar registro SPF (TXT):**
   - Tipo: `TXT`
   - Nombre: `@` (o deja en blanco)
   - Valor: `v=spf1 include:resend.com ~all`
   - TTL: `3600`

3. **Agregar registro DKIM (CNAME):**
   - Tipo: `CNAME`
   - Nombre: `resend._domainkey` (o el que Resend te indique)
   - Valor: `resend._domainkey.resend.com` (o el que Resend te indique)
   - TTL: `3600`

4. **Agregar registro DMARC (TXT):**
   - Tipo: `TXT`
   - Nombre: `_dmarc` (o el que Resend te indique)
   - Valor: `v=DMARC1; p=none;` (o el que Resend te indique)
   - TTL: `3600`

5. **Si Resend te da más registros, agrégalos todos**

6. **Guardar los cambios**

### 3.5 Verificar Dominio en Resend

1. **Esperar propagación DNS (10-30 minutos)**

2. **Volver a Resend:**
   - Ve a: https://resend.com/domains
   - Click en **Verify** (Verificar) en tu dominio
   - O Resend verificará automáticamente

3. **Estado de verificación:**
   - ✅ **Verified** (Verificado) = Listo para usar
   - ⏳ **Pending** (Pendiente) = Esperando verificación
   - ❌ **Failed** (Fallido) = Revisa los registros DNS

---

## ⚙️ PASO 4: Configurar Variables de Entorno en Vercel

### 4.1 Agregar Variables de Entorno

1. **Ve a tu proyecto en Vercel:**
   - Abre: https://vercel.com/dashboard
   - Selecciona tu proyecto `sistema-playbox`

2. **Ve a Settings → Environment Variables:**
   - Click en **Settings** (Configuración)
   - En el menú lateral, click en **Environment Variables** (Variables de Entorno)

3. **Agregar RESEND_API_KEY:**
   - **Key:** `RESEND_API_KEY`
   - **Value:** La API Key que copiaste de Resend (ej: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Environments:** Marca todas las opciones:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Click en **Save** (Guardar)

4. **Agregar RESEND_FROM_EMAIL:**
   - **Key:** `RESEND_FROM_EMAIL`
   - **Value:** El email de tu dominio verificado (ej: `noreply@tudominio.com`)
   - **Environments:** Marca todas las opciones
   - Click en **Save** (Guardar)

5. **Agregar RESEND_FROM_NAME (Opcional):**
   - **Key:** `RESEND_FROM_NAME`
   - **Value:** `Tec-Solution` (o el nombre que quieras)
   - **Environments:** Marca todas las opciones
   - Click en **Save** (Guardar)

### 4.2 Hacer Nuevo Deploy

1. **Después de agregar las variables:**
   - Ve a la pestaña **Deployments** (Despliegues)
   - Click en los tres puntos (⋯) del último deployment
   - Click en **Redeploy** (Redesplegar)
   - O simplemente haz un nuevo push a GitHub

---

## ✅ PASO 5: Verificar que Todo Funciona

### 5.1 Verificar en Vercel

1. **Verificar dominio:**
   - Ve a Settings → Domains
   - Tu dominio debe aparecer como **Valid** (Válido)

### 5.2 Verificar en Resend

1. **Verificar dominio:**
   - Ve a: https://resend.com/domains
   - Tu dominio debe aparecer como **Verified** (Verificado)

### 5.3 Probar Envío de Email

1. **Crear una orden de prueba:**
   - Ve a tu aplicación
   - Crea una nueva orden con un cliente que tenga email válido
   - El sistema debería enviar el email automáticamente

2. **Verificar logs en Vercel:**
   - Ve a tu proyecto → **Deployments**
   - Click en el último deployment
   - Ve a la pestaña **Functions** (Funciones)
   - Click en `/api/send-order-email`
   - Revisa los logs para ver si hay errores

3. **Verificar en Resend:**
   - Ve a: https://resend.com/emails
   - Deberías ver los emails enviados
   - Click en un email para ver detalles

---

## 🔍 Solución de Problemas

### Problema: Dominio no se verifica en Vercel

**Solución:**
- Verifica que los registros DNS estén correctos
- Espera más tiempo (hasta 48 horas)
- Usa https://dnschecker.org para verificar propagación
- Asegúrate de que no hay conflictos con otros registros

### Problema: Dominio no se verifica en Resend

**Solución:**
- Verifica que todos los registros DNS de Resend estén agregados
- Asegúrate de que los valores son exactos (incluyendo comillas si las hay)
- Espera más tiempo para propagación
- Revisa que no haya conflictos con otros registros SPF/DMARC

### Problema: Emails no se envían

**Solución:**
1. Verifica que `RESEND_API_KEY` esté configurada en Vercel
2. Verifica que `RESEND_FROM_EMAIL` sea del dominio verificado
3. Revisa los logs en Vercel Functions
4. Revisa los logs en Resend Dashboard
5. Verifica que el email del destinatario sea válido

### Problema: Emails van a Spam

**Solución:**
- Asegúrate de que todos los registros DNS de Resend estén configurados
- Verifica que el dominio esté completamente verificado
- Espera unos días para que el dominio "caliente" (warm up)
- Considera configurar registros SPF y DMARC más estrictos

---

## 📝 Resumen de Variables de Entorno Necesarias

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com
RESEND_FROM_NAME=Tec-Solution

# Supabase (ya deberías tenerlas)
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
```

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu sistema debería:
- ✅ Enviar emails automáticamente al crear órdenes
- ✅ Adjuntar el PDF de la orden
- ✅ Usar tu dominio personalizado como remitente
- ✅ Llegar a la bandeja de entrada (no spam)

Si tienes problemas, revisa los logs en Vercel y Resend para más detalles.
