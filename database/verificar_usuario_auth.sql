-- ============================================
-- Script para verificar el estado del usuario
-- ============================================
-- Ejecuta esto en Supabase SQL Editor para diagnosticar el problema
-- ============================================

-- 1. Verificar que el usuario existe en auth.users
SELECT 
  id,
  email,
  email_confirmed_at,  -- ⚠️ Si es NULL, el email no está confirmado
  created_at,
  last_sign_in_at,
  confirmed_at
FROM auth.users 
WHERE email = 'admin@servicio.com';

-- 2. Verificar que existe en la tabla users
SELECT 
  id,
  email,
  role,
  name,
  created_at
FROM users 
WHERE email = 'admin@servicio.com';

-- 3. Verificar que los UUID coinciden
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  au.email_confirmed_at,
  u.id as user_id,
  u.email as user_email,
  u.role,
  CASE 
    WHEN au.id = u.id THEN '✅ UUIDs coinciden'
    ELSE '❌ UUIDs NO coinciden'
  END as estado
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'admin@servicio.com';

-- 4. Si email_confirmed_at es NULL, necesitas confirmar el email
-- Opción A: Confirmar manualmente desde el Dashboard
-- Opción B: Ejecutar esto (solo si tienes permisos de service_role):
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW(), confirmed_at = NOW()
-- WHERE email = 'admin@servicio.com';
