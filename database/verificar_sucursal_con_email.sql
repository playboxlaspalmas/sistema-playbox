-- ============================================
-- VERIFICAR SI HAY UNA SUCURSAL CON ESE EMAIL
-- ============================================
-- Si hay una sucursal con login_email = 'admin@servicio.com',
-- el sistema intentará autenticarla como sucursal primero
-- y eso puede estar causando el problema

SELECT 
  '=== SUCURSALES CON ESTE EMAIL ===' as info,
  id,
  name,
  login_email,
  email,
  is_active
FROM branches 
WHERE login_email = 'admin@servicio.com' 
   OR email = 'admin@servicio.com';

-- Si hay una sucursal con ese email, tienes dos opciones:
-- 1. Cambiar el login_email de la sucursal a otro email
-- 2. O usar un email diferente para el usuario admin

-- Para cambiar el login_email de la sucursal:
/*
UPDATE branches 
SET login_email = 'sucursal@servicio.com'  -- Cambiar a otro email
WHERE login_email = 'admin@servicio.com';
*/
