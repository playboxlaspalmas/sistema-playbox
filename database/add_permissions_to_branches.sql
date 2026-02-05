-- ============================================
-- Agregar columna permissions a la tabla branches
-- ============================================
-- Este script agrega la columna 'permissions' a la tabla 'branches'
-- para que las sucursales puedan tener sus propios permisos

-- Verificar y agregar columna permissions si no existe
DO $$ 
BEGIN
  -- Verificar si la columna ya existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'branches' 
      AND column_name = 'permissions'
  ) THEN
    -- Agregar la columna
    ALTER TABLE branches 
    ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE 'Columna permissions agregada exitosamente a la tabla branches';
  ELSE
    RAISE NOTICE 'La columna permissions ya existe en la tabla branches';
  END IF;
END $$;

-- Verificar que la columna se agregó correctamente
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'branches' 
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
--   "create_orders": boolean,
--   "close_day": boolean
-- }

-- Nota: Los permisos son opcionales y se pueden configurar por sucursal.
-- Si una sucursal no tiene un permiso específico, se usa el permiso por defecto según su rol.
