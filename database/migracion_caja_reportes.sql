-- Migración: Sistema de Caja y Reportes de Ventas
-- Fecha: 2025-02-06

-- ============================================
-- Tabla de Caja Diaria
-- ============================================
CREATE TABLE IF NOT EXISTS caja_diaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  caja_inicial NUMERIC NOT NULL DEFAULT 0,
  caja_final NUMERIC DEFAULT NULL,
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cerrada_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(sucursal_id, fecha, estado) -- Solo una caja abierta por sucursal por día
);

-- Índices para caja_diaria
CREATE INDEX IF NOT EXISTS idx_caja_diaria_sucursal ON caja_diaria(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_caja_diaria_fecha ON caja_diaria(fecha);
CREATE INDEX IF NOT EXISTS idx_caja_diaria_estado ON caja_diaria(estado);
CREATE INDEX IF NOT EXISTS idx_caja_diaria_usuario ON caja_diaria(usuario_id);

-- Modificar tabla ventas para incluir campos de efectivo
ALTER TABLE ventas 
  ADD COLUMN IF NOT EXISTS efectivo_recibido NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vueltos NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS caja_diaria_id UUID REFERENCES caja_diaria(id) ON DELETE SET NULL;

-- Índice para ventas por caja
CREATE INDEX IF NOT EXISTS idx_ventas_caja_diaria ON ventas(caja_diaria_id);

-- Función para actualizar updated_at de caja_diaria
CREATE OR REPLACE FUNCTION update_caja_diaria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_caja_diaria_updated_at ON caja_diaria;
CREATE TRIGGER trigger_update_caja_diaria_updated_at
  BEFORE UPDATE ON caja_diaria
  FOR EACH ROW
  EXECUTE FUNCTION update_caja_diaria_updated_at();

-- Función para obtener la caja abierta del día actual
CREATE OR REPLACE FUNCTION get_caja_abierta_hoy(p_sucursal_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  sucursal_id UUID,
  usuario_id UUID,
  fecha DATE,
  caja_inicial NUMERIC,
  caja_final NUMERIC,
  estado TEXT,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.sucursal_id,
    c.usuario_id,
    c.fecha,
    c.caja_inicial,
    c.caja_final,
    c.estado,
    c.observaciones,
    c.created_at,
    c.updated_at
  FROM caja_diaria c
  WHERE c.fecha = CURRENT_DATE
    AND c.estado = 'abierta'
    AND (p_sucursal_id IS NULL OR c.sucursal_id = p_sucursal_id)
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular totales de ventas del día
CREATE OR REPLACE FUNCTION calcular_totales_ventas_dia(
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_sucursal_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_efectivo NUMERIC,
  total_tarjeta NUMERIC,
  total_transferencia NUMERIC,
  total_general NUMERIC,
  total_vueltos NUMERIC,
  cantidad_ventas BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN v.metodo_pago = 'EFECTIVO' THEN v.total ELSE 0 END), 0) as total_efectivo,
    COALESCE(SUM(CASE WHEN v.metodo_pago = 'TARJETA' THEN v.total ELSE 0 END), 0) as total_tarjeta,
    COALESCE(SUM(CASE WHEN v.metodo_pago = 'TRANSFERENCIA' THEN v.total ELSE 0 END), 0) as total_transferencia,
    COALESCE(SUM(v.total), 0) as total_general,
    COALESCE(SUM(v.vueltos), 0) as total_vueltos,
    COUNT(*) as cantidad_ventas
  FROM ventas v
  WHERE DATE(v.created_at) = p_fecha
    AND v.estado = 'completada'
    AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id);
END;
$$ LANGUAGE plpgsql;

-- RLS para caja_diaria
ALTER TABLE caja_diaria ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver cajas de su sucursal o todas si son admin
CREATE POLICY "Usuarios pueden ver cajas de su sucursal"
  ON caja_diaria FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE 
        (role = 'admin') OR
        (role = 'encargado' AND sucursal_id = caja_diaria.sucursal_id) OR
        (role = 'recepcionista' AND sucursal_id = caja_diaria.sucursal_id)
    )
  );

-- Política: Usuarios pueden insertar cajas
CREATE POLICY "Usuarios pueden crear cajas"
  ON caja_diaria FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE 
        role IN ('admin', 'encargado', 'recepcionista')
    )
  );

-- Política: Usuarios pueden actualizar cajas de su sucursal
CREATE POLICY "Usuarios pueden actualizar cajas de su sucursal"
  ON caja_diaria FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE 
        (role = 'admin') OR
        (role = 'encargado' AND sucursal_id = caja_diaria.sucursal_id) OR
        (role = 'recepcionista' AND sucursal_id = caja_diaria.sucursal_id)
    )
  );
