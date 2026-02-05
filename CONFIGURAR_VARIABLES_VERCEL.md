# ⚙️ Configurar Variables de Entorno en Vercel

## Variables Requeridas

Para que el sistema pueda enviar emails, necesitas configurar estas variables de entorno en Vercel:

1. **RESEND_API_KEY** - Tu API Key de Resend
2. **RESEND_FROM_EMAIL** - Email del dominio verificado en Resend (ej: `noreply@tudominio.com`)
3. **RESEND_FROM_NAME** - (Opcional) Nombre que aparecerá como remitente (por defecto: "Playbox")

---

## 🚀 Pasos para Configurar

### Paso 1: Obtener tu API Key de Resend

1. Ve a [Resend Dashboard](https://resend.com/api-keys)
2. Si no tienes una API Key, crea una:
   - Click en **"Create API Key"**
   - Dale un nombre (ej: "Playbox Production")
   - Copia la API Key (solo se muestra una vez)

### Paso 2: Verificar tu Dominio en Resend

1. Ve a [Resend Domains](https://resend.com/domains)
2. Si no has verificado tu dominio, sigue la guía en `CONFIGURAR_RESEND_COMPLETO.md`
3. Una vez verificado, podrás usar emails como `noreply@tudominio.com`

### Paso 3: Configurar Variables en Vercel

1. **Ve a tu proyecto en Vercel:**
   - Abre: https://vercel.com/dashboard
   - Selecciona tu proyecto `sistema-playbox`

2. **Ve a Settings → Environment Variables:**
   - Click en **Settings** (Configuración)
   - En el menú lateral, click en **Environment Variables**

3. **Agregar las variables:**

   **Variable 1: RESEND_API_KEY**
   - **Key**: `RESEND_API_KEY`
   - **Value**: Pega tu API Key de Resend
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - Click en **Save**

   **Variable 2: RESEND_FROM_EMAIL**
   - **Key**: `RESEND_FROM_EMAIL`
   - **Value**: Tu email del dominio verificado (ej: `noreply@tudominio.com` o `info@tudominio.com`)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - Click en **Save**

   **Variable 3: RESEND_FROM_NAME** (Opcional)
   - **Key**: `RESEND_FROM_NAME`
   - **Value**: `Playbox` (o el nombre que prefieras)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - Click en **Save**

4. **Redeploy tu aplicación:**
   - Después de agregar las variables, necesitas hacer un nuevo deploy
   - Ve a **Deployments**
   - Click en los **3 puntos** (⋯) del último deployment
   - Click en **Redeploy**
   - O simplemente haz un push a tu repositorio

---

## ✅ Verificar que Funciona

1. **Espera a que termine el redeploy** (1-2 minutos)
2. **Intenta enviar un email** desde la aplicación
3. **Revisa los logs en Vercel:**
   - Ve a **Deployments** → Click en el último deployment
   - Ve a la pestaña **Functions** → `/api/send-order-email`
   - O ve a **Logs** para ver los logs en tiempo real

---

## 🔍 Troubleshooting

### Error: "RESEND_API_KEY no configurada"
- ✅ Verifica que agregaste la variable `RESEND_API_KEY` en Vercel
- ✅ Verifica que hiciste redeploy después de agregar la variable
- ✅ Verifica que la variable está en el environment correcto (Production/Preview/Development)

### Error: "RESEND_FROM_EMAIL no configurada"
- ✅ Verifica que agregaste la variable `RESEND_FROM_EMAIL` en Vercel
- ✅ Verifica que el email es de un dominio verificado en Resend
- ✅ Verifica que hiciste redeploy después de agregar la variable

### Error: "Domain not verified"
- ✅ Ve a Resend → Domains y verifica que tu dominio esté verificado
- ✅ Verifica que los registros DNS estén configurados correctamente
- ✅ Espera 24-48 horas para la propagación completa

### Los emails no llegan
- ✅ Revisa la carpeta de spam
- ✅ Verifica los logs en Vercel para ver si hay errores
- ✅ Verifica que el email del destinatario es válido
- ✅ En Resend Dashboard, ve a "Emails" para ver el estado de los emails enviados

---

## 📝 Notas Importantes

- ⚠️ **Nunca compartas tu API Key públicamente**
- ⚠️ **Las variables de entorno son sensibles, no las subas a Git**
- ✅ **Usa diferentes API Keys para desarrollo y producción**
- ✅ **El email `RESEND_FROM_EMAIL` debe ser de un dominio verificado en Resend**

---

## 🎯 Ejemplo de Configuración

```
RESEND_API_KEY = re_1234567890abcdefghijklmnopqrstuvwxyz
RESEND_FROM_EMAIL = noreply@playboxlaspalmas.cl
RESEND_FROM_NAME = Playbox
```

---

## 📚 Más Información

- Guía completa de Resend: `CONFIGURAR_RESEND_COMPLETO.md`
- Documentación de Resend: https://resend.com/docs
