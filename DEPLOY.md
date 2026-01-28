# 🚀 Guía Completa de Deploy - GitHub + Vercel

Esta guía te ayudará a desplegar el Sistema de Gestión de Órdenes en Vercel usando GitHub.

## 📋 Prerrequisitos

- ✅ Cuenta de GitHub
- ✅ Cuenta de Vercel (puedes usar GitHub para registrarte)
- ✅ Proyecto Supabase configurado
- ✅ Base de datos configurada (ejecutar `database/schema_completo.sql`)

---

## Paso 1: Preparar el Proyecto para GitHub

### 1.1 Verificar que .gitignore esté completo

El archivo `.gitignore` ya está configurado e incluye:
- `node_modules/`
- `.env.local` y otros archivos `.env*`
- `dist/` y `.vercel/`
- Archivos del sistema operativo

### 1.2 Inicializar Git (si no lo has hecho)

```bash
cd sistema-gestion-ordenes

# Inicializar repositorio
git init

# Agregar todos los archivos
git add .

# Primer commit
git commit -m "Initial commit: Sistema de Gestión de Órdenes"
```

### 1.3 Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com) e inicia sesión
2. Haz clic en **"New repository"** (botón verde)
3. Configura el repositorio:
   - **Name**: `sistema-gestion-ordenes` (o el nombre que prefieras)
   - **Description**: "Sistema de gestión de órdenes de servicio técnico"
   - **Visibility**: Private (recomendado) o Public
   - ⚠️ **NO marques** "Add a README file" (ya tienes uno)
   - ⚠️ **NO marques** "Add .gitignore" (ya tienes uno)
   - ⚠️ **NO marques** "Choose a license"
4. Haz clic en **"Create repository"**
5. Copia la URL del repositorio (ej: `https://github.com/tu-usuario/sistema-gestion-ordenes.git`)

### 1.4 Conectar Repositorio Local con GitHub

```bash
# Agregar remote
git remote add origin https://github.com/tu-usuario/sistema-gestion-ordenes.git

# Cambiar branch a main (si estás en master)
git branch -M main

# Subir código
git push -u origin main
```

Si te pide autenticación, usa un Personal Access Token de GitHub.

---

## Paso 2: Configurar Vercel

### 2.1 Crear Cuenta en Vercel

