-- ============================================
-- SCRIPT COMPLETO DE CONFIGURACIÓN INICIAL
-- Sistema Playbox - Gestión de Órdenes y Stock
-- ============================================
-- Este script crea la base de datos completa desde cero
-- Incluye todas las tablas, funciones, triggers y datos iniciales
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR TABLAS EXISTENTES (si existen)
-- ============================================
DROP TABLE IF EXISTS repuestos_movimientos CASCADE;
DROP TABLE IF EXISTS order_repuestos CASCADE;
DROP TABLE IF EXISTS repuestos CASCADE;
DROP TABLE IF EXISTS dispositivos CASCADE;
DROP TABLE IF EXISTS inventario_movimientos CASCADE;
DROP TABLE IF EXISTS venta_items CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias_accesorios CASCADE;
DROP TABLE IF EXISTS order_notes CASCADE;
DROP TABLE IF EXISTS order_services CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS device_checklist_items CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS salary_adjustments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- Eliminar vistas
DROP VIEW IF EXISTS ventas_del_dia CASCADE;
DROP VIEW IF EXISTS productos_mas_vendidos CASCADE;
DROP VIEW IF EXISTS productos_stock_bajo CASCADE;
DROP VIEW IF EXISTS repuestos_vendidos_por_orden CASCADE;
DROP VIEW IF EXISTS resumen_repuestos_vendidos CASCADE;
DROP VIEW IF EXISTS repuestos_stock_bajo CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS calculate_warranty_expires_at() CASCADE;
DROP FUNCTION IF EXISTS update_order_metadata() CASCADE;
DROP FUNCTION IF EXISTS generar_numero_venta() CASCADE;
DROP FUNCTION IF EXISTS registrar_movimiento_inventario() CASCADE;
DROP FUNCTION IF EXISTS actualizar_stock_por_venta() CASCADE;
DROP FUNCTION IF EXISTS update_productos_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_ventas_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generar_numero_orden() CASCADE;
DROP FUNCTION IF EXISTS update_categorias_accesorios_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_dispositivos_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_repuestos_updated_at() CASCADE;
DROP FUNCTION IF EXISTS registrar_movimiento_repuesto() CASCADE;
DROP FUNCTION IF EXISTS actualizar_stock_repuesto_por_orden() CASCADE;
DROP FUNCTION IF EXISTS update_system_settings_updated_at() CASCADE;

-- ============================================
-- PASO 2: CREAR TABLAS BASE
-- ============================================

-- ============================================
-- 1. Tabla de Sucursales (Branches)
-- ============================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  razon_social TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  -- Campos de autenticación independiente de usuarios
  login_email TEXT,
  password_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Tabla de Usuarios (extiende auth.users)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'encargado', 'recepcionista')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  sucursal_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Tabla de Proveedores (Sistema Reparaciones)
-- ============================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. Tabla de Órdenes de Reparación (Sistema Reparaciones)
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_number TEXT NOT NULL,
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  device TEXT NOT NULL,
  service_description TEXT NOT NULL,
  replacement_cost NUMERIC NOT NULL DEFAULT 0,
  repair_cost NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT '' CHECK (payment_method IN ('', 'EFECTIVO', 'TARJETA', 'TRANSFERENCIA')),
  receipt_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'returned', 'cancelled')),
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  week_start DATE,
  month INTEGER,
  year INTEGER
);

-- ============================================
-- 5. Tabla de Ajustes de Sueldo (Sistema Reparaciones)
-- ============================================
CREATE TABLE salary_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('advance', 'discount')),
  amount NUMERIC NOT NULL,
  note TEXT
);

-- ============================================
-- 6. Tabla de Clientes (Sistema Gestión Órdenes)
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_country_code TEXT DEFAULT '+56',
  rut_document TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email, phone)
);

