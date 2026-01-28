-- ============================================
-- CREAR FUNCIÓN Y TRIGGER PARA GENERAR order_number
-- ============================================
-- Este script crea la función y trigger para generar automáticamente
-- el order_number cuando se crea una orden de trabajo

-- Función para generar número de orden
CREATE OR REPLACE FUNCTION generar_numero_orden()
RETURNS TRIGGER AS $$
DECLARE
  año_actual TEXT;
  ultimo_numero INTEGER;
  nuevo_numero TEXT;
BEGIN
  -- Solo generar si order_number es NULL o está vacío
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    año_actual := TO_CHAR(NOW(), 'YYYY');
    
    -- Buscar el último número de orden del año actual
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(order_number FROM 'ORD-' || año_actual || '-(.+)') AS INTEGER)),
      0
    ) INTO ultimo_numero
    FROM work_orders
    WHERE order_number LIKE 'ORD-' || año_actual || '-%';
    
    ultimo_numero := ultimo_numero + 1;
    nuevo_numero := 'ORD-' || año_actual || '-' || LPAD(ultimo_numero::TEXT, 4, '0');
    
    NEW.order_number := nuevo_numero;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar order_number automáticamente
DROP TRIGGER IF EXISTS trigger_generar_order_number ON work_orders;
CREATE TRIGGER trigger_generar_order_number
  BEFORE INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION generar_numero_orden();

-- Verificar que funciona
-- INSERT INTO work_orders (customer_id, device_type, device_model, problem_description, status)
-- VALUES (
--   (SELECT id FROM customers LIMIT 1),
--   'iphone',
--   'iPhone 12',
--   'Test',
--   'en_proceso'
-- );
-- El order_number debería generarse automáticamente
