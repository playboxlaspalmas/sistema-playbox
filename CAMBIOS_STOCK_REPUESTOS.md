# Cambios Implementados: Separación de Stock de Accesorios y Repuestos

## Resumen

Se ha implementado una separación completa entre:
1. **Accesorios**: Productos vendidos desde el punto de venta (POS)
2. **Repuestos**: Productos vendidos en órdenes de servicio técnico

## Archivos Creados

### Base de Datos
- `database/migracion_stock_repuestos.sql`: Script SQL completo para migrar la base de datos

### Componentes React
- `src/react/components/CategoriasAccesorios.tsx`: Gestión de categorías de accesorios
- `src/react/components/DispositivosRepuestos.tsx`: Gestión de dispositivos y repuestos
- `src/react/components/RepuestosSelector.tsx`: Selector de repuestos para órdenes

## Archivos Modificados

### Base de Datos
- Modificación de tabla `productos`: Agregado campo `tipo` ('accesorio' | 'repuesto')
- Nuevas tablas creadas:
  - `categorias_accesorios`: Categorías de accesorios (Fundas, Cargadores, Micas, etc.)
  - `dispositivos`: Dispositivos para repuestos (iPhone 13 Pro Max, Samsung S24, etc.)
  - `repuestos`: Repuestos asociados a dispositivos
  - `order_repuestos`: Relación entre órdenes y repuestos
  - `repuestos_movimientos`: Movimientos de stock de repuestos

### TypeScript Types
- `src/types.ts`: Agregados tipos para:
  - `CategoriaAccesorio`
  - `Dispositivo`
  - `Repuesto`
  - `OrderRepuesto`
  - `RepuestoMovimiento`
  - Actualizado `Producto` con campos `tipo`, `marca`, `modelo`, `categoria_id`

### Componentes
- `src/react/components/AdminDashboard.tsx`: Agregada estadística de repuestos vendidos
- `src/react/components/ProductosStock.tsx`: Separado en pestañas:
  - Accesorios
  - Repuestos
  - Categorías
  - Dispositivos

## Funcionalidades Implementadas

### 1. Gestión de Categorías de Accesorios
- Crear, editar y desactivar categorías
- Categorías predefinidas:
  - Fundas
  - Cargadores (Tradicionales, Portátiles, de Auto, de Notebook)
  - Micas
  - Cables (de Corriente, Tipo C, Micro USB)
  - Adaptadores
  - Chips de Celulares
  - Otros

### 2. Gestión de Dispositivos
- Crear dispositivos con marca, modelo y tipo
- Tipos soportados: iPhone, iPad, MacBook, Apple Watch, Android, Laptop, Tablet, Consola, Otro

### 3. Gestión de Repuestos
- Crear repuestos asociados a dispositivos
- Control de stock (actual y mínimo)
- Precio de costo y precio de venta
- Movimientos de inventario automáticos

### 4. Accesorios Mejorados
- Asociación con categorías
- Campos de marca y modelo
- Filtrado por categoría

### 5. Dashboard
- Estadística de repuestos vendidos
- Detalle de repuestos vendidos por orden
- Filtrado por sucursal

## Próximos Pasos

### Pendiente de Implementar

1. **Integración en OrderForm**: 
   - Agregar `RepuestosSelector` al formulario de creación de órdenes
   - Guardar repuestos al crear la orden
   - Actualizar cálculo de costos totales

2. **Ejecutar Migración SQL**:
   - Ejecutar `database/migracion_stock_repuestos.sql` en Supabase
   - Verificar que todas las tablas se crearon correctamente

3. **Migración de Datos Existentes**:
   - Los productos existentes deben marcarse como `tipo = 'accesorio'`
   - Script SQL para actualizar productos existentes:
   ```sql
   UPDATE productos SET tipo = 'accesorio' WHERE tipo IS NULL;
   ```

## Cómo Usar

### Gestión de Accesorios
1. Ir a "Productos/Stock" → Pestaña "Accesorios"
2. Crear categorías en la pestaña "Categorías"
3. Crear accesorios seleccionando categoría, marca y modelo

### Gestión de Repuestos
1. Ir a "Productos/Stock" → Pestaña "Dispositivos"
2. Crear dispositivos (marca y modelo)
3. Crear repuestos asociados a cada dispositivo
4. Configurar precio de costo, precio de venta y stock

### Ver Estadísticas
1. Ir al Dashboard principal
2. Ver el KPI de "Repuestos Vendidos"
3. Hacer clic para ver el detalle de repuestos vendidos por orden

## Notas Importantes

- Los productos existentes deben migrarse manualmente o con script SQL
- Los repuestos solo se pueden vender desde órdenes de servicio
- Los accesorios solo se pueden vender desde el punto de venta (POS)
- El stock de repuestos se actualiza automáticamente al crear una orden con repuestos
