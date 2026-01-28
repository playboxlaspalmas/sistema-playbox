-- ============================================
-- VERIFICAR SI EL USUARIO EXISTE EN TABLA users
-- ============================================
-- Este es probablemente el problema: el usuario existe en auth.users
-- pero NO en la tabla users, por eso el Dashboard lo redirige al login

-- Verificar usuario en auth.users
SELECT 
  '=== USUARIO EN auth.users ===' as seccion,
  id,
  email,
  email_confirmed_at
FROM auth.users 
WHERE email = 'admin@servicio.com';

-- Verificar usuario en tabla users
SELECT 
  '=== USUARIO EN TABLA users ===' as seccion,
  id,
  email,
  role,
  name
FROM users 
WHERE email = 'admin@servicio.com';

-- Verificar coincidencia de UUIDs
SELECT 
  '=== VERIFICACIÓN DE COINCIDENCIA ===' as seccion,
  au.id as auth_id,
  au.email as auth_email,
  u.id as user_id,
  u.email as user_email,
  u.role,
  CASE 
    WHEN u.id IS NULL THEN '❌ PROBLEMA: Usuario NO existe en tabla users'
    WHEN au.id = u.id THEN '✅ UUIDs coinciden'
    ELSE '❌ UUIDs NO coinciden'
  END as diagnostico
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'admin@servicio.com';

-- SOLUCIÓN: Si el usuario NO existe en users, ejecuta esto:
-- (Reemplaza el UUID con el que obtuviste de auth.users)
/*
INSERT INTO users (id, role, name, email) 
VALUES (
  '5100c038-4d3a-4266-ad41-4df463c79732',  -- UUID de auth.users
  'admin',
  'Administrador',
  'admin@servicio.com'
);
*/
