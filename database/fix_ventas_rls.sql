-- Script para corregir políticas RLS de ventas
-- Este script corrige el error "new row violates row-level security policy for table ventas"

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "ventas_insert_authenticated" ON ventas;
DROP POLICY IF EXISTS "ventas_update_authenticated" ON ventas;

-- Crear nueva política de inserción que permita insertar si:
-- 1. El usuario está autenticado (auth.uid() IS NOT NULL)
-- 2. Y el usuario_id en la fila coincide con auth.uid() (o es admin)
CREATE POLICY "ventas_insert_authenticated" ON ventas FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
      usuario_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Política de actualización
CREATE POLICY "ventas_update_authenticated" ON ventas FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL 
    AND (
      usuario_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Verificar que las políticas estén activas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'ventas'
ORDER BY policyname;
