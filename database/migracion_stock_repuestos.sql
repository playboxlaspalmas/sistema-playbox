-- ============================================
-- MIGRACIÓN: Separación de Stock de Accesorios y Repuestos
-- ============================================
-- Este script modifica el sistema para separar:
-- 1. Accesorios: productos vendidos desde POS (con categorías)
-- 2. Repuestos: productos vendidos en órdenes de servicio (asociados a dispositivos)
-- ============================================

-- ============================================
-- 1. Modificar tabla productos para distinguir tipo
-- ============================================
-- Agregar campo tipo y campos adicionales para accesorios
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'accesorio' CHECK (tipo IN ('accesorio', 'repuesto')),
ADD COLUMN IF NOT EXISTS marca TEXT,
ADD COLUMN IF NOT EXISTS modelo TEXT;

-- Crear índice para tipo
CREATE INDEX IF NOT EXISTS idx_productos_tipo ON productos(tipo);

-- ============================================
-- 2. Crear tabla de Categorías de Accesorios
-- ============================================
CREATE TABLE IF NOT EXISTS categorias_accesorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar categorías predefinidas
INSERT INTO categorias_accesorios (nombre, descripcion) VALUES
  ('Fundas', 'Fundas y protectores para dispositivos'),
  ('Cargadores Tradicionales', 'Cargadores de pared tradicionales'),
  ('Cargadores Portátiles', 'Power banks y cargadores portátiles'),
  ('Cargadores de Auto', 'Cargadores para vehículos'),
  ('Cargadores de Notebook', 'Cargadores para laptops'),
  ('Micas', 'Protectores de pantalla y cámara'),
  ('Cables de Corriente', 'Cables de alimentación'),
  ('Cables Tipo C', 'Cables USB-C'),
  ('Cables Micro USB', 'Cables Micro USB'),
  ('Adaptadores', 'Adaptadores de todo tipo'),
  ('Chips de Celulares', 'Chips SIM de operadoras'),
  ('Otros', 'Otras categorías de accesorios')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- 3. Crear tabla de Dispositivos (para repuestos)
-- ============================================
CREATE TABLE IF NOT EXISTS dispositivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tipo_dispositivo TEXT CHECK (tipo_dispositivo IN ('iphone', 'ipad', 'macbook', 'apple_watch', 'android', 'laptop', 'tablet', 'consola', 'otro')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(marca, modelo)
);

-- Crear índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_dispositivos_marca_modelo ON dispositivos(marca, modelo);
CREATE INDEX IF NOT EXISTS idx_dispositivos_tipo ON dispositivos(tipo_dispositivo);

-- Insertar algunos dispositivos comunes
INSERT INTO dispositivos (marca, modelo, tipo_dispositivo) VALUES
  ('Apple', 'iPhone 13 Pro Max', 'iphone'),
  ('Apple', 'iPhone 14 Pro Max', 'iphone'),
  ('Apple', 'iPhone 15 Pro Max', 'iphone'),
  ('Samsung', 'Galaxy S24', 'android'),
  ('Samsung', 'Galaxy S23', 'android'),
  ('Apple', 'MacBook Pro M2', 'macbook'),
  ('Apple', 'MacBook Pro M3', 'macbook'),
  ('Nintendo', 'Switch 2', 'consola'),
  ('Nintendo', 'Switch', 'consola')
ON CONFLICT (marca, modelo) DO NOTHING;

-- ============================================
-- 4. Crear tabla de Repuestos
-- ============================================
CREATE TABLE IF NOT EXISTS repuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  precio_costo NUMERIC NOT NULL DEFAULT 0,
  precio_venta NUMERIC NOT NULL DEFAULT 0,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dispositivo_id, nombre)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_repuestos_dispositivo ON repuestos(dispositivo_id);
CREATE INDEX IF NOT EXISTS idx_repuestos_activo ON repuestos(activo);
CREATE INDEX IF NOT EXISTS idx_repuestos_stock ON repuestos(stock_actual);

-- ============================================
-- 5. Crear tabla de relación Orden-Repuestos
-- ============================================
CREATE TABLE IF NOT EXISTS order_repuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  repuesto_id UUID REFERENCES repuestos(id) ON DELETE SET NULL,
  repuesto_nombre TEXT NOT NULL, -- Guardar nombre por si se elimina el repuesto
  dispositivo_marca TEXT NOT NULL,
  dispositivo_modelo TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_costo NUMERIC NOT NULL DEFAULT 0,
  precio_venta NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_order_repuestos_order ON order_repuestos(order_id);
