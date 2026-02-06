-- ============================================
-- Agregar campo cliente_sin_abono a work_orders
-- ============================================
-- Este script agrega la columna para indicar si el cliente no dejó abonado nada

-- Agregar columna si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' 
    AND column_name = 'cliente_sin_abono'
  ) THEN
    ALTER TABLE work_orders 
    ADD COLUMN cliente_sin_abono BOOLEAN DEFAULT FALSE;
    
    COMMENT ON COLUMN work_orders.cliente_sin_abono IS 'Indica si el cliente no dejó abonado nada del precio del servicio';
    
    RAISE NOTICE 'Columna cliente_sin_abono agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna cliente_sin_abono ya existe';
  END IF;
END $$;