1. Ve a [Vercel](https://vercel.com)
2. Haz clic en **"Sign Up"**
3. Elige **"Continue with GitHub"** (recomendado)
4. Autoriza Vercel para acceder a tus repositorios

### 2.2 Importar Proyecto

1. En el dashboard de Vercel, haz clic en **"Add New Project"**
2. Selecciona tu repositorio `sistema-gestion-ordenes`
3. Vercel detectará automáticamente:
   - **Framework Preset**: Astro ✅
   - **Build Command**: `npm run build` ✅
   - **Output Directory**: `.vercel/output` ✅
   - **Install Command**: `npm install` ✅

**No necesitas cambiar nada**, pero puedes verificar en **"Configure Project"**

### 2.3 Configurar Variables de Entorno

**⚠️ IMPORTANTE:** Debes configurar las variables ANTES del primer deploy.

1. En la pantalla de configuración, expande **"Environment Variables"**
2. Agrega cada variable una por una:

#### Variables Requeridas:

```
PUBLIC_SUPABASE_URL
```
- **Value**: Tu URL de Supabase (ej: `https://xxxxx.supabase.co`)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

```
PUBLIC_SUPABASE_ANON_KEY
```
- **Value**: Tu Anon Key de Supabase
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

```
PUBLIC_SUPABASE_SERVICE_ROLE_KEY
```
- **Value**: Tu Service Role Key de Supabase
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- ⚠️ Esta key es sensible, nunca la compartas

#### Variables Opcionales:

```
RESEND_API_KEY
```
- **Value**: Tu API key de Resend (solo si usas envío de emails)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- ⚠️ Esta key es sensible

**Cómo obtener las keys de Supabase:**
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Settings → API**
3. Copia:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

**Cómo obtener la key de Resend:**
1. Ve a [Resend](https://resend.com) y crea una cuenta
2. Ve a **API Keys**
3. Crea una nueva key y cópiala

### 2.4 Realizar el Deploy

1. Haz clic en **"Deploy"**
2. Espera a que Vercel construya tu aplicación (2-5 minutos)
3. Una vez completado, obtendrás una URL como:
   - `https://sistema-gestion-ordenes.vercel.app`

---

## Paso 3: Verificar el Deploy

### 3.1 Verificar que la App Funciona

1. Visita la URL de producción
2. Deberías ver la página de login
3. Intenta iniciar sesión con un usuario de prueba

### 3.2 Verificar Variables de Entorno

Si ves errores relacionados con variables de entorno:

1. Ve a **Settings → Environment Variables** en Vercel
2. Verifica que todas las variables estén agregadas
3. Asegúrate de que estén marcadas para **Production**
4. Haz un **nuevo deploy** después de agregar/editar variables:
   - Ve a **Deployments**
   - Haz clic en los 3 puntos (⋯) del último deploy
   - Selecciona **"Redeploy"**

### 3.3 Verificar Logs

Si hay errores:

1. Ve a **Deployments** en Vercel
2. Haz clic en el último deploy
3. Revisa los **"Build Logs"** y **"Function Logs"**
4. Busca errores específicos

---

## Paso 4: Configurar Dominio Personalizado (Opcional)

1. Ve a **Settings → Domains** en Vercel
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio (ej: `app.tudominio.com`)
4. Sigue las instrucciones para configurar los registros DNS:
   - Agrega un registro CNAME apuntando a `cname.vercel-dns.com`
   - O un registro A apuntando a la IP de Vercel

---

## Actualizaciones Futuras

### Deploy Automático desde GitHub

Cada vez que hagas `git push` a la rama `main`, Vercel hará un deploy automático:

```bash
# Hacer cambios en tu código
git add .
git commit -m "Descripción de los cambios"
git push
```

Vercel detectará el push y:
1. Creará un nuevo deploy automáticamente
2. Te enviará una notificación cuando esté listo
3. Si el deploy falla, recibirás un email con los detalles

### Deploy Manual

Si quieres hacer un deploy manual sin hacer push:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Troubleshooting

### ❌ Error: "Missing environment variables"

**Solución:**
1. Ve a **Settings → Environment Variables** en Vercel
2. Verifica que todas las variables estén agregadas
3. Asegúrate de que estén marcadas para **Production**
4. Haz un **Redeploy** después de agregar variables

### ❌ Error: "Module not found"

**Solución:**
1. Verifica que `package.json` tenga todas las dependencias
2. Prueba el build localmente: `npm run build`
3. Si funciona localmente pero falla en Vercel, verifica que `package-lock.json` esté en el repositorio

### ❌ Error: "API route not found"

**Solución:**
1. Verifica que `astro.config.mjs` tenga `output: 'server'` o `output: 'hybrid'`
2. Verifica que el adapter de Vercel esté configurado: `adapter: vercel()`
3. Asegúrate de que las rutas API estén en `src/pages/api/`

### ❌ Error: "Resend API key not found"

**Solución:**
1. Agrega `RESEND_API_KEY` en Vercel Environment Variables
2. Haz un **Redeploy**

### ❌ Error: "Supabase connection failed"

**Solución:**
1. Verifica que `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` estén correctas
2. Verifica que tu proyecto Supabase esté activo
3. Verifica que las políticas RLS estén configuradas correctamente

### ❌ Build funciona pero la app no carga

**Solución:**
1. Revisa los logs de funciones en Vercel
2. Verifica que todas las variables de entorno estén configuradas
3. Abre la consola del navegador para ver errores del cliente

---

## Estructura de Archivos Importantes

```
sistema-gestion-ordenes/
├── .env.example          # Plantilla de variables de entorno
├── .gitignore           # Archivos ignorados por Git
├── vercel.json          # Configuración de Vercel
├── astro.config.mjs     # Configuración de Astro (con adapter de Vercel)
├── package.json         # Dependencias y scripts
└── database/
    └── schema_completo.sql  # Script SQL para crear la base de datos
```

---

## Enlaces Útiles

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Astro](https://docs.astro.build)
- [Deploy de Astro en Vercel](https://docs.astro.build/en/guides/deploy/vercel/)
- [Supabase Dashboard](https://app.supabase.com)
- [Resend Dashboard](https://resend.com)

---

## Checklist de Deploy

Antes de hacer deploy, verifica:

- [ ] Código subido a GitHub
- [ ] `.env.local` NO está en el repositorio (verificado con `.gitignore`)
- [ ] Variables de entorno configuradas en Vercel
- [ ] Base de datos configurada en Supabase
- [ ] Build funciona localmente (`npm run build`)
- [ ] Preview funciona localmente (`npm run preview`)
- [ ] Usuarios de prueba creados en Supabase

---

## Soporte

Si tienes problemas con el deploy:

1. Revisa los logs en Vercel
2. Verifica que todas las variables estén configuradas
3. Prueba el build localmente primero
4. Revisa la documentación de Vercel y Astro

¡Buena suerte con tu deploy! 🚀
