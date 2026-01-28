# 🔧 Solución: Credenciales Inválidas (Email Confirmado)

## 🔍 Problema

El email está confirmado, la contraseña es correcta, pero sigue diciendo "credenciales inválidas".

## ✅ Soluciones a Probar

### Solución 1: Resetear Contraseña desde Supabase Dashboard

**Esta es la solución más efectiva:**

1. Ve a **Supabase Dashboard** → **Authentication** → **Users**
2. Busca `admin@servicio.com`
3. Haz clic en los **tres puntos (...)** junto al usuario
4. Selecciona **"Reset password"** o **"Change password"**
5. Establece una nueva contraseña (puede ser la misma: `12345678`)
6. Guarda
7. Intenta iniciar sesión con la nueva contraseña

### Solución 2: Verificar que no hay espacios en la contraseña

A veces hay espacios invisibles. Prueba:

1. Escribe la contraseña en un editor de texto
2. Cópiala
3. Pégala en el campo de contraseña
4. O escribe la contraseña manualmente sin copiar/pegar

### Solución 3: Verificar el formato del email

Asegúrate de que el email sea exactamente:
- `admin@servicio.com` (sin espacios, sin mayúsculas al inicio)

### Solución 4: Verificar Logs de Autenticación

1. Ve a **Supabase Dashboard** → **Logs** → **Auth Logs**
2. Busca intentos de login recientes
3. Revisa el error específico que aparece
4. Esto te dirá exactamente qué está fallando

### Solución 5: Crear un Nuevo Usuario Admin

Si nada funciona, crea un nuevo usuario:

1. Ve a **Supabase Dashboard** → **Authentication** → **Users** → **Add user**
2. Crea usuario:
   - **Email**: `admin2@servicio.com` (o cualquier email)
   - **Password**: `12345678` (o la que prefieras)
   - **Auto Confirm User**: ✅ Activado (MUY IMPORTANTE)
3. Haz clic en **"Create user"**
4. Copia el **User UID** que se genera
5. Ejecuta este SQL:

```sql
INSERT INTO users (id, role, name, email) 
VALUES (
  'UUID-AQUI',  -- Pega el UUID que copiaste
  'admin',
  'Administrador',
  'admin2@servicio.com'
);
```

6. Inicia sesión con el nuevo email

### Solución 6: Verificar Configuración de Auth

1. Ve a **Supabase Dashboard** → **Authentication** → **Settings** → **Auth**
2. Verifica:
   - ✅ **"Enable Email Signup"** está activado
   - ✅ **"Enable Email Confirmations"** puede estar activado o desactivado
   - Si está activado, el email DEBE estar confirmado (ya lo está)

### Solución 7: Limpiar Caché y Cookies

1. Abre el navegador en **modo incógnito** (Ctrl+Shift+N)
2. Ve a `http://localhost:4321/login`
3. Intenta iniciar sesión

O limpia la caché:
1. Presiona **Ctrl+Shift+Delete**
2. Selecciona "Cookies" y "Cached images and files"
3. Limpia
4. Intenta de nuevo

### Solución 8: Verificar Variables de Entorno

Abre la consola del navegador (F12) y ejecuta:

```javascript
console.log('URL:', import.meta.env.PUBLIC_SUPABASE_URL);
console.log('Key:', import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

Deberías ver tus credenciales. Si ves `undefined`, el problema es el `.env.local`.

## 🔍 Diagnóstico Avanzado

### Verificar en la Consola del Navegador

1. Abre el navegador
2. Presiona **F12** → **Console**
3. Intenta iniciar sesión
4. Busca errores que digan:
   - `Invalid login credentials`
   - `Email not confirmed`
   - `User not found`
   - Cualquier otro error

### Verificar en Supabase Logs

1. Ve a **Supabase Dashboard** → **Logs** → **Auth Logs**
2. Busca intentos recientes de login
3. Revisa el error específico

## ⚠️ Problemas Comunes

### Problema: Contraseña con caracteres especiales

Si la contraseña tiene caracteres especiales, puede haber problemas de codificación. Usa una contraseña simple primero (solo números o letras).

### Problema: Email con mayúsculas

Supabase es case-sensitive en algunos casos. Usa exactamente: `admin@servicio.com` (todo minúsculas).

### Problema: Múltiples usuarios con el mismo email

Ejecuta este SQL para verificar:

```sql
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@servicio.com';
```

Si hay más de uno, elimina los duplicados.

## ✅ Checklist Final

- [ ] Email está confirmado en `auth.users`
- [ ] Usuario existe en tabla `users` con el mismo UUID
- [ ] Role es 'admin' en tabla `users`
- [ ] Contraseña fue reseteada desde Supabase Dashboard
- [ ] Variables de entorno están configuradas (`.env.local`)
- [ ] Servidor fue reiniciado después de cambios
- [ ] Se probó en modo incógnito
- [ ] Se revisaron los logs de Auth en Supabase

## 🎯 Solución Recomendada

**La solución más efectiva es resetear la contraseña desde Supabase Dashboard:**

1. Dashboard → Authentication → Users
2. Busca el usuario
3. Tres puntos → Reset password
4. Establece nueva contraseña
5. Guarda
6. Intenta iniciar sesión

Esto regenera el hash de la contraseña y suele resolver el problema.
