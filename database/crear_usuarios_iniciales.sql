-- ============================================
-- SCRIPT PARA CREAR USUARIOS INICIALES
-- ============================================
-- IMPORTANTE: Primero debes crear los usuarios en Authentication de Supabase
-- Luego ejecuta este script reemplazando los UUIDs con los IDs reales de auth.users
-- ============================================

-- ============================================
-- PASO 1: Crear usuario Admin
-- ============================================
-- Reemplaza 'UUID_DEL_ADMIN_AQUI' con el UUID real del usuario creado en Authentication
-- Para obtener el UUID:
-- 1. Ve a Authentication > Users en Supabase Dashboard
-- 2. Crea un usuario con email y contraseña
-- 3. Copia el UUID del usuario creado
-- 4. Reemplaza 'UUID_DEL_ADMIN_AQUI' con ese UUID

-- Ejemplo:
-- INSERT INTO users (id, role, name, email) VALUES
--   ('123e4567-e89b-12d3-a456-426614174000', 'admin', 'Administrador', 'admin@playbox.cl')
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PASO 2: Crear usuario Sucursal
-- ============================================
-- Reemplaza 'UUID_DE_LA_SUCURSAL_AQUI' con el UUID real del usuario creado en Authentication
-- También necesitas el ID de la sucursal creada en la tabla branches

-- Ejemplo:
-- INSERT INTO users (id, role, name, email, sucursal_id) VALUES
--   ('123e4567-e89b-12d3-a456-426614174001', 'encargado', 'Sucursal Centro', 'sucursal@playbox.cl', 'UUID_DE_LA_SUCURSAL_EN_BRANCHES')
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSTRUCCIONES PASO A PASO:
-- ============================================
-- 1. Ve a Supabase Dashboard > Authentication > Users
-- 2. Haz clic en "Add user" > "Create new user"
-- 3. Ingresa:
--    - Email: admin@playbox.cl (o el que prefieras)
--    - Password: (una contraseña segura)
--    - Auto Confirm User: Sí
-- 4. Copia el UUID del usuario creado
-- 5. Ejecuta este script reemplazando los UUIDs
-- 6. Repite para crear el usuario de sucursal
-- ============================================

-- ============================================
-- SCRIPT DE EJEMPLO (descomenta y modifica):
-- ============================================

-- Primero, crear la sucursal si no existe
-- INSERT INTO branches (name, razon_social, address, phone, email, is_active) VALUES
--   ('Sucursal Centro', 'Playbox S.A.', 'Calle Principal 123', '+56 9 1234 5678', 'sucursal@playbox.cl', true)
-- ON CONFLICT (name) DO NOTHING;

-- Luego, obtener el ID de la sucursal creada
-- SELECT id FROM branches WHERE name = 'Sucursal Centro';

-- Finalmente, crear los usuarios (reemplaza los UUIDs con los reales)
-- INSERT INTO users (id, role, name, email, sucursal_id) VALUES
--   ('UUID_ADMIN_AQUI', 'admin', 'Administrador', 'admin@playbox.cl', NULL),
--   ('UUID_SUCURSAL_AQUI', 'encargado', 'Sucursal Centro', 'sucursal@playbox.cl', (SELECT id FROM branches WHERE name = 'Sucursal Centro'))
-- ON CONFLICT (id) DO UPDATE SET
--   role = EXCLUDED.role,
--   name = EXCLUDED.name,
--   email = EXCLUDED.email,
--   sucursal_id = EXCLUDED.sucursal_id;

-- ============================================
-- VERIFICAR USUARIOS CREADOS:
-- ============================================
-- SELECT u.id, u.role, u.name, u.email, b.name as sucursal
-- FROM users u
-- LEFT JOIN branches b ON u.sucursal_id = b.id;
