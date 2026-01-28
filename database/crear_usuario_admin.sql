-- ============================================
-- Script para crear usuario admin correctamente
-- ============================================
-- PASO 1: Crear usuario en Authentication de Supabase primero
--         (Dashboard → Authentication → Users → Add user)
-- PASO 2: Copiar el UUID del usuario creado
-- PASO 3: Ejecutar este script reemplazando 'UUID-DEL-USUARIO' con el UUID real
-- ============================================

-- Insertar usuario admin en la tabla users
-- ⚠️ REEMPLAZA 'UUID-DEL-USUARIO-AQUI' con el UUID que copiaste de Authentication
INSERT INTO users (id, role, name, email) 
VALUES (
  'UUID-DEL-USUARIO-AQUI',  -- ⚠️ REEMPLAZAR con el UUID real de auth.users
  'admin',
  'Administrador',
  'admin@servicio.com'
)
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'admin',
  name = 'Administrador',
  email = 'admin@servicio.com';

-- Verificar que se creó correctamente
SELECT id, name, email, role, created_at 
FROM users 
WHERE email = 'admin@servicio.com';
