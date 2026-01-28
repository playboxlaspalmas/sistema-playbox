-- ============================================
-- DIAGNÓSTICO COMPLETO DE AUTENTICACIÓN
-- ============================================
-- Ejecuta esto en Supabase SQL Editor para diagnosticar el problema
-- ============================================

-- 1. VERIFICAR USUARIO EN auth.users
SELECT 
  '=== USUARIO EN auth.users ===' as seccion,
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ EMAIL NO CONFIRMADO - ESTE ES EL PROBLEMA'
    ELSE '✅ Email confirmado'
  END as estado_email
FROM auth.users 
WHERE email = 'admin@servicio.com';

-- 2. VERIFICAR USUARIO EN TABLA users
SELECT 
  '=== USUARIO EN TABLA users ===' as seccion,
  id,
  email,
  role,
  name,
  created_at,
  CASE 
    WHEN role != 'admin' THEN '⚠️ Role no es admin: ' || role
    ELSE '✅ Role correcto (admin)'
  END as estado_role
FROM users 
WHERE email = 'admin@servicio.com';

-- 3. VERIFICAR COINCIDENCIA DE UUIDs
SELECT 
  '=== VERIFICACIÓN DE UUIDs ===' as seccion,
  au.id as auth_id,
  u.id as user_id,
  CASE 
    WHEN au.id = u.id THEN '✅ UUIDs coinciden'
    WHEN u.id IS NULL THEN '❌ Usuario NO existe en tabla users'
    ELSE '❌ UUIDs NO coinciden'
  END as estado_uuid
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'admin@servicio.com';

-- 4. DIAGNÓSTICO FINAL
SELECT 
  '=== DIAGNÓSTICO FINAL ===' as seccion,
  au.email,
  CASE 
    WHEN au.id IS NULL THEN '❌ Usuario NO existe en auth.users'
    WHEN au.email_confirmed_at IS NULL THEN '❌ Email NO confirmado - CONFIRMA EL EMAIL'
    WHEN u.id IS NULL THEN '❌ Usuario NO existe en tabla users - INSERTA EN users'
    WHEN au.id != u.id THEN '❌ UUIDs NO coinciden - CORRIGE EL UUID'
    WHEN u.role != 'admin' THEN '⚠️ Role no es admin - ACTUALIZA A admin'
    ELSE '✅ TODO CORRECTO - El problema puede ser la contraseña'
  END as diagnostico,
  CASE 
    WHEN au.email_confirmed_at IS NULL THEN 'SOLUCIÓN: Ve a Authentication → Users → Confirma el email'
    WHEN u.id IS NULL THEN 'SOLUCIÓN: Ejecuta INSERT INTO users con el UUID de auth.users'
    WHEN au.id != u.id THEN 'SOLUCIÓN: Corrige el UUID en la tabla users'
    WHEN u.role != 'admin' THEN 'SOLUCIÓN: UPDATE users SET role = ''admin'' WHERE email = ''admin@servicio.com'''
    ELSE 'VERIFICA: La contraseña puede estar incorrecta'
  END as solucion
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'admin@servicio.com';

-- 5. SOLUCIÓN RÁPIDA: Confirmar email (si no está confirmado)
-- Descomenta y ejecuta SOLO si email_confirmed_at es NULL:
/*
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email = 'admin@servicio.com'
  AND email_confirmed_at IS NULL;
*/

-- 6. VERIFICAR CONFIGURACIÓN DE AUTH EN SUPABASE
-- Ve a: Authentication → Settings → Auth
-- Verifica que:
-- - "Enable Email Signup" esté activado
-- - "Enable Email Confirmations" puede estar activado o desactivado
-- - Si está activado, el email DEBE estar confirmado
