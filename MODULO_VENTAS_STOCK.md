# 🛒 Módulo de Ventas y Stock - Documentación Completa

## 📋 Resumen

Este módulo extiende el sistema de gestión de órdenes agregando funcionalidad completa de **Punto de Venta (POS)** y **Gestión de Inventario** para venta de accesorios de celulares.

## 🎯 Características Principales

### 1. Escaneo Global de Códigos de Barras
- **Funciona desde cualquier pantalla** sin necesidad de hacer click en un input
- La pistola de código de barras actúa como teclado USB
- El sistema captura automáticamente los escaneos
- Si no hay venta activa, crea una nueva automáticamente
- Si ya hay una venta activa, agrega el producto escaneado

### 2. Punto de Venta (POS)
- Interfaz optimizada para uso rápido
- Escaneo automático de productos
- Carrito con cantidad editable
- Cálculo automático de totales
- Múltiples métodos de pago (Efectivo, Tarjeta, Transferencia)
- Actualización de stock en tiempo real

### 3. Gestión de Productos y Stock
- Registro de productos con código de barras
- Categorización de productos
- Control de stock mínimo (alertas)
- Carga de stock inicial
- Ajustes manuales de stock
- Registro completo de movimientos de inventario

### 4. Métricas y Reportes
- Ventas del día
- Productos más vendidos
- Alertas de stock bajo
- Total de ventas diarias

## 🗄️ Estructura de Base de Datos

### Tablas Creadas

#### 1. `productos`
Almacena información de productos:
- `id` (UUID)
- `codigo_barras` (TEXT, único)
- `nombre` (TEXT, requerido)
- `categoria` (TEXT, opcional)
- `precio_venta` (NUMERIC, requerido)
- `costo` (NUMERIC, opcional)
- `stock_actual` (INTEGER, default 0)
- `stock_minimo` (INTEGER, default 0)
- `activo` (BOOLEAN, default true)
- `sucursal_id` (UUID, opcional - NULL = disponible en todas)

#### 2. `ventas`
Registra las ventas realizadas:
- `id` (UUID)
- `numero_venta` (TEXT, único, formato: V-YYYY-0001)
- `usuario_id` (UUID, referencia a users)
- `sucursal_id` (UUID, referencia a branches)
- `total` (NUMERIC)
- `metodo_pago` (TEXT: EFECTIVO, TARJETA, TRANSFERENCIA)
- `estado` (TEXT: pendiente, completada, cancelada)
- `observaciones` (TEXT, opcional)
- `created_at`, `updated_at` (TIMESTAMP)

#### 3. `venta_items`
Items individuales de cada venta:
- `id` (UUID)
- `venta_id` (UUID, referencia a ventas)
- `producto_id` (UUID, referencia a productos)
- `cantidad` (INTEGER)
- `precio_unitario` (NUMERIC) - Precio al momento de la venta
- `subtotal` (NUMERIC) - cantidad * precio_unitario
- `created_at` (TIMESTAMP)

#### 4. `inventario_movimientos`
Registra todos los movimientos de stock:
- `id` (UUID)
- `producto_id` (UUID, referencia a productos)
- `tipo_movimiento` (TEXT: venta, compra, ajuste, inicial)
- `cantidad` (INTEGER) - Positivo para entrada, negativo para salida
- `cantidad_anterior` (INTEGER)
- `cantidad_nueva` (INTEGER)
- `usuario_id` (UUID, referencia a users)
- `venta_id` (UUID, referencia a ventas, opcional)
- `observaciones` (TEXT, opcional)
- `created_at` (TIMESTAMP)

### Vistas Creadas

#### 1. `ventas_del_dia`
Vista que muestra las ventas completadas del día actual con información del usuario y sucursal.

#### 2. `productos_mas_vendidos`
Vista que muestra los productos más vendidos con total de unidades y total de ingresos.

#### 3. `productos_stock_bajo`
Vista que muestra productos cuyo stock actual es menor o igual al stock mínimo.

## 🔧 Instalación

### Paso 1: Ejecutar el Schema SQL

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto (el mismo que usa el sistema de órdenes)
3. Ve a **SQL Editor**
4. Abre el archivo `database/schema_ventas_stock.sql`
5. Copia todo el contenido y pégalo en el SQL Editor
6. Haz clic en **RUN**

El script es seguro de ejecutar múltiples veces (usa `IF NOT EXISTS`).

### Paso 2: Verificar Instalación

