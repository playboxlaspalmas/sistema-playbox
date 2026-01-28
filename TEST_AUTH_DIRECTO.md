# 🔍 Test de Autenticación Directo

## Prueba 1: Verificar Variables de Entorno en el Navegador

1. Abre el navegador en `http://localhost:4321/login`
2. Presiona **F12** → **Console**
3. Ejecuta esto:

```javascript
console.log('URL:', import.meta.env.PUBLIC_SUPABASE_URL);
console.log('Key existe:', !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
```

Si ves `undefined`, el problema es el `.env.local`.

## Prueba 2: Test Directo de Autenticación

En la consola del navegador, ejecuta:

```javascript
// Importar supabase
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');

// Crear cliente
const supabase = createClient(
  'https://qpmzvmpkcnzrbmaxqrmt.supabase.co',  // Tu URL
  'TU-ANON-KEY-AQUI'  // Tu anon key
);

// Intentar login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@servicio.com',
  password: '12345678'
});

console.log('Data:', data);
console.log('Error:', error);
```

Esto te mostrará el error exacto de Supabase.

## Prueba 3: Verificar en Supabase Dashboard

1. Ve a **Supabase Dashboard** → **Logs** → **Auth Logs**
2. Busca el intento de login más reciente
3. Haz clic en el log para ver los detalles
4. Revisa el mensaje de error específico

## Prueba 4: Verificar Configuración de Auth

1. Ve a **Supabase Dashboard** → **Authentication** → **Settings** → **Auth**
2. Verifica:
   - ✅ **"Enable Email Signup"** está activado
   - ✅ **"Site URL"** está configurado (puede ser `http://localhost:4321`)
   - ✅ **"Redirect URLs"** incluye `http://localhost:4321/**`

## Prueba 5: Verificar si hay Restricciones

1. Ve a **Supabase Dashboard** → **Authentication** → **Settings** → **Auth**
2. Busca:
   - **"Disable sign ups"** - Debe estar DESACTIVADO
   - **"Enable Email Confirmations"** - Si está activado, el email DEBE estar confirmado (ya lo está)
   - **"Email Domain Allowlist"** - Debe estar vacío o incluir tu dominio

## Prueba 6: Crear Usuario Nuevo y Probar

Ejecuta este SQL en Supabase:

```sql
-- Primero, elimina el usuario actual si quieres empezar de cero
-- (O crea uno nuevo con otro email)

-- Luego crea el usuario desde el Dashboard:
-- Authentication → Users → Add user
-- Email: admin@servicio.com
-- Password: 12345678
-- Auto Confirm: ✅

-- Luego ejecuta esto con el UUID del nuevo usuario:
INSERT INTO users (id, role, name, email) 
VALUES (
  'UUID-DEL-NUEVO-USUARIO',
  'admin',
  'Administrador',
  'admin@servicio.com'
);
```

## Prueba 7: Verificar que no hay Problema con el Email

A veces el problema es el formato del email. Prueba:

1. Crea un usuario con email diferente: `admin2@test.com`
2. Confirma que funciona
3. Si funciona, el problema es específico del email `admin@servicio.com`

## Prueba 8: Verificar Logs de Red

1. Abre el navegador → **F12** → **Network**
2. Intenta iniciar sesión
3. Busca la petición a `/auth/v1/token`
4. Haz clic en ella
5. Ve a la pestaña **Response**
6. Revisa el error exacto que devuelve Supabase
