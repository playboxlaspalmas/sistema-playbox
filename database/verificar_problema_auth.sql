-- ============================================
-- VERIFICACIÓN COMPLETA DEL PROBLEMA DE AUTH
-- ============================================

-- 1. Verificar TODOS los usuarios con ese email (puede haber duplicados)
SELECT 
  '=== TODOS LOS USUARIOS CON ESTE EMAIL ===' as info,
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'admin@servicio.com'
ORDER BY created_at;

-- 2. Si hay múltiples, elimina los duplicados (mantén solo el más reciente)
-- ⚠️ CUIDADO: Esto elimina usuarios. Haz backup primero.
/*
DELETE FROM auth.users 
WHERE email = 'admin@servicio.com' 
  AND id NOT IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'admin@servicio.com' 
    ORDER BY created_at DESC 
    LIMIT 1
  );
*/

-- 3. Verificar que el usuario en users coincide
SELECT 
  '=== VERIFICACIÓN DE COINCIDENCIA ===' as info,
  au.id as auth_id,
  au.email as auth_email,
  u.id as user_id,
  u.email as user_email,
  u.role,
  CASE 
    WHEN au.id = u.id THEN '✅ Coinciden'
    WHEN u.id IS NULL THEN '❌ No existe en users'
    ELSE '❌ NO coinciden'
  END as estado
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'admin@servicio.com';

-- 4. Verificar configuración de autenticación
-- Ve a: Authentication → Settings → Auth
-- Verifica:
-- - Site URL está configurado
-- - Redirect URLs incluye localhost
-- - Enable Email Signup está activado

-- 5. SOLUCIÓN ALTERNATIVA: Eliminar y recrear el usuario
-- ⚠️ ESTO ELIMINARÁ EL USUARIO ACTUAL
/*
-- Paso 1: Eliminar de users
DELETE FROM users WHERE email = 'admin@servicio.com';

-- Paso 2: Eliminar de auth.users (desde Dashboard → Authentication → Users)
-- O ejecuta esto si tienes permisos:
-- DELETE FROM auth.users WHERE email = 'admin@servicio.com';

-- Paso 3: Crear nuevo usuario desde Dashboard
-- Authentication → Users → Add user
-- Email: admin@servicio.com
-- Password: 12345678
-- Auto Confirm: ✅

-- Paso 4: Insertar en users con el nuevo UUID
INSERT INTO users (id, role, name, email) 
VALUES (
  'NUEVO-UUID-AQUI',
  'admin',
  'Administrador',
  'admin@servicio.com'
);
*/
