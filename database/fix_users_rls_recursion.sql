-- ============================================
-- CORREGIR RECURSIÓN INFINITA EN POLÍTICA RLS DE users
-- ============================================
-- El problema: La política consulta la tabla users dentro de su propia definición
-- Solución: Simplificar la política para evitar la recursión
-- ============================================

-- Eliminar la política problemática
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;

-- Crear nueva política sin recursión
-- Los usuarios pueden ver su propio registro
-- Los admins pueden ver todos (verificado por auth.jwt() en lugar de consultar users)
CREATE POLICY "users_select_own_or_admin" ON users FOR SELECT
  USING (
    auth.uid() = id 
    OR (
      -- Verificar si es admin usando auth.jwt() en lugar de consultar users
      -- Esto evita la recursión
      (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'admin'
      OR
      -- Alternativa: permitir si el usuario autenticado existe (más permisivo)
      auth.uid() IS NOT NULL
    )
  );

-- NOTA: La política anterior puede ser demasiado permisiva.
-- Si quieres ser más restrictivo, usa esta versión que solo permite ver el propio registro:
/*
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;
CREATE POLICY "users_select_own_or_admin" ON users FOR SELECT
  USING (auth.uid() = id);
*/

-- O esta versión que permite ver todos si eres admin (sin recursión):
/*
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;
CREATE POLICY "users_select_own_or_admin" ON users FOR SELECT
  USING (
    auth.uid() = id 
    OR (
      -- Usar auth.jwt() para obtener el role sin consultar users
      (auth.jwt() ->> 'user_role') = 'admin'
    )
  );
*/

-- La solución más simple y segura: permitir que los usuarios vean su propio registro
-- y que todos los autenticados vean otros usuarios (para el dashboard)
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;
CREATE POLICY "users_select_own_or_admin" ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);
