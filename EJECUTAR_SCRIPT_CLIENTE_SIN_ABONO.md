# Ejecutar Script para Agregar Campo cliente_sin_abono

## Error Actual
```
Error: Could not find the 'cliente_sin_abono' column of 'work_orders' in the schema cache
```

## Solución

Ejecuta el siguiente script SQL en Supabase para agregar el campo `cliente_sin_abono` a la tabla `work_orders`:

### Paso 1: Ir a Supabase SQL Editor

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral

### Paso 2: Ejecutar el Script

Copia y pega el siguiente script en el SQL Editor:

```sql
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
```

### Paso 3: Ejecutar

1. Haz clic en **RUN** (o presiona Ctrl+Enter)
2. Deberías ver un mensaje de éxito: "Columna cliente_sin_abono agregada exitosamente"

### Paso 4: Verificar

Ejecuta esta consulta para verificar que el campo fue agregado:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name = 'cliente_sin_abono';
```

Deberías ver el campo listado con `data_type = 'boolean'` y `column_default = 'false'`.

---

**Nota**: Después de ejecutar el script, el sistema funcionará correctamente y podrás usar el checkbox "El cliente no dejó abonado nada del precio del servicio" al crear órdenes.