-- ============================================
-- 7. Tabla de Servicios (Sistema Gestión Órdenes)
-- ============================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. Tabla de Checklist Items (Sistema Gestión Órdenes)
-- ============================================
CREATE TABLE device_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type TEXT NOT NULL CHECK (device_type IN ('iphone', 'ipad', 'macbook', 'apple_watch')),
  item_name TEXT NOT NULL,
  item_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_type, item_name)
);

-- ============================================
-- 9. Tabla de Órdenes de Trabajo (Sistema Gestión Órdenes)
-- ============================================
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sucursal_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('iphone', 'ipad', 'macbook', 'apple_watch')),
  device_model TEXT NOT NULL,
  device_serial_number TEXT,
  device_unlock_code TEXT,
  device_unlock_pattern JSONB,
  problem_description TEXT NOT NULL,
  checklist_data JSONB,
  total_repair_cost NUMERIC NOT NULL DEFAULT 0,
  replacement_cost NUMERIC NOT NULL DEFAULT 0,
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'urgente')),
  commitment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'en_proceso' CHECK (status IN ('en_proceso', 'por_entregar', 'entregada', 'rechazada', 'sin_solucion', 'garantia')),
  payment_method TEXT CHECK (payment_method IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA')),
  receipt_number TEXT,
  receipt_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  warranty_days INTEGER DEFAULT 30,
  warranty_expires_at DATE,
  -- Campos de firmas
  cliente_signature_url TEXT,
  recibido_por_signature_url TEXT,
  recibido_por_nombre TEXT,
  -- Campo para indicar si el cliente no dejó abonado nada
  cliente_sin_abono BOOLEAN DEFAULT FALSE
);

