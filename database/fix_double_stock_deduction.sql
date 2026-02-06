-- Script para corregir el problema de doble descuento de stock
-- El problema: Dos triggers estaban descontando stock:
-- 1. trigger_actualizar_stock_por_venta: Descuenta cuando se inserta venta_item
-- 2. trigger_registrar_movimiento_inventario: Descuenta cuando se inserta inventario_movimientos
-- 
-- Solución: Modificar registrar_movimiento_inventario para que NO descuente stock
-- si el movimiento ya tiene cantidad_anterior y cantidad_nueva establecidos

-- Función para registrar movimiento de inventario
-- IMPORTANTE: Si el movimiento ya tiene cantidad_anterior y cantidad_nueva establecidos,
-- NO descuenta stock porque ya fue actualizado por otra función (ej: actualizar_stock_por_venta)
CREATE OR REPLACE FUNCTION registrar_movimiento_inventario()
RETURNS TRIGGER AS $$
DECLARE
  stock_anterior INTEGER;
  stock_nuevo INTEGER;
BEGIN
  -- Si ya tiene cantidad_anterior y cantidad_nueva, el stock ya fue actualizado
  -- Solo establecer los valores en el registro sin modificar el stock
  IF NEW.cantidad_anterior IS NOT NULL AND NEW.cantidad_nueva IS NOT NULL THEN
    -- El stock ya fue actualizado por otra función, solo retornar
    RETURN NEW;
  END IF;
  
  -- Si no tiene cantidad_anterior y cantidad_nueva, calcular y actualizar stock
  SELECT stock_actual INTO stock_anterior
  FROM productos
  WHERE id = NEW.producto_id;
  
  IF NEW.tipo_movimiento = 'venta' THEN
    stock_nuevo := stock_anterior - ABS(NEW.cantidad);
  ELSE
    stock_nuevo := stock_anterior + ABS(NEW.cantidad);
  END IF;
  
  UPDATE productos
  SET stock_actual = stock_nuevo,
      updated_at = NOW()
  WHERE id = NEW.producto_id;
  
  NEW.cantidad_anterior := stock_anterior;
  NEW.cantidad_nueva := stock_nuevo;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar que la función se creó correctamente
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'registrar_movimiento_inventario';
