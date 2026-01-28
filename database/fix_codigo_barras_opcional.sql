-- ============================================
-- CORREGIR CÓDIGO DE BARRAS PARA QUE SEA OPCIONAL
-- ============================================
-- Este script corrige el índice único para permitir múltiples NULL
-- Ejecuta esto en Supabase SQL Editor

-- Eliminar restricción UNIQUE si existe (debe eliminarse antes que el índice)
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_codigo_barras_key;

-- Eliminar índice único antiguo si existe
DROP INDEX IF EXISTS idx_productos_codigo_barras;

-- Crear índice único solo para códigos que existen (permite múltiples NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_codigo_barras_unique 
ON productos(codigo_barras) 
WHERE codigo_barras IS NOT NULL;

-- Crear índice normal para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras 
ON productos(codigo_barras) 
WHERE codigo_barras IS NOT NULL;

-- Crear índice para búsqueda por nombre
CREATE INDEX IF NOT EXISTS idx_productos_nombre 
ON productos(nombre);

-- Verificar que funciona
-- Esto debería funcionar (múltiples productos sin código de barras):
-- INSERT INTO productos (nombre, precio_venta) VALUES ('Producto 1', 1000);
-- INSERT INTO productos (nombre, precio_venta) VALUES ('Producto 2', 2000);
-- Esto NO debería funcionar (código duplicado):
-- INSERT INTO productos (nombre, codigo_barras, precio_venta) VALUES ('Producto 3', '123', 3000);
-- INSERT INTO productos (nombre, codigo_barras, precio_venta) VALUES ('Producto 4', '123', 4000); -- ERROR
