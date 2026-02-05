# 🇨🇱 Configurar Dominio .cl en Vercel con nic.cl

Guía específica para configurar un dominio `.cl` de nic.cl con Vercel usando nameservers.

## ✅ Método Recomendado: Usar Nameservers de Vercel

Este es el método más simple y recomendado para nic.cl.

---

## 🚀 PASO 1: Agregar Dominio en Vercel

1. **Ve a tu proyecto en Vercel:**
   - Abre: https://vercel.com/dashboard
   - Selecciona tu proyecto `sistema-playbox`

2. **Ve a Settings → Domains:**
   - Click en **Settings** (Configuración)
   - Click en **Domains** (Dominios)

3. **Agregar tu dominio:**
   - Ingresa tu dominio: `tudominio.cl`
   - Click en **Add** (Agregar)

4. **Vercel te mostrará los Nameservers:**
   - Anota estos nameservers (pueden variar):
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```
   - O pueden ser:
     ```
     a.vercel-dns.com
     b.vercel-dns.com
     ```

---

## 🔧 PASO 2: Configurar Nameservers en nic.cl

### 2.1 Acceder a nic.cl

1. **Ve a nic.cl:**
   - Abre: https://www.nic.cl
   - Inicia sesión con tu cuenta

2. **Ir a Gestión de Dominios:**
   - En el menú, busca "Mis Dominios" o "Gestión de Dominios"
   - O ve directamente a: https://www.nic.cl/registro/consulta/

### 2.2 Cambiar Nameservers

1. **Seleccionar tu dominio:**
   - Busca tu dominio `.cl` en la lista
   - Click en el dominio para ver detalles

2. **Ir a Configuración de Nameservers:**
   - Busca la opción "Nameservers" o "Servidores de Nombre"
   - O busca "DNS" o "Configuración DNS"

3. **Editar Nameservers:**
   - Cambia el modo de "Usar nameservers del registrador" a "Usar nameservers personalizados"
   - O busca la opción para editar nameservers

4. **Ingresar Nameservers de Vercel:**
   - **Nameserver 1:** `ns1.vercel-dns.com` (o `a.vercel-dns.com`)
   - **Nameserver 2:** `ns2.vercel-dns.com` (o `b.vercel-dns.com`)
   - Si hay campos para más nameservers, déjalos en blanco o usa los mismos

5. **Guardar cambios:**
   - Click en "Guardar" o "Actualizar"
   - nic.cl puede pedir confirmación por email

### 2.3 Verificar en nic.cl

1. **Después de guardar:**
   - Verifica que los nameservers se hayan actualizado correctamente
   - Puede tomar unos minutos en reflejarse en la interfaz

---

## ⏱️ PASO 3: Esperar Propagación

1. **Tiempo de propagación:**
   - ⏱️ Generalmente: 10-30 minutos
   - ⏱️ Máximo: 48 horas (raro)

2. **Verificar propagación:**
   - Usa: https://dnschecker.org
   - Ingresa tu dominio: `tudominio.cl`
   - Selecciona tipo: `NS` (Nameservers)
   - Verifica que aparezcan los nameservers de Vercel

3. **Verificar en Vercel:**
   - Vuelve a Vercel → Settings → Domains
   - Tu dominio debería aparecer como **Valid** (Válido)
   - Si dice "Pending" o "Invalid", espera un poco más

---

## 📧 PASO 4: Configurar DNS de Resend en Vercel

**IMPORTANTE:** Como estás usando nameservers de Vercel, los registros DNS de Resend se agregan **en Vercel**, no en nic.cl.

### 4.1 Obtener Registros DNS de Resend

1. **Ve a Resend:**
   - Abre: https://resend.com/domains
   - Click en "Add Domain" (Agregar Dominio)
   - Ingresa: `tudominio.cl`
   - Click en "Add"

2. **Anotar registros DNS:**
   - Resend te mostrará los registros necesarios
   - Ejemplo:
     ```
     Tipo: TXT
     Nombre: @
     Valor: v=spf1 include:resend.com ~all
     
     Tipo: CNAME
     Nombre: resend._domainkey
     Valor: resend._domainkey.resend.com
     
     Tipo: TXT
     Nombre: _dmarc
     Valor: v=DMARC1; p=none;
     ```

### 4.2 Agregar Registros en Vercel

1. **Ve a Vercel → Tu Proyecto → Settings → Domains**

2. **Click en tu dominio `tudominio.cl`**

3. **Busca la sección "DNS Records" o "DNS"**

4. **Agregar cada registro de Resend:**
   - Click en "Add Record" (Agregar Registro)
   - Para cada registro de Resend:
     - **SPF (TXT):**
       - Tipo: `TXT`
       - Nombre: `@` (o deja en blanco)
       - Valor: `v=spf1 include:resend.com ~all`
       - Click en "Save"
     - **DKIM (CNAME):**
       - Tipo: `CNAME`
       - Nombre: `resend._domainkey` (o el que Resend te indique)
       - Valor: `resend._domainkey.resend.com` (o el que Resend te indique)
       - Click en "Save"
     - **DMARC (TXT):**
       - Tipo: `TXT`
       - Nombre: `_dmarc` (o el que Resend te indique)
       - Valor: `v=DMARC1; p=none;` (o el que Resend te indique)
       - Click en "Save"

5. **Esperar propagación (10-30 minutos)**

6. **Verificar en Resend:**
   - Vuelve a Resend → Domains
   - Click en "Verify" (Verificar)
   - Espera hasta que diga "Verified" (Verificado)

---

## ✅ Ventajas de Usar Nameservers de Vercel

- ✅ **Más simple:** Solo cambias nameservers una vez
- ✅ **Automático:** Vercel maneja todos los registros DNS
- ✅ **Fácil de agregar registros:** Todo se hace desde Vercel
- ✅ **Mejor para Resend:** Agregas registros DNS de Resend directamente en Vercel

---

## 🔍 Verificación Final

### En Vercel:
- ✅ Dominio aparece como "Valid"
- ✅ Registros DNS de Resend agregados

### En Resend:
- ✅ Dominio aparece como "Verified"

### En nic.cl:
- ✅ Nameservers actualizados a los de Vercel

---

## 📝 Resumen de Pasos

1. ✅ Agregar dominio en Vercel
2. ✅ Anotar nameservers de Vercel
3. ✅ Cambiar nameservers en nic.cl
4. ✅ Esperar propagación (10-30 min)
5. ✅ Verificar dominio en Vercel
6. ✅ Agregar dominio en Resend
7. ✅ Agregar registros DNS de Resend en Vercel
8. ✅ Verificar dominio en Resend
9. ✅ Configurar variables de entorno en Vercel

---

## 🆘 Problemas Comunes

### Problema: Nameservers no se actualizan en nic.cl

**Solución:**
- Verifica que estés en la sección correcta
- Algunos dominios .cl pueden tener restricciones
- Contacta soporte de nic.cl si es necesario

### Problema: Dominio no se verifica en Vercel

**Solución:**
- Espera más tiempo (hasta 48 horas)
- Verifica en dnschecker.org que los nameservers sean correctos
- Asegúrate de haber guardado los cambios en nic.cl

### Problema: No puedo agregar registros DNS en Vercel

**Solución:**
- Asegúrate de que el dominio esté verificado primero
- Algunos planes de Vercel pueden tener limitaciones
- Verifica que estés en la sección correcta de DNS

---

## 📞 Soporte

Si tienes problemas:
- **Vercel:** https://vercel.com/support
- **nic.cl:** https://www.nic.cl/contacto/
- **Resend:** https://resend.com/support
