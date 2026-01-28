# 🧪 INSTRUCCIONES PARA PRUEBAS COMPLETAS DEL SISTEMA

## 📋 PREPARACIÓN

### 1. Ejecutar Scripts SQL en Orden

```sql
-- 1. Primero ejecutar el schema completo
-- Archivo: database/schema_completo.sql
-- Esto crea todas las tablas, funciones, triggers y políticas RLS

-- 2. Luego ejecutar las correcciones
-- Archivo: database/fix_codigo_barras_opcional.sql
-- Esto corrige los índices para permitir código de barras opcional

-- 3. Finalmente ejecutar la verificación completa
-- Archivo: database/verificar_y_corregir_todo.sql
-- Esto verifica y corrige todos los problemas potenciales
```

### 2. Crear Usuarios de Prueba

```sql
-- Crear 3 usuarios de prueba para diferentes roles
-- 1. Admin
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@test.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- 2. Usuario de sucursal 1
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'sucursal1@test.com',
  crypt('sucursal123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- 3. Usuario de sucursal 2
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'sucursal2@test.com',
  crypt('sucursal123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Luego insertar en tabla users con los mismos IDs
-- (Usar los IDs generados arriba)
```

### 3. Crear Sucursales de Prueba

```sql
-- Crear 3 sucursales
INSERT INTO branches (name, razon_social, address, phone, email, login_email, password_hash)
VALUES
  ('Sucursal Centro', 'Sucursal Centro S.A.', 'Calle Principal 123', '+56912345678', 'centro@test.com', 'centro@test.com', crypt('centro123', gen_salt('bf'))),
  ('Sucursal Norte', 'Sucursal Norte S.A.', 'Avenida Norte 456', '+56987654321', 'norte@test.com', 'norte@test.com', crypt('norte123', gen_salt('bf'))),
  ('Sucursal Sur', 'Sucursal Sur S.A.', 'Calle Sur 789', '+56911223344', 'sur@test.com', 'sur@test.com', crypt('sur123', gen_salt('bf')));
```

---

## ✅ CHECKLIST DE PRUEBAS

### Prueba 1: Autenticación
- [ ] Login con usuario admin
- [ ] Login con usuario de sucursal
- [ ] Login con email de sucursal (login_email)
- [ ] Logout
- [ ] Intentar acceder a /dashboard sin login (debe redirigir)
- [ ] Verificar que la sesión persiste al recargar

### Prueba 2: Crear Productos
- [ ] Crear producto SIN código de barras
- [ ] Crear producto CON código de barras
- [ ] Intentar crear producto con código de barras duplicado (debe fallar)
- [ ] Editar producto existente
- [ ] Buscar producto por nombre
- [ ] Buscar producto por código de barras
- [ ] Verificar que productos sin código de barras se pueden crear múltiples veces

### Prueba 3: Gestión de Stock
- [ ] Agregar stock a un producto (botón + Stock)
- [ ] Agregar stock usando escaneo (modo escaneo ON)
- [ ] Verificar que se registra movimiento de inventario
- [ ] Verificar que el stock se actualiza correctamente
- [ ] Intentar agregar stock negativo (debe validar)

### Prueba 4: POS - Escaneo de Código de Barras
- [ ] Escanear producto con código de barras
- [ ] Verificar que se agrega al carrito
- [ ] Escanear el mismo producto nuevamente (debe incrementar cantidad)
- [ ] Escanear producto sin stock (debe mostrar error)
- [ ] Escanear producto inexistente (debe mostrar error)
- [ ] Verificar que el escaneo funciona desde cualquier pantalla

### Prueba 5: POS - Búsqueda Manual
- [ ] Buscar producto por nombre completo
- [ ] Buscar producto por nombre parcial
- [ ] Buscar producto por código de barras
- [ ] Agregar producto desde resultados de búsqueda
- [ ] Buscar producto inexistente (no debe mostrar resultados)
- [ ] Verificar que la búsqueda es case-insensitive

### Prueba 6: POS - Carrito y Venta
- [ ] Agregar múltiples productos al carrito
- [ ] Cambiar cantidad con botones +/-
- [ ] Cambiar cantidad manualmente en input
- [ ] Eliminar producto del carrito (cantidad = 0)
- [ ] Verificar que el total se calcula correctamente
- [ ] Finalizar venta con método de pago EFECTIVO
- [ ] Finalizar venta con método de pago TARJETA
- [ ] Finalizar venta con método de pago TRANSFERENCIA
- [ ] Verificar que el stock se actualiza después de la venta
- [ ] Verificar que se registra movimiento de inventario
- [ ] Cancelar venta (debe limpiar carrito)