CREATE INDEX IF NOT EXISTS idx_order_repuestos_repuesto ON order_repuestos(repuesto_id);

-- ============================================
-- 6. Crear tabla de movimientos de stock de repuestos
-- ============================================
CREATE TABLE IF NOT EXISTS repuestos_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repuesto_id UUID NOT NULL REFERENCES repuestos(id) ON DELETE CASCADE,
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('venta', 'compra', 'ajuste', 'inicial')),
  cantidad INTEGER NOT NULL,
  cantidad_anterior INTEGER NOT NULL,
  cantidad_nueva INTEGER NOT NULL,
  usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_repuestos_movimientos_repuesto ON repuestos_movimientos(repuesto_id);
CREATE INDEX IF NOT EXISTS idx_repuestos_movimientos_order ON repuestos_movimientos(order_id);
CREATE INDEX IF NOT EXISTS idx_repuestos_movimientos_fecha ON repuestos_movimientos(created_at);

-- ============================================
-- 7. Actualizar tabla productos para relacionar con categorías
-- ============================================
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias_accesorios(id) ON DELETE SET NULL;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);

-- ============================================
-- 8. Crear funciones y triggers
-- ============================================

-- Función para actualizar updated_at de categorías
CREATE OR REPLACE FUNCTION update_categorias_accesorios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at de dispositivos
CREATE OR REPLACE FUNCTION update_dispositivos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at de repuestos
CREATE OR REPLACE FUNCTION update_repuestos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar movimiento de repuestos
CREATE OR REPLACE FUNCTION registrar_movimiento_repuesto()
RETURNS TRIGGER AS $$
DECLARE
  stock_anterior INTEGER;
  stock_nuevo INTEGER;
BEGIN
  SELECT stock_actual INTO stock_anterior
  FROM repuestos
  WHERE id = NEW.repuesto_id;
  
  IF NEW.tipo_movimiento = 'venta' THEN
    stock_nuevo := stock_anterior - ABS(NEW.cantidad);
  ELSE
    stock_nuevo := stock_anterior + ABS(NEW.cantidad);
  END IF;
  
  UPDATE repuestos
  SET stock_actual = stock_nuevo,
      updated_at = NOW()
  WHERE id = NEW.repuesto_id;
  
  NEW.cantidad_anterior := stock_anterior;
  NEW.cantidad_nueva := stock_nuevo;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar stock de repuestos cuando se crea order_repuestos
CREATE OR REPLACE FUNCTION actualizar_stock_repuesto_por_orden()
RETURNS TRIGGER AS $$
DECLARE
  stock_anterior INTEGER;
  stock_nuevo INTEGER;
  order_status TEXT;
