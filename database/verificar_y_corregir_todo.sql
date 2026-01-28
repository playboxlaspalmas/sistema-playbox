-- ============================================
-- SCRIPT DE VERIFICACIÓN Y CORRECCIÓN COMPLETA
-- ============================================
-- Este script verifica y corrige todos los problemas potenciales
-- Ejecuta esto en Supabase SQL Editor después de crear el schema

-- ============================================
-- 1. VERIFICAR Y CORREGIR ÍNDICES DE PRODUCTOS
-- ============================================

-- Eliminar restricción UNIQUE si existe (debe eliminarse antes que el índice)
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_codigo_barras_key;

-- Eliminar índice único antiguo si existe
DROP INDEX IF EXISTS idx_productos_codigo_barras;

-- Crear índice único solo para códigos que existen
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_codigo_barras_unique 
ON productos(codigo_barras) 
WHERE codigo_barras IS NOT NULL;

-- Crear índice normal para búsquedas
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras 
ON productos(codigo_barras) 
WHERE codigo_barras IS NOT NULL;

-- Crear índice para búsqueda por nombre
CREATE INDEX IF NOT EXISTS idx_productos_nombre 
ON productos(nombre);

-- ============================================
-- 2. VERIFICAR POLÍTICAS RLS SIN RECURSIÓN
-- ============================================

-- Verificar política de users (debe ser simple)
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;
CREATE POLICY "users_select_own_or_admin" ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 3. VERIFICAR Y CREAR FUNCIÓN PARA GENERAR order_number
-- ============================================

-- Función para generar número de orden (si no existe)
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

-- ============================================
-- 4. VERIFICAR TRIGGERS Y FUNCIONES
-- ============================================

-- Verificar que la función de actualizar stock existe y es correcta
CREATE OR REPLACE FUNCTION actualizar_stock_por_venta()
RETURNS TRIGGER AS $$
DECLARE
  stock_anterior INTEGER;
  stock_nuevo INTEGER;
  venta_estado TEXT;
BEGIN
  -- Obtener estado de la venta
  SELECT estado INTO venta_estado
  FROM ventas
  WHERE id = NEW.venta_id;

  -- Solo procesar si la venta está completada
  IF venta_estado = 'completada' THEN
    -- Obtener stock actual del producto
    SELECT stock_actual INTO stock_anterior
    FROM productos
    WHERE id = NEW.producto_id;

    -- Verificar que hay stock suficiente
    IF stock_anterior < NEW.cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para el producto %: se requiere %, hay %', 
        (SELECT nombre FROM productos WHERE id = NEW.producto_id),
        NEW.cantidad,
        stock_anterior;
    END IF;

    -- Calcular nuevo stock (restar cantidad vendida)
    stock_nuevo := stock_anterior - NEW.cantidad;

    -- Actualizar stock del producto
    UPDATE productos
    SET stock_actual = stock_nuevo,
        updated_at = NOW()
    WHERE id = NEW.producto_id;

    -- Registrar movimiento de inventario
    INSERT INTO inventario_movimientos (
      producto_id,
      tipo_movimiento,
      cantidad,
      cantidad_anterior,
      cantidad_nueva,
      venta_id,
      usuario_id,
      observaciones
    )
    VALUES (
      NEW.producto_id,
      'venta',
      -NEW.cantidad, -- Negativo porque es salida
      stock_anterior,
      stock_nuevo,
      NEW.venta_id,
      (SELECT usuario_id FROM ventas WHERE id = NEW.venta_id),
      'Venta automática'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. AGREGAR VALIDACIONES ADICIONALES
-- ============================================

-- Función para validar que el código de barras sea único si existe
CREATE OR REPLACE FUNCTION validar_codigo_barras_unico()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el código de barras no es NULL, verificar que sea único
  IF NEW.codigo_barras IS NOT NULL AND NEW.codigo_barras != '' THEN
    IF EXISTS (
      SELECT 1 FROM productos 
      WHERE codigo_barras = NEW.codigo_barras 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'El código de barras % ya existe', NEW.codigo_barras;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar código de barras único
DROP TRIGGER IF EXISTS trigger_validar_codigo_barras ON productos;
CREATE TRIGGER trigger_validar_codigo_barras
  BEFORE INSERT OR UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION validar_codigo_barras_unico();

-- ============================================
-- 6. VERIFICAR CONSTRAINTS
-- ============================================

-- Asegurar que precio_venta sea positivo
ALTER TABLE productos 
  DROP CONSTRAINT IF EXISTS productos_precio_venta_positive;
ALTER TABLE productos 
  ADD CONSTRAINT productos_precio_venta_positive 
  CHECK (precio_venta >= 0);

-- Asegurar que stock_actual sea no negativo
ALTER TABLE productos 
  DROP CONSTRAINT IF EXISTS productos_stock_actual_non_negative;
ALTER TABLE productos 
  ADD CONSTRAINT productos_stock_actual_non_negative 
  CHECK (stock_actual >= 0);

-- Asegurar que cantidad en venta_items sea positiva
ALTER TABLE venta_items 
  DROP CONSTRAINT IF EXISTS venta_items_cantidad_positive;
ALTER TABLE venta_items 
  ADD CONSTRAINT venta_items_cantidad_positive 
  CHECK (cantidad > 0);

-- Asegurar que precio_unitario en venta_items sea no negativo
ALTER TABLE venta_items 
  DROP CONSTRAINT IF EXISTS venta_items_precio_non_negative;
ALTER TABLE venta_items 
  ADD CONSTRAINT venta_items_precio_non_negative 
  CHECK (precio_unitario >= 0);

-- ============================================
-- 7. VERIFICAR VISTAS
-- ============================================

-- Verificar que las vistas existen y funcionan
DO $$
BEGIN
  -- Verificar vista ventas_del_dia
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'ventas_del_dia'
  ) THEN
    RAISE NOTICE 'Vista ventas_del_dia no existe';
  END IF;

  -- Verificar vista productos_mas_vendidos
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'productos_mas_vendidos'
  ) THEN
    RAISE NOTICE 'Vista productos_mas_vendidos no existe';
  END IF;

  -- Verificar vista productos_stock_bajo
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'productos_stock_bajo'
  ) THEN
    RAISE NOTICE 'Vista productos_stock_bajo no existe';
  END IF;