### Prueba 7: POS - Validaciones
- [ ] Intentar finalizar venta sin productos (debe mostrar error)
- [ ] Intentar finalizar venta con producto que quedó sin stock (debe validar antes)
- [ ] Verificar que no se puede agregar más cantidad que el stock disponible
- [ ] Verificar que se muestra error si el producto fue eliminado

### Prueba 8: Métricas de Ventas
- [ ] Verificar que se muestran ventas del día
- [ ] Verificar que se muestran productos más vendidos
- [ ] Verificar que se muestran productos con stock bajo
- [ ] Verificar que las métricas se actualizan automáticamente
- [ ] Crear venta y verificar que aparece en métricas

### Prueba 9: Crear Orden de Trabajo
- [ ] Buscar cliente existente
- [ ] Crear cliente nuevo
- [ ] Seleccionar dispositivo
- [ ] Completar checklist
- [ ] Agregar servicios
- [ ] Ingresar costos y precios
- [ ] Guardar orden
- [ ] Verificar que se creó correctamente

### Prueba 10: Editar Orden
- [ ] Abrir orden existente
- [ ] Modificar campos
- [ ] Cambiar estado
- [ ] Agregar nota
- [ ] Guardar cambios
- [ ] Verificar que se actualizó

### Prueba 11: Concurrencia - Múltiples Usuarios
**Abrir 3 navegadores/ventanas diferentes:**

#### Ventana 1: Admin
- [ ] Login como admin
- [ ] Crear productos
- [ ] Ver todas las órdenes

#### Ventana 2: Sucursal 1
- [ ] Login como sucursal 1
- [ ] Crear orden
- [ ] Hacer venta
- [ ] Ver solo órdenes de su sucursal

#### Ventana 3: Sucursal 2
- [ ] Login como sucursal 2
- [ ] Crear orden
- [ ] Hacer venta simultánea con sucursal 1
- [ ] Ver solo órdenes de su sucursal

**Verificar:**
- [ ] No hay conflictos de datos
- [ ] Cada usuario ve solo lo que debe ver
- [ ] Las ventas simultáneas no causan problemas
- [ ] El stock se actualiza correctamente en ambas sucursales

### Prueba 12: Concurrencia - Ventas Simultáneas
**Abrir 2 ventanas con la misma sucursal:**

- [ ] Ventana 1: Escanear producto A
- [ ] Ventana 2: Escanear producto A simultáneamente
- [ ] Ventana 1: Finalizar venta
- [ ] Ventana 2: Intentar finalizar venta (debe validar stock)
- [ ] Verificar que solo una venta se completa si hay stock limitado

### Prueba 13: Errores y Validaciones
- [ ] Intentar crear producto sin nombre (debe validar)
- [ ] Intentar crear producto con precio negativo (debe validar)
- [ ] Intentar crear producto con stock negativo (debe validar)
- [ ] Intentar finalizar venta sin productos (debe validar)
- [ ] Intentar agregar más stock del que hay disponible (debe validar)
- [ ] Verificar que todos los errores muestran mensajes claros

### Prueba 14: Permisos y RLS
- [ ] Usuario de sucursal NO puede ver órdenes de otra sucursal
- [ ] Usuario de sucursal NO puede editar órdenes de otra sucursal
- [ ] Admin puede ver todas las órdenes
- [ ] Usuario de sucursal puede crear ventas
- [ ] Usuario de sucursal puede crear productos
- [ ] Verificar que no hay errores de "row-level security"

### Prueba 15: Límites y Rendimiento
- [ ] Crear 100 productos
- [ ] Buscar productos (debe ser rápido)
- [ ] Crear 50 ventas
- [ ] Ver métricas (debe cargar rápido)
- [ ] Verificar que no hay timeouts
- [ ] Verificar que no hay errores de memoria

---

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### Error: "infinite recursion detected in policy"
**Solución**: Ejecutar `database/fix_users_rls_recursion.sql`

### Error: "código de barras ya existe"
**Solución**: Verificar que el índice único permite NULL. Ejecutar `database/fix_codigo_barras_opcional.sql`

### Error: "Stock insuficiente"
**Solución**: Verificar que el stock se actualiza correctamente. Revisar triggers.

### Error: "row-level security policy"
**Solución**: Verificar que el usuario tiene permisos. Revisar políticas RLS en Supabase.

### Error: "No se puede crear venta"
**Solución**: Verificar que el usuario tiene `sucursal_id` asignado.

---

## 📊 REPORTE DE PRUEBAS

Después de completar todas las pruebas, documenta:

1. **Pruebas Exitosas**: ✅
2. **Pruebas Fallidas**: ❌
3. **Errores Encontrados**: 
4. **Mejoras Sugeridas**: 

---

**Última actualización**: 2026-01-28
