# ✅ Checklist Pre-Deploy

Usa este checklist antes de hacer deploy a Vercel para asegurarte de que todo esté listo.

## 📋 Antes de Subir a GitHub

### Archivos y Configuración
- [ ] `.env.local` NO está en el repositorio (verificado con `git status`)
- [ ] `.gitignore` incluye `.env*` y `node_modules/`
- [ ] `package.json` tiene todas las dependencias necesarias
- [ ] `package-lock.json` está en el repositorio
- [ ] `vercel.json` existe y está configurado
- [ ] `astro.config.mjs` tiene `adapter: vercel()` configurado
- [ ] `.env.example` existe con todas las variables documentadas

### Código
- [ ] El proyecto compila sin errores: `npm run build`
- [ ] El preview funciona: `npm run preview`
- [ ] No hay errores de TypeScript: `npm run check`
- [ ] Todos los imports están correctos
- [ ] No hay console.logs de debug innecesarios

### Base de Datos
- [ ] Base de datos configurada en Supabase
- [ ] `database/schema_completo.sql` ejecutado
- [ ] Políticas RLS configuradas
- [ ] Usuarios de prueba creados
- [ ] Al menos un usuario admin existe

---

## 📋 Antes de Deploy en Vercel

### Variables de Entorno
- [ ] `PUBLIC_SUPABASE_URL` configurada
- [ ] `PUBLIC_SUPABASE_ANON_KEY` configurada
- [ ] `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` configurada
- [ ] `RESEND_API_KEY` configurada (si usas emails)
- [ ] Todas las variables marcadas para Production, Preview y Development

### Configuración de Vercel
- [ ] Proyecto conectado con GitHub
- [ ] Framework detectado correctamente (Astro)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.vercel/output` (automático)
- [ ] Node.js version: 18.x o superior

---

## 📋 Después del Deploy

### Verificación Funcional
- [ ] La página de login carga correctamente
- [ ] Puedo iniciar sesión con un usuario de prueba
- [ ] El dashboard carga después del login
- [ ] Las rutas principales funcionan
- [ ] No hay errores en la consola del navegador
- [ ] Las imágenes/logo cargan correctamente

### Verificación de Funcionalidades
- [ ] Crear una orden funciona
- [ ] Ver lista de órdenes funciona
- [ ] Buscar clientes funciona
- [ ] Punto de Venta (POS) funciona (si aplica)
- [ ] Gestión de productos funciona (si aplica)
- [ ] Generación de PDF funciona
- [ ] Envío de emails funciona (si está configurado)

### Verificación de Logs
- [ ] Revisar Build Logs en Vercel (no hay errores)
- [ ] Revisar Function Logs (si hay API routes)
- [ ] No hay errores 500 en la consola del navegador

---

## 🚨 Problemas Comunes y Soluciones

### Build Falla
- [ ] Verificar que todas las dependencias estén en `package.json`
- [ ] Verificar que `package-lock.json` esté en el repositorio
- [ ] Probar build local: `npm run build`
- [ ] Revisar logs de build en Vercel

### Variables de Entorno No Funcionan
- [ ] Verificar que las variables estén en Vercel
- [ ] Verificar que estén marcadas para Production
- [ ] Hacer un Redeploy después de agregar variables
- [ ] Verificar que los nombres de las variables sean exactos

### La App Carga pero Hay Errores
- [ ] Abrir consola del navegador (F12)
- [ ] Revisar errores en Network tab
- [ ] Verificar que Supabase esté accesible
- [ ] Verificar políticas RLS en Supabase

### API Routes No Funcionan
- [ ] Verificar que `output: 'server'` esté en `astro.config.mjs`
- [ ] Verificar que el adapter de Vercel esté configurado
- [ ] Revisar Function Logs en Vercel
- [ ] Verificar que las rutas estén en `src/pages/api/`

---

## 📝 Notas

- **NUNCA** subas `.env.local` a GitHub
- Siempre prueba el build localmente antes de hacer deploy
- Las variables de entorno deben agregarse ANTES del primer deploy
- Después de agregar variables, siempre haz un Redeploy

---

## ✅ Listo para Deploy

Si todos los items están marcados, estás listo para hacer deploy. Sigue la guía en [DEPLOY.md](./DEPLOY.md).