BEGIN
  -- Obtener estado de la orden
  SELECT status INTO order_status
  FROM work_orders
  WHERE id = NEW.order_id;
  
  -- Solo procesar si la orden está entregada o por entregar
  IF order_status IN ('entregada', 'por_entregar') AND NEW.repuesto_id IS NOT NULL THEN
    SELECT stock_actual INTO stock_anterior
    FROM repuestos
    WHERE id = NEW.repuesto_id;
    
    -- Verificar que hay stock suficiente
    IF stock_anterior < NEW.cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para el repuesto %: se requiere %, hay %', 
        (SELECT nombre FROM repuestos WHERE id = NEW.repuesto_id),
        NEW.cantidad,
        stock_anterior;
    END IF;
    
    stock_nuevo := stock_anterior - NEW.cantidad;
    
    -- Actualizar stock del repuesto
    UPDATE repuestos
    SET stock_actual = stock_nuevo,
        updated_at = NOW()
    WHERE id = NEW.repuesto_id;
    
    -- Registrar movimiento de inventario
    INSERT INTO repuestos_movimientos (
      repuesto_id,
      tipo_movimiento,
      cantidad,
      cantidad_anterior,
      cantidad_nueva,
      order_id,
      usuario_id,
      observaciones
    )
    VALUES (
      NEW.repuesto_id,
      'venta',
      -NEW.cantidad,
      stock_anterior,
      stock_nuevo,
      NEW.order_id,
      (SELECT technician_id FROM work_orders WHERE id = NEW.order_id),
      'Venta en orden de servicio'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS update_categorias_accesorios_updated_at ON categorias_accesorios;
CREATE TRIGGER update_categorias_accesorios_updated_at
  BEFORE UPDATE ON categorias_accesorios
  FOR EACH ROW
  EXECUTE FUNCTION update_categorias_accesorios_updated_at();

DROP TRIGGER IF EXISTS update_dispositivos_updated_at ON dispositivos;
CREATE TRIGGER update_dispositivos_updated_at
  BEFORE UPDATE ON dispositivos
  FOR EACH ROW
  EXECUTE FUNCTION update_dispositivos_updated_at();

DROP TRIGGER IF EXISTS update_repuestos_updated_at ON repuestos;
CREATE TRIGGER update_repuestos_updated_at
  BEFORE UPDATE ON repuestos
  FOR EACH ROW
  EXECUTE FUNCTION update_repuestos_updated_at();

DROP TRIGGER IF EXISTS trigger_registrar_movimiento_repuesto ON repuestos_movimientos;
CREATE TRIGGER trigger_registrar_movimiento_repuesto
  BEFORE INSERT ON repuestos_movimientos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_movimiento_repuesto();

DROP TRIGGER IF EXISTS trigger_actualizar_stock_repuesto_por_orden ON order_repuestos;
CREATE TRIGGER trigger_actualizar_stock_repuesto_por_orden
  AFTER INSERT ON order_repuestos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_stock_repuesto_por_orden();

-- ============================================
-- 9. Habilitar RLS
-- ============================================
ALTER TABLE categorias_accesorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_repuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos_movimientos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. Crear políticas RLS
-- ============================================

-- Políticas para categorias_accesorios
CREATE POLICY "categorias_accesorios_select_all" ON categorias_accesorios FOR SELECT USING (true);
CREATE POLICY "categorias_accesorios_insert_authenticated" ON categorias_accesorios FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "categorias_accesorios_update_authenticated" ON categorias_accesorios FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para dispositivos
CREATE POLICY "dispositivos_select_all" ON dispositivos FOR SELECT USING (true);
CREATE POLICY "dispositivos_insert_authenticated" ON dispositivos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dispositivos_update_authenticated" ON dispositivos FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para repuestos
CREATE POLICY "repuestos_select_all" ON repuestos FOR SELECT USING (true);
CREATE POLICY "repuestos_insert_authenticated" ON repuestos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "repuestos_update_authenticated" ON repuestos FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para order_repuestos
CREATE POLICY "order_repuestos_select_authenticated" ON order_repuestos FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "order_repuestos_insert_authenticated" ON order_repuestos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "order_repuestos_update_authenticated" ON order_repuestos FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para repuestos_movimientos
CREATE POLICY "repuestos_movimientos_select_authenticated" ON repuestos_movimientos FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "repuestos_movimientos_insert_authenticated" ON repuestos_movimientos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 11. Crear vistas útiles
-- ============================================

-- Vista: Repuestos vendidos por orden
CREATE OR REPLACE VIEW repuestos_vendidos_por_orden AS
SELECT 
  orp.id,
  orp.order_id,
  wo.order_number,
  orp.repuesto_id,
  orp.repuesto_nombre,
  orp.dispositivo_marca,
  orp.dispositivo_modelo,
  orp.cantidad,
  orp.precio_costo,
  orp.precio_venta,
  orp.subtotal,
  orp.created_at,
  wo.status as order_status,
  wo.created_at as order_created_at
FROM order_repuestos orp
INNER JOIN work_orders wo ON orp.order_id = wo.id
ORDER BY orp.created_at DESC;

-- Vista: Resumen de repuestos vendidos
CREATE OR REPLACE VIEW resumen_repuestos_vendidos AS
SELECT 
  r.id as repuesto_id,
  r.nombre as repuesto_nombre,
  d.marca as dispositivo_marca,
  d.modelo as dispositivo_modelo,
  COUNT(orp.id) as total_ventas,
  SUM(orp.cantidad) as total_cantidad_vendida,
  SUM(orp.subtotal) as total_ingresos,
  SUM(orp.precio_costo * orp.cantidad) as total_costo
FROM repuestos r
INNER JOIN dispositivos d ON r.dispositivo_id = d.id
LEFT JOIN order_repuestos orp ON r.id = orp.repuesto_id
GROUP BY r.id, r.nombre, d.marca, d.modelo
ORDER BY total_cantidad_vendida DESC;

-- Vista: Repuestos con stock bajo
CREATE OR REPLACE VIEW repuestos_stock_bajo AS
SELECT 
  r.id,
  r.nombre,
  d.marca,
  d.modelo,
  r.stock_actual,
  r.stock_minimo,
  r.precio_venta
FROM repuestos r
INNER JOIN dispositivos d ON r.dispositivo_id = d.id
WHERE r.activo = true
  AND r.stock_actual <= r.stock_minimo
ORDER BY (r.stock_actual - r.stock_minimo) ASC;

-- ============================================
-- ✅ MIGRACIÓN COMPLETADA
-- ============================================
