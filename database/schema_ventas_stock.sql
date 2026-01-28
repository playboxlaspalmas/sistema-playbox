-- ============================================
-- Módulo de Ventas y Stock - Esquema de Base de Datos
-- ============================================
-- Este script extiende el sistema existente agregando funcionalidad de POS
-- Ejecutar este script en el SQL Editor de Supabase
-- Usa la MISMA base de datos del sistema de gestión de órdenes

-- ============================================
-- 1. Tabla de Productos
-- ============================================
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_barras TEXT, -- Código de barras (opcional, único si existe)
  nombre TEXT NOT NULL,
  categoria TEXT,
  precio_venta NUMERIC NOT NULL DEFAULT 0,
  costo NUMERIC DEFAULT 0, -- Costo de compra (opcional)
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0, -- Alerta cuando stock baja de este valor
  activo BOOLEAN DEFAULT true,
  sucursal_id UUID REFERENCES branches(id) ON DELETE SET NULL, -- NULL = disponible en todas las sucursales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda rápida por código de barras (solo si existe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_codigo_barras_unique ON productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_sucursal ON productos(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);

-- ============================================
-- 2. Tabla de Ventas
-- ============================================
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_venta TEXT NOT NULL UNIQUE, -- Número único de venta (ej: V-2024-001)
  usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sucursal_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  metodo_pago TEXT NOT NULL DEFAULT 'EFECTIVO' CHECK (metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada', 'cancelada')),
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para ventas
CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_sucursal ON ventas(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(created_at);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_numero ON ventas(numero_venta);

-- ============================================
-- 3. Tabla de Items de Venta
-- ============================================
CREATE TABLE IF NOT EXISTS venta_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC NOT NULL, -- Precio al momento de la venta (puede cambiar)
  subtotal NUMERIC NOT NULL, -- cantidad * precio_unitario
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para items de venta
CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items(venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_producto ON venta_items(producto_id);

-- ============================================
-- 4. Tabla de Movimientos de Inventario
-- ============================================
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('venta', 'compra', 'ajuste', 'inicial')),
  cantidad INTEGER NOT NULL, -- Positivo para entrada, negativo para salida
  cantidad_anterior INTEGER NOT NULL, -- Stock antes del movimiento
  cantidad_nueva INTEGER NOT NULL, -- Stock después del movimiento
  usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
  venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL, -- Si el movimiento es por una venta
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para movimientos
CREATE INDEX IF NOT EXISTS idx_inventario_producto ON inventario_movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_inventario_fecha ON inventario_movimientos(created_at);
CREATE INDEX IF NOT EXISTS idx_inventario_tipo ON inventario_movimientos(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_inventario_venta ON inventario_movimientos(venta_id);

-- ============================================
-- 5. Funciones y Triggers
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_productos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ventas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_productos_updated_at_trigger ON productos;
CREATE TRIGGER update_productos_updated_at_trigger 
  BEFORE UPDATE ON productos
  FOR EACH ROW 
  EXECUTE FUNCTION update_productos_updated_at();

DROP TRIGGER IF EXISTS update_ventas_updated_at_trigger ON ventas;
CREATE TRIGGER update_ventas_updated_at_trigger 
  BEFORE UPDATE ON ventas
  FOR EACH ROW 
  EXECUTE FUNCTION update_ventas_updated_at();

-- Función para generar número de venta automático
CREATE OR REPLACE FUNCTION generar_numero_venta()
RETURNS TEXT AS $$
DECLARE
  año_actual TEXT;
  ultimo_numero INTEGER;
  nuevo_numero TEXT;
BEGIN
  año_actual := TO_CHAR(NOW(), 'YYYY');
  
  -- Obtener el último número de venta del año actual
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(numero_venta FROM 'V-' || año_actual || '-(.+)') AS INTEGER)),
    0
  ) INTO ultimo_numero
  FROM ventas
  WHERE numero_venta LIKE 'V-' || año_actual || '-%';
  
  -- Incrementar y formatear
  ultimo_numero := ultimo_numero + 1;
  nuevo_numero := 'V-' || año_actual || '-' || LPAD(ultimo_numero::TEXT, 4, '0');
  
  RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar movimiento de inventario
CREATE OR REPLACE FUNCTION registrar_movimiento_inventario()
RETURNS TRIGGER AS $$
DECLARE
  stock_anterior INTEGER;
  stock_nuevo INTEGER;
BEGIN
  -- Obtener stock actual
  SELECT stock_actual INTO stock_anterior
  FROM productos
  WHERE id = NEW.producto_id;
  
  -- Calcular nuevo stock
  IF NEW.tipo_movimiento = 'venta' THEN
    stock_nuevo := stock_anterior - ABS(NEW.cantidad);
  ELSE
    stock_nuevo := stock_anterior + ABS(NEW.cantidad);
  END IF;
  
  -- Actualizar stock del producto
  UPDATE productos
  SET stock_actual = stock_nuevo,
      updated_at = NOW()
  WHERE id = NEW.producto_id;
  
  -- Guardar valores en el movimiento
  NEW.cantidad_anterior := stock_anterior;
  NEW.cantidad_nueva := stock_nuevo;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar movimientos de inventario
DROP TRIGGER IF EXISTS trigger_registrar_movimiento_inventario ON inventario_movimientos;
CREATE TRIGGER trigger_registrar_movimiento_inventario
  BEFORE INSERT ON inventario_movimientos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_movimiento_inventario();

-- Función para actualizar stock cuando se completa una venta
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

-- Trigger para actualizar stock al crear item de venta
DROP TRIGGER IF EXISTS trigger_actualizar_stock_por_venta ON venta_items;
CREATE TRIGGER trigger_actualizar_stock_por_venta
  AFTER INSERT ON venta_items
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_stock_por_venta();

-- ============================================
-- 6. Row Level Security (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "productos_select_all" ON productos;
DROP POLICY IF EXISTS "productos_insert_authenticated" ON productos;
DROP POLICY IF EXISTS "productos_update_authenticated" ON productos;
DROP POLICY IF EXISTS "ventas_select_own_or_sucursal_or_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_insert_authenticated" ON ventas;
DROP POLICY IF EXISTS "ventas_update_authenticated" ON ventas;
DROP POLICY IF EXISTS "venta_items_select_authenticated" ON venta_items;
DROP POLICY IF EXISTS "venta_items_insert_authenticated" ON venta_items;
DROP POLICY IF EXISTS "inventario_movimientos_select_authenticated" ON inventario_movimientos;
DROP POLICY IF EXISTS "inventario_movimientos_insert_authenticated" ON inventario_movimientos;

-- Políticas para productos (todos pueden leer, autenticados pueden modificar)
CREATE POLICY "productos_select_all" ON productos 
  FOR SELECT 
  USING (true);

CREATE POLICY "productos_insert_authenticated" ON productos 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "productos_update_authenticated" ON productos 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para ventas
CREATE POLICY "ventas_select_own_or_sucursal_or_admin" ON ventas 
  FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "ventas_insert_authenticated" ON ventas 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ventas_update_authenticated" ON ventas 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para venta_items
CREATE POLICY "venta_items_select_authenticated" ON venta_items 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "venta_items_insert_authenticated" ON venta_items 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para inventario_movimientos
CREATE POLICY "inventario_movimientos_select_authenticated" ON inventario_movimientos 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "inventario_movimientos_insert_authenticated" ON inventario_movimientos 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 7. Vistas útiles para reportes
-- ============================================

-- Vista: Ventas del día
CREATE OR REPLACE VIEW ventas_del_dia AS
SELECT 
  v.id,
  v.numero_venta,
  v.total,
  v.metodo_pago,
  v.created_at,
  u.name as usuario_nombre,
  b.name as sucursal_nombre
FROM ventas v
LEFT JOIN users u ON v.usuario_id = u.id
LEFT JOIN branches b ON v.sucursal_id = b.id
WHERE DATE(v.created_at) = CURRENT_DATE
  AND v.estado = 'completada';

-- Vista: Productos más vendidos
CREATE OR REPLACE VIEW productos_mas_vendidos AS
SELECT 
  p.id,
  p.nombre,
  p.codigo_barras,
  SUM(vi.cantidad) as total_vendido,
  SUM(vi.subtotal) as total_ingresos
FROM productos p
INNER JOIN venta_items vi ON p.id = vi.producto_id
INNER JOIN ventas v ON vi.venta_id = v.id
WHERE v.estado = 'completada'
GROUP BY p.id, p.nombre, p.codigo_barras
ORDER BY total_vendido DESC;

-- Vista: Stock bajo
CREATE OR REPLACE VIEW productos_stock_bajo AS
SELECT 
  id,
  codigo_barras,
  nombre,
  categoria,
  stock_actual,
  stock_minimo,
  precio_venta
FROM productos
WHERE activo = true
  AND stock_actual <= stock_minimo
ORDER BY (stock_actual - stock_minimo) ASC;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Este módulo se integra con el sistema existente usando las mismas tablas:
--    - users (usuarios)
--    - branches (sucursales)
--
-- 2. El sistema de escaneo global funciona capturando eventos de teclado
--    desde cualquier pantalla (la pistola de código de barras actúa como teclado)
--
-- 3. Los movimientos de inventario se registran automáticamente:
--    - Al completar una venta
--    - Al hacer ajustes manuales
--    - Al cargar stock inicial
--
-- 4. El número de venta se genera automáticamente con formato: V-YYYY-0001
--
-- 5. El stock se actualiza en tiempo real cuando se completa una venta