-- ============================================
-- 10. Tabla de Relación Orden-Servicios
-- ============================================
CREATE TABLE order_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 11. Tabla de Notas de Órdenes
-- ============================================
CREATE TABLE order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'interno' CHECK (note_type IN ('interno', 'publico')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 12. Tabla de Categorías de Accesorios
-- ============================================
CREATE TABLE categorias_accesorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 13. Tabla de Productos (Módulo Ventas y Stock)
-- ============================================
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_barras TEXT,
  nombre TEXT NOT NULL,
  categoria TEXT,
  categoria_id UUID REFERENCES categorias_accesorios(id) ON DELETE SET NULL,
  tipo TEXT DEFAULT 'accesorio' CHECK (tipo IN ('accesorio', 'repuesto')),
  marca TEXT,
  modelo TEXT,
  precio_venta NUMERIC NOT NULL DEFAULT 0,
  costo NUMERIC DEFAULT 0,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  sucursal_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 14. Tabla de Dispositivos (para repuestos)
-- ============================================
CREATE TABLE dispositivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tipo_dispositivo TEXT CHECK (tipo_dispositivo IN ('iphone', 'ipad', 'macbook', 'apple_watch', 'android', 'laptop', 'tablet', 'consola', 'otro')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(marca, modelo)
);

-- ============================================
-- 15. Tabla de Repuestos
-- ============================================
CREATE TABLE repuestos (
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

-- ============================================
-- 16. Tabla de relación Orden-Repuestos
-- ============================================
CREATE TABLE order_repuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  repuesto_id UUID REFERENCES repuestos(id) ON DELETE SET NULL,
  repuesto_nombre TEXT NOT NULL,
  dispositivo_marca TEXT NOT NULL,
  dispositivo_modelo TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_costo NUMERIC NOT NULL DEFAULT 0,
  precio_venta NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 17. Tabla de Ventas (Módulo Ventas y Stock)
-- ============================================
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_venta TEXT NOT NULL UNIQUE,
  usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sucursal_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  metodo_pago TEXT NOT NULL DEFAULT 'EFECTIVO' CHECK (metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada', 'cancelada')),
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 18. Tabla de Items de Venta
-- ============================================
CREATE TABLE venta_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 19. Tabla de Movimientos de Inventario
-- ============================================
CREATE TABLE inventario_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('venta', 'compra', 'ajuste', 'inicial')),
  cantidad INTEGER NOT NULL,
  cantidad_anterior INTEGER NOT NULL,
  cantidad_nueva INTEGER NOT NULL,
  usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
  venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 20. Tabla de Movimientos de Repuestos
-- ============================================
CREATE TABLE repuestos_movimientos (
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

-- ============================================
-- 21. Tabla de Configuración del Sistema
-- ============================================
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASO 3: CREAR ÍNDICES
-- ============================================

-- Índices Sistema Reparaciones
CREATE INDEX idx_orders_technician ON orders(technician_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_week_start ON orders(week_start);
CREATE INDEX idx_orders_month_year ON orders(month, year);
CREATE INDEX idx_salary_adjustments_technician ON salary_adjustments(technician_id);

-- Índices Sistema Gestión Órdenes
CREATE INDEX idx_work_orders_customer ON work_orders(customer_id);
CREATE INDEX idx_work_orders_technician ON work_orders(technician_id);
CREATE INDEX idx_work_orders_sucursal ON work_orders(sucursal_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX idx_work_orders_order_number ON work_orders(order_number);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_order_services_order ON order_services(order_id);
CREATE INDEX idx_order_notes_order ON order_notes(order_id);

-- Índices Módulo Ventas y Stock
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_codigo_barras_unique ON productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_sucursal ON productos(sucursal_id);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_tipo ON productos(tipo);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_ventas_sucursal ON ventas(sucursal_id);
CREATE INDEX idx_ventas_customer ON ventas(customer_id);
CREATE INDEX idx_ventas_fecha ON ventas(created_at);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_ventas_numero ON ventas(numero_venta);
CREATE INDEX idx_venta_items_venta ON venta_items(venta_id);
CREATE INDEX idx_venta_items_producto ON venta_items(producto_id);
CREATE INDEX idx_inventario_producto ON inventario_movimientos(producto_id);
CREATE INDEX idx_inventario_fecha ON inventario_movimientos(created_at);
CREATE INDEX idx_inventario_tipo ON inventario_movimientos(tipo_movimiento);
CREATE INDEX idx_inventario_venta ON inventario_movimientos(venta_id);

-- Índices Repuestos
CREATE INDEX idx_dispositivos_marca_modelo ON dispositivos(marca, modelo);
CREATE INDEX idx_dispositivos_tipo ON dispositivos(tipo_dispositivo);
CREATE INDEX idx_repuestos_dispositivo ON repuestos(dispositivo_id);
CREATE INDEX idx_repuestos_activo ON repuestos(activo);
CREATE INDEX idx_repuestos_stock ON repuestos(stock_actual);
CREATE INDEX idx_order_repuestos_order ON order_repuestos(order_id);
CREATE INDEX idx_order_repuestos_repuesto ON order_repuestos(repuesto_id);
CREATE INDEX idx_repuestos_movimientos_repuesto ON repuestos_movimientos(repuesto_id);
CREATE INDEX idx_repuestos_movimientos_order ON repuestos_movimientos(order_id);
CREATE INDEX idx_repuestos_movimientos_fecha ON repuestos_movimientos(created_at);

-- Índices Categorías
CREATE INDEX idx_categorias_accesorios_activa ON categorias_accesorios(activa);

-- ============================================
-- PASO 4: CREAR FUNCIONES
-- ============================================

-- Función para actualizar updated_at (común)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular warranty_expires_at
CREATE OR REPLACE FUNCTION calculate_warranty_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'entregada' AND NEW.warranty_expires_at IS NULL THEN
    NEW.warranty_expires_at = (NOW() + (NEW.warranty_days || ' days')::INTERVAL)::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar metadata de orders (sistema reparaciones)
CREATE OR REPLACE FUNCTION update_order_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.week_start := DATE_TRUNC('week', NEW.created_at)::DATE;
  NEW.month := EXTRACT(MONTH FROM NEW.created_at)::INTEGER;
  NEW.year := EXTRACT(YEAR FROM NEW.created_at)::INTEGER;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at de productos
CREATE OR REPLACE FUNCTION update_productos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at de ventas
CREATE OR REPLACE FUNCTION update_ventas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de venta
CREATE OR REPLACE FUNCTION generar_numero_venta()
RETURNS TEXT AS $$
DECLARE
  año_actual TEXT;
  ultimo_numero INTEGER;
  nuevo_numero TEXT;
BEGIN
  año_actual := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(numero_venta FROM 'V-' || año_actual || '-(.+)') AS INTEGER)),
    0
  ) INTO ultimo_numero
  FROM ventas
  WHERE numero_venta LIKE 'V-' || año_actual || '-%';
  
  ultimo_numero := ultimo_numero + 1;
  nuevo_numero := 'V-' || año_actual || '-' || LPAD(ultimo_numero::TEXT, 4, '0');
  
  RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

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

-- Función para actualizar stock por venta (con validación de stock)
-- IMPORTANTE: Esta función NO inserta en inventario_movimientos para evitar doble descuento
-- El trigger registrar_movimiento_inventario se encargará de registrar el movimiento cuando se inserte manualmente
CREATE OR REPLACE FUNCTION actualizar_stock_por_venta()
RETURNS TRIGGER AS $$
DECLARE
  stock_anterior INTEGER;
  stock_nuevo INTEGER;
  venta_estado TEXT;
BEGIN
  SELECT estado INTO venta_estado
  FROM ventas
  WHERE id = NEW.venta_id;
  
  IF venta_estado = 'completada' THEN
    SELECT stock_actual INTO stock_anterior
    FROM productos
    WHERE id = NEW.producto_id;
    
    IF stock_anterior < NEW.cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para el producto %: se requiere %, hay %', 
        (SELECT nombre FROM productos WHERE id = NEW.producto_id),
        NEW.cantidad,
        stock_anterior;
    END IF;
    
    stock_nuevo := stock_anterior - NEW.cantidad;
    
    -- Actualizar stock del producto
    UPDATE productos
    SET stock_actual = stock_nuevo,
        updated_at = NOW()
    WHERE id = NEW.producto_id;
    
    -- Registrar movimiento de inventario (el trigger registrar_movimiento_inventario NO descuenta stock
    -- porque ya viene con cantidad_anterior y cantidad_nueva establecidos)
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
      -NEW.cantidad,
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

-- Función para generar número de orden
CREATE OR REPLACE FUNCTION generar_numero_orden()
RETURNS TRIGGER AS $$
DECLARE
  año_actual TEXT;
  ultimo_numero INTEGER;
  nuevo_numero TEXT;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    año_actual := TO_CHAR(NOW(), 'YYYY');
    
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
  SELECT status INTO order_status
  FROM work_orders
  WHERE id = NEW.order_id;
  
  IF order_status IN ('entregada', 'por_entregar') AND NEW.repuesto_id IS NOT NULL THEN
    SELECT stock_actual INTO stock_anterior
    FROM repuestos
    WHERE id = NEW.repuesto_id;
    
    IF stock_anterior < NEW.cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para el repuesto %: se requiere %, hay %', 
        (SELECT nombre FROM repuestos WHERE id = NEW.repuesto_id),
        NEW.cantidad,
        stock_anterior;
    END IF;
    
    stock_nuevo := stock_anterior - NEW.cantidad;
    
    UPDATE repuestos
    SET stock_actual = stock_nuevo,
        updated_at = NOW()
    WHERE id = NEW.repuesto_id;
    
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

-- Función para actualizar updated_at de system_settings
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 5: CREAR TRIGGERS
-- ============================================

-- Triggers para updated_at
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productos_updated_at_trigger BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_productos_updated_at();

CREATE TRIGGER update_ventas_updated_at_trigger BEFORE UPDATE ON ventas
  FOR EACH ROW EXECUTE FUNCTION update_ventas_updated_at();

CREATE TRIGGER update_categorias_accesorios_updated_at BEFORE UPDATE ON categorias_accesorios
  FOR EACH ROW EXECUTE FUNCTION update_categorias_accesorios_updated_at();

CREATE TRIGGER update_dispositivos_updated_at BEFORE UPDATE ON dispositivos
  FOR EACH ROW EXECUTE FUNCTION update_dispositivos_updated_at();

CREATE TRIGGER update_repuestos_updated_at BEFORE UPDATE ON repuestos
  FOR EACH ROW EXECUTE FUNCTION update_repuestos_updated_at();

CREATE TRIGGER system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_system_settings_updated_at();

-- Triggers para sistema reparaciones
CREATE TRIGGER trigger_update_order_metadata
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_metadata();

-- Triggers para sistema gestión órdenes
CREATE TRIGGER trigger_generar_order_number
  BEFORE INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION generar_numero_orden();

CREATE TRIGGER calculate_warranty_expires_at_trigger
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW
  WHEN (NEW.status = 'entregada')
  EXECUTE FUNCTION calculate_warranty_expires_at();

-- Triggers para módulo ventas y stock
CREATE TRIGGER trigger_registrar_movimiento_inventario
  BEFORE INSERT ON inventario_movimientos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_movimiento_inventario();

CREATE TRIGGER trigger_actualizar_stock_por_venta
  AFTER INSERT ON venta_items
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_stock_por_venta();

-- Triggers para repuestos
CREATE TRIGGER trigger_registrar_movimiento_repuesto
  BEFORE INSERT ON repuestos_movimientos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_movimiento_repuesto();

CREATE TRIGGER trigger_actualizar_stock_repuesto_por_orden
  AFTER INSERT ON order_repuestos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_stock_repuesto_por_orden();

-- ============================================
-- PASO 6: HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_repuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_accesorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 7: CREAR POLÍTICAS RLS
-- ============================================

-- Políticas para users
CREATE POLICY "users_select_own_or_admin" ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Políticas para branches
CREATE POLICY "branches_select_all" ON branches FOR SELECT USING (true);
CREATE POLICY "branches_insert_admin" ON branches FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "branches_update_admin" ON branches FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para suppliers
CREATE POLICY "suppliers_select_all" ON suppliers FOR SELECT USING (true);

-- Políticas para orders (sistema reparaciones)
CREATE POLICY "orders_select_own_or_admin" ON orders FOR SELECT
  USING (
    technician_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
CREATE POLICY "orders_insert_own" ON orders FOR INSERT
  WITH CHECK (technician_id = auth.uid());
CREATE POLICY "orders_update_own_or_admin" ON orders FOR UPDATE
  USING (
    technician_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Políticas para salary_adjustments
CREATE POLICY "salary_adjustments_select_own_or_admin" ON salary_adjustments FOR SELECT
  USING (
    technician_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
CREATE POLICY "salary_adjustments_insert_own" ON salary_adjustments FOR INSERT
  WITH CHECK (technician_id = auth.uid());

-- Políticas para customers
CREATE POLICY "customers_select_all" ON customers FOR SELECT USING (true);
CREATE POLICY "customers_insert_authenticated" ON customers FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "customers_update_authenticated" ON customers FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para services
CREATE POLICY "services_select_all" ON services FOR SELECT USING (true);
CREATE POLICY "services_insert_admin" ON services FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para device_checklist_items
CREATE POLICY "device_checklist_items_select_all" ON device_checklist_items FOR SELECT USING (true);
CREATE POLICY "device_checklist_items_insert_admin" ON device_checklist_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "device_checklist_items_update_admin" ON device_checklist_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "device_checklist_items_delete_admin" ON device_checklist_items FOR DELETE 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para work_orders
CREATE POLICY "work_orders_select_own_or_sucursal_or_admin" ON work_orders FOR SELECT
  USING (
    technician_id = auth.uid()
    OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "work_orders_insert_authenticated" ON work_orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "work_orders_update_own_or_sucursal_or_admin" ON work_orders FOR UPDATE
  USING (
    technician_id = auth.uid()
    OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "work_orders_delete_admin" ON work_orders FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para order_services
CREATE POLICY "order_services_select_authenticated" ON order_services FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "order_services_insert_authenticated" ON order_services FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "order_services_update_authenticated" ON order_services FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Políticas para order_notes
CREATE POLICY "order_notes_select_authenticated" ON order_notes FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "order_notes_insert_authenticated" ON order_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para order_repuestos
CREATE POLICY "order_repuestos_select_authenticated" ON order_repuestos FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "order_repuestos_insert_authenticated" ON order_repuestos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "order_repuestos_update_authenticated" ON order_repuestos FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

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

-- Políticas para productos
CREATE POLICY "productos_select_all" ON productos FOR SELECT USING (true);
CREATE POLICY "productos_insert_authenticated" ON productos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "productos_update_authenticated" ON productos FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para ventas
CREATE POLICY "ventas_select_own_or_sucursal_or_admin" ON ventas FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "ventas_insert_authenticated" ON ventas FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
      usuario_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );
CREATE POLICY "ventas_update_authenticated" ON ventas FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL 
    AND (
      usuario_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Políticas para venta_items
CREATE POLICY "venta_items_select_authenticated" ON venta_items FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "venta_items_insert_authenticated" ON venta_items FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para inventario_movimientos
CREATE POLICY "inventario_movimientos_select_authenticated" ON inventario_movimientos FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "inventario_movimientos_insert_authenticated" ON inventario_movimientos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para repuestos_movimientos
CREATE POLICY "repuestos_movimientos_select_authenticated" ON repuestos_movimientos FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "repuestos_movimientos_insert_authenticated" ON repuestos_movimientos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para system_settings
CREATE POLICY "settings_select_authenticated" ON system_settings FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "settings_insert_admin" ON system_settings FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "settings_update_admin" ON system_settings FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- PASO 8: INSERTAR DATOS INICIALES
-- ============================================

-- Insertar proveedores
INSERT INTO suppliers (name, contact_info) VALUES
  ('FIXELL', 'contacto@fixell.cl'),
  ('CRISTIAN AI', 'cristian@example.com'),
  ('TIENDA', 'tienda@example.com'),
  ('TechParts', 'info@techparts.cl'),
  ('Repuestos Móvil', 'ventas@repuestosmovil.cl'),
  ('Global Componentes', 'contacto@globalcomp.cl')
ON CONFLICT DO NOTHING;

-- Insertar servicios
INSERT INTO services (name, description) VALUES
  ('Cambio de pantalla', 'Reemplazo completo de pantalla'),
  ('Cambio de batería', 'Reemplazo de batería original'),
  ('Reparación de cámara', 'Reparación o reemplazo de módulo de cámara'),
  ('Reparación de conector de carga', 'Reparación o reemplazo de puerto de carga'),
  ('Reparación de botones', 'Reparación de botones físicos'),
  ('Reparación de altavoces', 'Reparación o reemplazo de altavoces'),
  ('Reparación de sensores', 'Reparación de sensores (Face ID, Touch ID, etc.)'),
  ('Reparación de placa madre', 'Reparación de placa lógica'),
  ('Limpieza general', 'Limpieza interna y externa del dispositivo'),
  ('Actualización de software', 'Actualización de sistema operativo')
ON CONFLICT (name) DO NOTHING;

-- Insertar checklist para iPhone
INSERT INTO device_checklist_items (device_type, item_name, item_order) VALUES
  ('iphone', 'Cámara frontal', 1),
  ('iphone', 'Cámara trasera', 2),
  ('iphone', 'Señal', 3),
  ('iphone', 'Altavoces', 4),
  ('iphone', 'Face ID / Touch ID', 5),
  ('iphone', 'WiFi', 6),
  ('iphone', 'Bluetooth', 7),
  ('iphone', 'Sensores (Acelerómetro, Giroscopio)', 8),
  ('iphone', 'Botones (Volumen, Power, Home)', 9),
  ('iphone', 'Pantalla (Táctil, visual)', 10)
ON CONFLICT (device_type, item_name) DO NOTHING;

-- Insertar checklist para iPad
INSERT INTO device_checklist_items (device_type, item_name, item_order) VALUES
  ('ipad', 'Cámara frontal', 1),
  ('ipad', 'Cámara trasera', 2),
  ('ipad', 'WiFi', 3),
  ('ipad', 'Bluetooth', 4),
  ('ipad', 'Touch ID / Face ID', 5),
  ('ipad', 'Altavoces', 6),
  ('ipad', 'Puerto de carga (Lightning/USB-C)', 7),
  ('ipad', 'Pantalla (Táctil, visual)', 8)
ON CONFLICT (device_type, item_name) DO NOTHING;

-- Insertar checklist para Apple Watch
INSERT INTO device_checklist_items (device_type, item_name, item_order) VALUES
  ('apple_watch', 'Pantalla', 1),
  ('apple_watch', 'Corona Digital', 2),
  ('apple_watch', 'Botón lateral', 3),
  ('apple_watch', 'Sensores (Corazón, ECG)', 4),
  ('apple_watch', 'Cargador magnético', 5),
  ('apple_watch', 'Altavoz', 6),
  ('apple_watch', 'Micrófono', 7)
ON CONFLICT (device_type, item_name) DO NOTHING;

-- Insertar checklist para MacBook
INSERT INTO device_checklist_items (device_type, item_name, item_order) VALUES
  ('macbook', 'Pantalla', 1),
  ('macbook', 'Teclado', 2),
  ('macbook', 'Trackpad', 3),
  ('macbook', 'Cámara', 4),
  ('macbook', 'Altavoces', 5),
  ('macbook', 'Puertos (USB-C, Thunderbolt, HDMI)', 6),
  ('macbook', 'Batería', 7),
  ('macbook', 'Ventiladores', 8)
ON CONFLICT (device_type, item_name) DO NOTHING;

-- Insertar categorías de accesorios
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

-- Insertar dispositivos comunes
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

-- Insertar configuración inicial del sistema
INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('header_logo', '{"url": "/logo.png", "width": 128, "height": 128}'),
  ('pdf_logo', '{"url": "/logo.png", "width": 33, "height": 22}'),
  ('warranty_policies', '{
    "policies": [
      "• Garantía 30 días por defectos de mano de obra y repuestos.",
      "• NO cubre daños por mal uso, golpes, caídas o líquidos.",
      "• Presentar boleta o factura para hacer efectiva la garantía.",
      "• Cualquier reparación por terceros anula la garantía."
    ]
  }'),
  ('accessory_warranty_policies', '{
    "policies": [
      "• Garantía 30 días por defectos de fabricación.",
      "• NO cubre daños por mal uso, golpes o caídas.",
      "• Presentar boleta para hacer efectiva la garantía.",
      "• La garantía no cubre desgaste normal del producto."
    ]
  }'),
  ('recibido_por_signature', '{
    "signature_url": "",
    "nombre": ""
  }')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- PASO 9: CREAR VISTAS
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
-- ✅ SCRIPT COMPLETADO
-- ============================================
-- La base de datos ha sido creada completamente desde cero
-- 
-- PRÓXIMOS PASOS:
-- 1. Crear usuarios en Authentication de Supabase:
--    - Admin: email y contraseña
--    - Sucursal: email y contraseña
-- 2. Ejecutar script crear_usuarios_iniciales.sql para insertar usuarios en la tabla 'users'
-- 3. Configurar firma de quien recibe en Settings
-- 4. ¡Listo para usar!
-- ============================================
