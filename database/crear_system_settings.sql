-- ============================================
-- Crear tabla system_settings
-- ============================================
-- Ejecuta esto en Supabase SQL Editor si la tabla no existe

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "settings_select_authenticated" ON system_settings;
DROP POLICY IF EXISTS "settings_insert_admin" ON system_settings;
DROP POLICY IF EXISTS "settings_update_admin" ON system_settings;

-- Crear políticas (sin recursión - no consultar users dentro de la política)
CREATE POLICY "settings_select_authenticated" ON system_settings FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Para insert/update, permitir a cualquier usuario autenticado (o restringir más tarde si es necesario)
CREATE POLICY "settings_insert_admin" ON system_settings FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "settings_update_admin" ON system_settings FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Insertar valores por defecto
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
  }')
ON CONFLICT (setting_key) DO NOTHING;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS system_settings_updated_at ON system_settings;
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();