Ejecuta esta consulta en Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'productos',
  'ventas',
  'venta_items',
  'inventario_movimientos'
)
ORDER BY table_name;
```

Deberías ver las 4 tablas listadas.

## 🚀 Uso del Sistema

### Flujo de Venta Rápida (POS)

1. **Acceder al POS**
   - Desde el menú lateral, selecciona "Punto de Venta"
   - Se crea automáticamente una nueva venta

2. **Escanear Productos**
   - Usa la pistola de código de barras para escanear productos
   - No necesitas hacer click en ningún campo
   - El producto se agrega automáticamente al carrito
   - Si escaneas el mismo producto, se incrementa la cantidad

3. **Ajustar Cantidades**
   - Usa los botones + y - para ajustar cantidades
   - O ingresa la cantidad manualmente

4. **Finalizar Venta**
   - Haz click en "Finalizar Venta"
   - Selecciona el método de pago
   - Confirma el pago
   - El stock se actualiza automáticamente

### Gestión de Productos

1. **Acceder a Productos/Stock**
   - Desde el menú lateral, selecciona "Productos/Stock"

2. **Crear Nuevo Producto**
   - Haz click en "Nuevo Producto"
   - Escanea el código de barras o ingrésalo manualmente
   - Completa los datos del producto
   - Guarda

3. **Agregar Stock**
   - En la lista de productos, haz click en "+ Stock"
   - Ingresa la cantidad a agregar
   - El sistema registra el movimiento automáticamente

4. **Modo Escaneo**
   - Activa "Modo Escaneo"
   - Escanea un código de barras
   - Si el producto existe, se abre para editar
   - Si no existe, se crea uno nuevo

### Métricas

1. **Acceder a Métricas**
   - Desde el menú lateral, selecciona "Métricas Ventas"
   - Verás:
     - Ventas del día
     - Total del día
     - Productos más vendidos
     - Productos con stock bajo

## 🔐 Seguridad (RLS)

El módulo usa Row Level Security (RLS) de Supabase:

- **Productos**: Todos pueden leer, usuarios autenticados pueden modificar
- **Ventas**: Usuarios ven solo sus ventas o las de su sucursal (admins ven todas)
- **Venta Items**: Usuarios autenticados pueden gestionar
- **Inventario Movimientos**: Usuarios autenticados pueden ver y crear

## ⚙️ Funcionalidades Técnicas

### Escaneo Global

El hook `useBarcodeScanner` captura eventos de teclado globalmente:

```typescript
useBarcodeScanner(onScan, {
  enabled: true,
  minLength: 3,      // Longitud mínima del código
  timeout: 100,       // Tiempo entre caracteres (ms)
});
```

**Características:**
- Ignora teclado normal cuando el usuario está escribiendo en inputs
- Procesa el código cuando se presiona Enter
- Limpia el buffer si no hay actividad por 100ms

### Generación de Número de Venta

El número de venta se genera automáticamente con formato:
- `V-YYYY-0001`
- Ejemplo: `V-2024-0001`, `V-2024-0002`, etc.
- Se reinicia cada año

### Actualización de Stock

El stock se actualiza automáticamente mediante triggers:

1. Cuando se completa una venta, se crean los `venta_items`
2. Un trigger registra el movimiento en `inventario_movimientos`
3. Otro trigger actualiza el `stock_actual` del producto

## 📝 Notas Importantes

1. **Misma Base de Datos**: El módulo usa la misma base de datos del sistema de órdenes, compartiendo usuarios y sucursales.

2. **No Afecta Sistema Existente**: Las nuevas tablas no modifican las existentes, solo se agregan.

3. **Escaneo Global**: Funciona desde cualquier pantalla, pero se desactiva automáticamente cuando el usuario está escribiendo en un input (excepto si tiene `data-barcode-scanner="enabled"`).

4. **Stock en Tiempo Real**: El stock se actualiza inmediatamente al completar una venta.

5. **Historial Completo**: Todos los movimientos de stock se registran en `inventario_movimientos` para auditoría.

## 🐛 Solución de Problemas

### El escaneo no funciona
- Verifica que la pistola esté configurada como teclado USB
- Asegúrate de que no estés escribiendo en un input
- Verifica que el código tenga al menos 3 caracteres

### No se actualiza el stock
- Verifica que la venta esté en estado "completada"
- Revisa los triggers en la base de datos
- Verifica los logs de la consola del navegador

### Error al crear venta
- Verifica que el usuario esté autenticado
- Verifica que exista la sucursal (si aplica)
- Revisa los permisos RLS

## 📚 Archivos Creados

### Backend (SQL)
- `database/schema_ventas_stock.sql` - Esquema completo de base de datos

### Frontend (React/TypeScript)
- `src/react/hooks/useBarcodeScanner.ts` - Hook para escaneo global
- `src/react/components/POS.tsx` - Componente de punto de venta
- `src/react/components/ProductosStock.tsx` - Componente de gestión de productos
- `src/react/components/VentasMetricas.tsx` - Componente de métricas

### Tipos (TypeScript)
- `src/types.ts` - Tipos agregados para el módulo

### Integración
- `src/react/components/Sidebar.tsx` - Actualizado con nuevas secciones
- `src/react/Dashboard.tsx` - Actualizado para renderizar nuevos componentes
- `src/lib/permissions.ts` - Actualizado con permisos para nuevas secciones

## ✅ Checklist de Implementación

- [x] Esquema SQL completo
- [x] Tablas con RLS configurado
- [x] Triggers para actualización automática de stock
- [x] Vistas para reportes
- [x] Hook de escaneo global
- [x] Componente POS
- [x] Componente de gestión de productos
- [x] Componente de métricas
- [x] Integración al dashboard
- [x] Permisos configurados
- [x] Documentación completa

## 🎉 ¡Listo para Usar!

El módulo está completamente integrado y listo para usar. Solo necesitas:

1. Ejecutar el schema SQL en Supabase
2. Acceder al sistema
3. Comenzar a registrar productos y realizar ventas

¡El sistema está optimizado para ser rápido, simple y eficiente para uso en mostrador!
