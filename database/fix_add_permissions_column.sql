-- ============================================
-- Agregar columna permissions a la tabla users
-- ============================================
-- Este script agrega la columna 'permissions' a la tabla 'users'
-- si no existe. La columna almacena permisos personalizados por usuario
-- en formato JSONB.

-- Verificar y agregar columna permissions si no existe
DO $$ 
BEGIN
  -- Verificar si la columna ya existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'permissions'
  ) THEN
    -- Agregar la columna
    ALTER TABLE users 
    ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE 'Columna permissions agregada exitosamente a la tabla users';
  ELSE
    RAISE NOTICE 'La columna permissions ya existe en la tabla users';
  END IF;
END $$;

-- Verificar que la columna se agregó correctamente
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'permissions';

-- Estructura esperada de permissions (JSONB):
-- {
--   "use_admin_panel": boolean,
--   "use_statistics_panel": boolean,
--   "modify_orders": boolean,
--   "edit_product_stock": boolean,
--   "delete_orders": boolean,
--   "use_branch_panel": boolean,
--   "view_all_business_orders": boolean,
--   "edit_view_cost_price": boolean,
--   "close_day": boolean
-- }

-- Nota: Los permisos son opcionales y se pueden sobrescribir por usuario.
-- Si un usuario no tiene un permiso específico, se usa el permiso por defecto
-- según su rol (admin tiene todos los permisos).
