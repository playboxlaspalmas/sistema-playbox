# 🔧 Solución al Error 413: Bucket de Storage No Encontrado

## Problema

El error 413 (`Content Too Large`) ocurre porque el bucket de Supabase Storage `order-pdfs` no existe. Cuando el sistema intenta subir el PDF a storage y falla, intenta enviar el PDF como base64 en el body del request, lo que causa el error 413.

## Solución Rápida

### Opción 1: Crear el Bucket Manualmente (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, ve a **Storage**
3. Click en **"New bucket"** o **"Create bucket"**
4. Configura:
   - **Name**: `order-pdfs` (exactamente así, sin espacios)
   - **Public bucket**: ✅ **Marcar como público** (MUY IMPORTANTE)
   - **File size limit**: `10 MB` (o más si necesitas)
   - **Allowed MIME types**: `application/pdf`
5. Click en **"Create bucket"**

### Opción 2: Crear el Bucket con SQL (Más Rápido)

1. Ve a **SQL Editor** en Supabase
2. Abre el archivo `database/create_storage_bucket.sql` de este proyecto
3. Copia y pega todo el contenido
4. Click en **"Run"** o presiona `Ctrl+Enter`

El script creará:
- El bucket `order-pdfs`
- Las políticas de acceso necesarias (lectura pública, subida/actualización/eliminación para usuarios autenticados)

## Verificar que Funciona

Después de crear el bucket:

1. Ve a **Storage** → **order-pdfs**
2. Deberías ver el bucket listado
3. Intenta reenviar un PDF por email
4. Debería funcionar sin el error 413

## Fallback Automático

Si el bucket no existe, el sistema ahora:

1. ✅ Muestra un mensaje claro indicando que el bucket no existe
2. ✅ Intenta usar `pdfBase64` como fallback (solo si el PDF es menor a 3MB)
3. ⚠️ Si el PDF es muy grande (>3MB), muestra un error y sugiere crear el bucket

**Nota**: El fallback con `pdfBase64` puede funcionar para PDFs pequeños, pero para PDFs grandes siempre necesitarás el bucket de storage.

## Políticas de Acceso

El script SQL crea automáticamente las siguientes políticas:

- **Lectura Pública**: Cualquiera puede descargar los PDFs (necesario para los links en los emails)
- **Subida/Actualización/Eliminación**: Solo usuarios autenticados pueden subir, actualizar o eliminar PDFs

## Troubleshooting

### Error: "Bucket not found"
- ✅ Verifica que el bucket se llama exactamente `order-pdfs` (sin espacios, minúsculas)
- ✅ Verifica que el bucket está marcado como **público**

### Error: "Permission denied"
- ✅ Verifica que las políticas de acceso están creadas (ejecuta el script SQL)
- ✅ Verifica que estás autenticado en la aplicación

### Error 413 persiste después de crear el bucket
- ✅ Limpia el caché del navegador (Ctrl+Shift+R)
- ✅ Verifica que el bucket está público
- ✅ Revisa los logs de la consola para ver el tamaño del body
