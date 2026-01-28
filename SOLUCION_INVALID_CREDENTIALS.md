# 🔧 Solución: Invalid Credentials - Problema de Conexión

## 🔍 Diagnóstico

Si el usuario existe en ambas tablas (`auth.users` y `users`) pero sigue diciendo "Invalid credentials", el problema es que **las variables de entorno no están configuradas** o **el servidor no las está leyendo**.

## ✅ Solución Paso a Paso

### Paso 1: Verificar que existe el archivo .env.local

El archivo debe estar en:
```
sistema-gestion-ordenes/
└── .env.local  ← Debe existir aquí
```

### Paso 2: Crear el archivo .env.local

Si no existe, créalo con este contenido:

```env
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

### Paso 3: Obtener las credenciales de Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia estos valores:

   - **Project URL** → Pega en `PUBLIC_SUPABASE_URL`
   - **anon public** (Project API keys) → Pega en `PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (Project API keys) → Pega en `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

### Paso 4: Verificar el formato del archivo

El archivo `.env.local` debe verse así (sin espacios antes de las variables):

```env
PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.abcdefghijklmnopqrstuvwxyz1234567890
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4OTY3MjkwLCJleHAiOjE5NTQ1NDMyOTB9.abcdefghijklmnopqrstuvwxyz1234567890
```

### Paso 5: Reiniciar el servidor

**IMPORTANTE**: Después de crear o modificar `.env.local`, debes **reiniciar el servidor**:

1. Detén el servidor (Ctrl+C en la terminal)
2. Inicia de nuevo:
   ```powershell
   cd sistema-gestion-ordenes
   npm run dev
   ```

### Paso 6: Verificar en la consola del navegador

1. Abre el navegador
2. Presiona F12 para abrir las herramientas de desarrollador
3. Ve a la pestaña **Console**
4. Busca errores que digan:
   - "Missing Supabase environment variables"
   - O cualquier error relacionado con Supabase

Si ves estos errores, significa que las variables no se están leyendo correctamente.

## 🔍 Verificación Adicional

### Verificar que el usuario existe en auth.users

Ejecuta en Supabase SQL Editor:

```sql
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@servicio.com';
```

### Verificar que el usuario existe en users

```sql
SELECT id, email, role, name 
FROM users 
WHERE email = 'admin@servicio.com';
```

### Verificar que el UUID coincide

```sql
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  u.id as user_id,
  u.email as user_email,
  u.role
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'admin@servicio.com';
```

Ambos `id` deben ser **iguales**.

## 🐛 Problemas Comunes

### Problema 1: El servidor no lee las variables

**Solución**: 
- Asegúrate de que el archivo se llama exactamente `.env.local` (con el punto al inicio)
- Reinicia el servidor después de crear/modificar el archivo
- Verifica que no hay espacios antes de las variables

### Problema 2: Las keys están mal copiadas

**Solución**:
- Copia las keys completas (son muy largas)
- No dejes espacios al inicio o final
- Verifica que empiezan con `https://` para la URL y `eyJ` para las keys

### Problema 3: El usuario no puede iniciar sesión

**Solución**:
1. Verifica que el usuario existe en `auth.users`
2. Verifica que el password es correcto
3. Intenta resetear la contraseña desde Supabase Dashboard → Authentication → Users → Reset Password

### Problema 4: Error "Invalid credentials" pero todo está bien

**Solución**:
1. Verifica que las variables de entorno están correctas
2. Reinicia el servidor
3. Limpia la caché del navegador (Ctrl+Shift+Delete)
4. Intenta en modo incógnito

## 📝 Checklist Final

- [ ] Archivo `.env.local` existe en `sistema-gestion-ordenes/`
- [ ] Las 3 variables están configuradas (URL, ANON_KEY, SERVICE_ROLE_KEY)
- [ ] Los valores están correctos (copiados de Supabase)
- [ ] El servidor fue reiniciado después de crear/modificar `.env.local`
- [ ] El usuario existe en `auth.users` con el email correcto
- [ ] El usuario existe en `users` con el mismo UUID
- [ ] El role es 'admin' en la tabla `users`
- [ ] La contraseña es correcta

## ✅ Si todo está bien pero sigue fallando

Ejecuta este SQL para verificar la conexión:

```sql
-- Verificar que el usuario puede autenticarse
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'admin@servicio.com';
```

Si `email_confirmed_at` es NULL, el email no está confirmado. En Supabase Dashboard → Authentication → Users, verifica que el usuario tenga "Email Confirmed" en verde.