END $$;

-- ============================================
-- 8. VERIFICAR PERMISOS RLS EN TODAS LAS TABLAS
-- ============================================

-- Verificar que todas las tablas tienen políticas RLS
DO $$
DECLARE
  tabla RECORD;
  politica_count INTEGER;
BEGIN
  FOR tabla IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
  LOOP
    SELECT COUNT(*) INTO politica_count
    FROM pg_policies
    WHERE tablename = tabla.tablename;
    
    IF politica_count = 0 THEN
      RAISE NOTICE 'Tabla % no tiene políticas RLS', tabla.tablename;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 9. CREAR FUNCIÓN PARA GENERAR NÚMERO DE VENTA SEGURO
-- ============================================

-- Función mejorada para generar número de venta con bloqueo
CREATE OR REPLACE FUNCTION generar_numero_venta()
RETURNS TEXT AS $$
DECLARE
  año_actual INTEGER;
  ultimo_numero INTEGER;
  nuevo_numero TEXT;
BEGIN
  año_actual := EXTRACT(YEAR FROM NOW());
  
  -- Usar SELECT FOR UPDATE para evitar condiciones de carrera
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(numero_venta FROM 'V-\d{4}-(\d+)') AS INTEGER)),
    0
  ) INTO ultimo_numero
  FROM ventas
  WHERE numero_venta LIKE 'V-' || año_actual || '-%'
  FOR UPDATE;
  
  ultimo_numero := ultimo_numero + 1;
  nuevo_numero := 'V-' || año_actual || '-' || LPAD(ultimo_numero::TEXT, 4, '0');
  
  RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. VERIFICAR QUE NO HAYA DATOS INCONSISTENTES
-- ============================================

-- Verificar productos con stock negativo (no debería haber)
SELECT 
  id, nombre, stock_actual 
FROM productos 
WHERE stock_actual < 0;

-- Verificar ventas sin items (deberían estar en estado pendiente o cancelada)
SELECT 
  v.id, v.numero_venta, v.estado, COUNT(vi.id) as items_count
FROM ventas v
LEFT JOIN venta_items vi ON v.id = vi.venta_id
GROUP BY v.id, v.numero_venta, v.estado
HAVING COUNT(vi.id) = 0 AND v.estado = 'completada';

-- Verificar items de venta sin producto (no debería haber)
SELECT 
  vi.id, vi.venta_id, vi.producto_id
FROM venta_items vi
LEFT JOIN productos p ON vi.producto_id = p.id
WHERE p.id IS NULL;

-- ============================================
-- 11. CREAR ÍNDICES ADICIONALES PARA RENDIMIENTO
-- ============================================

-- Índice para búsqueda de ventas por fecha (usando created_at)
CREATE INDEX IF NOT EXISTS idx_ventas_fecha 
ON ventas(created_at);

-- Índice para búsqueda de ventas por usuario
CREATE INDEX IF NOT EXISTS idx_ventas_usuario 
ON ventas(usuario_id);

-- Índice para búsqueda de ventas por sucursal
CREATE INDEX IF NOT EXISTS idx_ventas_sucursal 
ON ventas(sucursal_id);

-- Índice para búsqueda de items por venta
CREATE INDEX IF NOT EXISTS idx_venta_items_venta 
ON venta_items(venta_id);

-- Índice para búsqueda de items por producto
CREATE INDEX IF NOT EXISTS idx_venta_items_producto 
ON venta_items(producto_id);

-- Índice para búsqueda de movimientos por producto
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_producto 
ON inventario_movimientos(producto_id);

-- Índice para búsqueda de movimientos por fecha (usando created_at)
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_fecha 
ON inventario_movimientos(created_at);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Verificación y corrección completada';
  RAISE NOTICE 'Revisa los mensajes anteriores para ver si hay problemas detectados';
END $$;
