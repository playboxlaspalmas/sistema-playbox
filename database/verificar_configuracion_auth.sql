-- ============================================
-- VERIFICACIÓN PROFUNDA DE CONFIGURACIÓN AUTH
-- ============================================

-- 1. Verificar usuario completo
SELECT 
  '=== INFORMACIÓN COMPLETA DEL USUARIO ===' as info,
  au.id,
  au.email,
  au.email_confirmed_at,
  au.confirmed_at,
  au.created_at,
  au.last_sign_in_at,
  au.encrypted_password IS NOT NULL as tiene_password,
  u.role,
  u.name
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'admin@servicio.com';

-- 2. Verificar si hay múltiples usuarios con el mismo email
SELECT 
  '=== VERIFICAR DUPLICADOS ===' as info,
  COUNT(*) as cantidad_usuarios,
  STRING_AGG(id::text, ', ') as ids
FROM auth.users 
WHERE email = 'admin@servicio.com';

-- 3. Verificar configuración de RLS en auth.users (no debería tener RLS)
-- Esto no se puede verificar directamente, pero podemos intentar

-- 4. Verificar si el usuario está activo
SELECT 
  '=== ESTADO DEL USUARIO ===' as info,
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmado,
  confirmed_at IS NOT NULL as usuario_confirmado,
  banned_until IS NULL as no_esta_baneado,
  deleted_at IS NULL as no_esta_eliminado
FROM auth.users 
WHERE email = 'admin@servicio.com';

-- 5. INTENTAR RESETEAR CONTRASEÑA (si es necesario)
-- Ve a Supabase Dashboard → Authentication → Users
-- Busca admin@servicio.com
-- Haz clic en "..." → "Reset password"
-- O cambia la contraseña directamente

-- 6. VERIFICAR LOGS DE AUTH
-- Ve a Supabase Dashboard → Logs → Auth Logs
-- Busca intentos de login recientes para ver el error específico
