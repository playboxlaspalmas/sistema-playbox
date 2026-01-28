# 🗺️ MAPEO COMPLETO DEL SISTEMA - Todas las Funciones, Botones y Acciones

## 📋 ÍNDICE
1. [Páginas Principales](#páginas-principales)
2. [Componentes del Dashboard](#componentes-del-dashboard)
3. [Funciones por Módulo](#funciones-por-módulo)
4. [Botones y Acciones](#botones-y-acciones)
5. [Verificación de Errores](#verificación-de-errores)

---

## 📄 PÁGINAS PRINCIPALES

### 1. `/` (index.astro)
**Función**: Página de inicio
**Acciones**:
- Botón "Ingresar al Sistema" → Redirige a `/login`

### 2. `/login` (login.astro)
**Función**: Autenticación de usuarios
**Componente**: `Login.tsx`
**Acciones**:
- Input Email
- Input Password
- Botón "Entrar" → `onLogin()`
  - Verifica si es sucursal (busca en `branches` por `login_email`)
  - Si es sucursal: verifica password_hash
  - Si no es sucursal: `supabase.auth.signInWithPassword()`
  - Redirige a `/dashboard` si éxito

### 3. `/dashboard` (dashboard.astro)
**Función**: Dashboard principal con navegación
**Componente**: `Dashboard.tsx`
**Secciones disponibles**:
- `dashboard` - Dashboard principal
- `new-order` - Nueva orden
- `orders` - Lista de órdenes
- `pos` - Punto de venta
- `productos-stock` - Gestión de productos
- `ventas-metricas` - Métricas de ventas
- `customers` - Clientes
- `branches` - Sucursales
- `users` - Usuarios
- `reports` - Reportes
- `settings` - Configuración
- `security` - Seguridad

---

## 🧩 COMPONENTES DEL DASHBOARD

### 1. AdminDashboard.tsx
**Función**: Dashboard para administradores
**Botones/Acciones**:
- Botón "Nueva Orden" → `onNewOrder()` → Cambia sección a `new-order`
- KPIs: Órdenes en proceso, Por entregar, Entregadas, Rechazadas
- Gráficos y estadísticas

### 2. TechnicianDashboard.tsx
**Función**: Dashboard para técnicos/encargados
**Botones/Acciones**:
- Botón "Nueva Orden" → `onNewOrder()` → Cambia sección a `new-order`
- KPIs: Mis órdenes, En proceso, Por entregar

### 3. OrderForm.tsx
**Función**: Crear/editar órdenes de trabajo
**Acciones**:
- Búsqueda de cliente → `CustomerSearch`
- Selección de dispositivo
- Checklist dinámico
- Selección de servicios
- Inputs: Costos, prioridad, fecha compromiso
- Botón "Guardar Orden" → `handleSubmit()`
  - Crea `work_order`
  - Crea `order_services`
  - Actualiza stock si aplica

### 4. OrdersTable.tsx
**Función**: Lista de órdenes con filtros
**Botones/Acciones**:
- Filtros: Estado, Número de orden, Fecha, Sucursal (admin)
- Botón "Nueva Orden" → `onNewOrder()`
- Botón "Ver Detalle" → Abre `OrderDetail`
- Botón "Editar" → Abre `OrderEditModal`
- Botón "Cambiar Estado" → Actualiza estado de orden
- Botón "Generar PDF" → Genera PDF de orden

### 5. OrderDetail.tsx
**Función**: Vista detallada de orden
**Botones/Acciones**:
- Botón "Editar" → Abre `OrderEditModal`
- Botón "Generar PDF" → Genera PDF
- Botón "Agregar Nota" → Agrega nota a orden
- Botón "Cambiar Estado" → Actualiza estado

### 6. OrderEditModal.tsx
**Función**: Editar orden existente
**Botones/Acciones**:
- Todos los campos editables de `OrderForm`
- Botón "Guardar Cambios" → `handleSave()`
- Botón "Cancelar" → Cierra modal

### 7. CustomersList.tsx
**Función**: Lista de clientes
**Botones/Acciones**:
- Búsqueda de clientes
- Botón "Nuevo Cliente" → Abre `CustomerEditModal`
- Botón "Editar" → Abre `CustomerEditModal`
- Botón "Ver Historial" → Muestra órdenes del cliente

### 8. CustomerEditModal.tsx
**Función**: Crear/editar cliente
**Botones/Acciones**:
- Inputs: Nombre, Email, Teléfono, RUT, Dirección
- Botón "Guardar" → Crea/actualiza `customers`
- Botón "Cancelar" → Cierra modal

### 9. CustomerSearch.tsx
**Función**: Búsqueda rápida de clientes
**Acciones**:
- Input de búsqueda (email, teléfono, nombre)
- Botón "Nuevo Cliente" → Crea cliente rápido
- Selección de cliente → Retorna cliente seleccionado

### 10. POS.tsx ⭐ NUEVO
**Función**: Punto de venta rápido
**Botones/Acciones**:
- **Búsqueda manual**: Input para buscar por nombre o código
  - Botón "Buscar" → `buscarProductosManual()`
  - Lista de productos encontrados
  - Botón "Agregar" en cada producto → `agregarAlCarrito()`
- **Escaneo global**: Automático con pistola de código de barras
  - `useBarcodeScanner()` → `manejarEscaneo()`
- **Carrito**:
  - Botón "-" → `actualizarCantidad(-1)`
  - Input cantidad → `actualizarCantidad()`
  - Botón "+" → `actualizarCantidad(+1)`
- **Finalizar venta**:
  - Botón "Finalizar Venta" → `setMostrarPago(true)`
  - Selección método de pago → `setMetodoPago()`
  - Botón "Confirmar Pago" → `finalizarVenta()`
    - Crea `venta_items`
    - Actualiza `ventas` (estado: completada)
    - Triggers actualizan stock automáticamente
- **Cancelar**:
  - Botón "Cancelar" → `cancelarVenta()`

### 11. ProductosStock.tsx ⭐ NUEVO
**Función**: Gestión de productos e inventario
**Botones/Acciones**:
- **Modo Escaneo**:
  - Botón "Modo Escaneo ON/OFF" → `setModoEscaneo()`
  - Escaneo automático → `manejarEscaneo()` o `manejarEscaneoStock()`
- **Búsqueda**:
  - Input búsqueda → Filtra productos
- **Nuevo Producto**:
  - Botón "+ Nuevo Producto" → `setMostrarFormulario(true)`
  - Formulario:
    - Código de barras (opcional)
    - Nombre (requerido)
    - Categoría
    - Precio de venta (requerido)
    - Costo
    - Stock inicial
    - Stock mínimo
  - Botón "Guardar" → `guardarProducto()`
    - Crea/actualiza `productos`
- **Lista de productos**:
  - Botón "+ Stock" → `agregarStock()`
    - Pide cantidad
    - Actualiza `productos.stock_actual`
    - Crea `inventario_movimientos`
  - Botón "Editar" → Abre formulario con datos

### 12. VentasMetricas.tsx ⭐ NUEVO
**Función**: Métricas y reportes de ventas
**Acciones**:
- Carga automática cada 30 segundos
- Muestra:
  - Ventas del día (vista `ventas_del_dia`)
  - Productos más vendidos (vista `productos_mas_vendidos`)
  - Stock bajo (vista `productos_stock_bajo`)

### 13. BranchesList.tsx
**Función**: Gestión de sucursales
**Botones/Acciones**:
- Lista de sucursales
- Botón "Nueva Sucursal" → Crea sucursal
- Botón "Editar" → Edita sucursal
- Botón "Permisos" → Abre `BranchPermissionsModal`

### 14. BranchPermissionsModal.tsx
**Función**: Asignar permisos a usuarios por sucursal
**Botones/Acciones**:
- Checkboxes de permisos por usuario
- Botón "Guardar" → Actualiza permisos
- Botón "Cancelar" → Cierra modal

### 15. UsersList.tsx
**Función**: Gestión de usuarios
**Botones/Acciones**:
- Lista de usuarios
- Botón "Nuevo Usuario" → Crea usuario
- Botón "Editar" → Edita usuario
- Botón "Eliminar" → Elimina usuario

### 16. Reports.tsx
**Función**: Reportes y estadísticas
**Acciones**:
- Filtros por fecha, sucursal, estado
- Gráficos y tablas
- Exportar datos

### 17. Settings.tsx
**Función**: Configuración del sistema
**Tabs**:
- Logos: Subir logos (header, PDF)
- Checklists: Editar checklists por dispositivo
- Services: Editar servicios
- Warranties: Editar políticas de garantía
**Botones/Acciones**:
- Botón "Guardar" en cada tab → Actualiza `system_settings`

### 18. SecuritySettings.tsx
**Función**: Configuración de seguridad
**Acciones**:
- Cambiar contraseñas
- Configurar permisos

### 19. OrderNotes.tsx
**Función**: Notas de órdenes
**Botones/Acciones**:
- Input nueva nota
- Botón "Agregar Nota" → Crea `order_notes`
- Lista de notas (interno/público)

### 20. DeviceChecklist.tsx
**Función**: Checklist dinámico por tipo de dispositivo
**Acciones**:
- Selección de estado por item (ok/damaged/replaced)
- Guarda en `work_orders.checklist_data` (JSONB)

### 21. ServiceSelector.tsx
**Función**: Selección de servicios para orden
**Acciones**:
- Checkboxes de servicios
- Input cantidad
- Input precio unitario
- Calcula total automáticamente

### 22. PDFPreview.tsx
**Función**: Vista previa de PDF
**Acciones**:
- Botón "Descargar" → Descarga PDF
- Botón "Imprimir" → Imprime PDF

---

## 🔧 FUNCIONES POR MÓDULO

### Módulo de Autenticación
- `Login.tsx`:
  - `onLogin()` - Autenticación
  - Verificación de sucursal
  - Verificación de usuario normal

### Módulo de Órdenes
- `OrderForm.tsx`:
  - `handleSubmit()` - Crear orden
  - `loadDevices()` - Cargar dispositivos
  - `loadServices()` - Cargar servicios
- `OrdersTable.tsx`:
  - `loadOrders()` - Cargar órdenes
  - `handleStatusChange()` - Cambiar estado
  - `handleDelete()` - Eliminar orden
- `OrderDetail.tsx`:
  - `loadOrder()` - Cargar orden completa
  - `addNote()` - Agregar nota
- `OrderEditModal.tsx`:
  - `handleSave()` - Guardar cambios

### Módulo de Clientes
- `CustomersList.tsx`:
  - `loadCustomers()` - Cargar clientes
  - `handleSearch()` - Buscar clientes
- `CustomerSearch.tsx`:
  - `searchCustomers()` - Búsqueda rápida
  - `createCustomer()` - Crear cliente rápido
- `CustomerEditModal.tsx`:
  - `handleSave()` - Guardar cliente

### Módulo de Ventas y Stock ⭐ NUEVO
- `POS.tsx`:
  - `crearVenta()` - Crear nueva venta
  - `buscarProductoPorCodigo()` - Buscar por código de barras
  - `buscarProductosManual()` - Búsqueda manual
  - `agregarAlCarrito()` - Agregar producto
  - `actualizarCantidad()` - Actualizar cantidad
  - `finalizarVenta()` - Completar venta
  - `cancelarVenta()` - Cancelar venta
  - `manejarEscaneo()` - Manejar escaneo de código de barras
- `ProductosStock.tsx`:
  - `cargarProductos()` - Cargar lista
  - `guardarProducto()` - Crear/actualizar producto
  - `agregarStock()` - Agregar stock
  - `manejarEscaneo()` - Escaneo para crear/editar
  - `manejarEscaneoStock()` - Escaneo para agregar stock
- `VentasMetricas.tsx`:
  - `cargarMetricas()` - Cargar todas las métricas

### Módulo de Configuración
- `Settings.tsx`:
  - `loadSettings()` - Cargar configuraciones
  - `saveLogos()` - Guardar logos
  - `saveChecklists()` - Guardar checklists
  - `saveServices()` - Guardar servicios
  - `saveWarranties()` - Guardar garantías

---

## 🔘 BOTONES Y ACCIONES DETALLADAS

### Dashboard Principal
| Botón | Función | Tabla Afectada | Verificación |
|-------|---------|----------------|--------------|
| Nueva Orden | Cambia a `new-order` | - | ✅ |
| Ver Órdenes | Cambia a `orders` | - | ✅ |

### Nueva Orden (OrderForm)
| Botón/Acción | Función | Tabla Afectada | Verificación |
|--------------|---------|----------------|--------------|
| Buscar Cliente | Abre CustomerSearch | `customers` | ⚠️ Verificar RLS |
| Crear Cliente | Crea cliente nuevo | `customers` | ⚠️ Verificar RLS |
| Guardar Orden | Crea orden completa | `work_orders`, `order_services` | ⚠️ Verificar RLS |
| Seleccionar Servicios | Agrega servicios | - | ✅ |
| Cambiar Checklist | Actualiza checklist_data | `work_orders` | ⚠️ Verificar RLS |

### Lista de Órdenes (OrdersTable)
| Botón/Acción | Función | Tabla Afectada | Verificación |
|--------------|---------|----------------|--------------|
| Filtrar | Filtra órdenes | - | ✅ |
| Ver Detalle | Abre OrderDetail | - | ✅ |
| Editar | Abre OrderEditModal | `work_orders` | ⚠️ Verificar RLS |
| Cambiar Estado | Actualiza estado | `work_orders` | ⚠️ Verificar RLS |
| Generar PDF | Genera PDF | - | ✅ |
| Eliminar | Elimina orden | `work_orders` | ⚠️ Solo admin |

### POS ⭐ NUEVO
| Botón/Acción | Función | Tabla Afectada | Verificación |
|--------------|---------|----------------|--------------|
| Buscar Producto | Búsqueda manual | `productos` | ⚠️ Verificar RLS |
| Agregar al Carrito | Agrega producto | - | ✅ |
| + / - Cantidad | Actualiza cantidad | - | ✅ |
| Finalizar Venta | Completa venta | `ventas`, `venta_items`, `inventario_movimientos`, `productos` | ⚠️ Verificar RLS y triggers |
| Cancelar | Cancela venta | - | ✅ |
| Escaneo Global | Agrega producto automático | `productos` | ⚠️ Verificar RLS |

### Productos/Stock ⭐ NUEVO
| Botón/Acción | Función | Tabla Afectada | Verificación |
|--------------|---------|----------------|--------------|
| Nuevo Producto | Crea producto | `productos` | ⚠️ Verificar RLS |
| Editar | Edita producto | `productos` | ⚠️ Verificar RLS |
| + Stock | Agrega stock | `productos`, `inventario_movimientos` | ⚠️ Verificar RLS |
| Modo Escaneo | Activa escaneo | - | ✅ |
| Buscar | Filtra productos | - | ✅ |

### Clientes
| Botón/Acción | Función | Tabla Afectada | Verificación |
|--------------|---------|----------------|--------------|
| Nuevo Cliente | Crea cliente | `customers` | ⚠️ Verificar RLS |
| Editar | Edita cliente | `customers` | ⚠️ Verificar RLS |
| Ver Historial | Muestra órdenes | `work_orders` | ⚠️ Verificar RLS |

### Sucursales
| Botón/Acción | Función | Tabla Afectada | Verificación |
|--------------|---------|----------------|--------------|
| Nueva Sucursal | Crea sucursal | `branches` | ⚠️ Solo admin |
| Editar | Edita sucursal | `branches` | ⚠️ Solo admin |
| Permisos | Asigna permisos | `users` (permissions) | ⚠️ Solo admin |

### Usuarios
| Botón/Acción | Función | Tabla Afectada | Verificación |
|--------------|---------|----------------|--------------|
| Nuevo Usuario | Crea usuario | `users`, `auth.users` | ⚠️ Solo admin |
| Editar | Edita usuario | `users` | ⚠️ Solo admin |
| Eliminar | Elimina usuario | `users`, `auth.users` | ⚠️ Solo admin |

---

## ⚠️ VERIFICACIÓN DE ERRORES POTENCIALES

### 1. Row Level Security (RLS)

#### Tabla: `users`
**Problema**: Recursión infinita si consulta `users` dentro de su política
**Solución**: ✅ Ya corregido - Política simple: `auth.uid() IS NOT NULL`

#### Tabla: `productos`
**Política actual**: `auth.uid() IS NOT NULL`
**Verificar**: ✅ Debe funcionar para todos los autenticados

#### Tabla: `ventas`
**Política actual**: Usuario, sucursal o admin
**Verificar**: ⚠️ Probar con múltiples usuarios simultáneos

#### Tabla: `venta_items`
**Política actual**: `auth.uid() IS NOT NULL`
**Verificar**: ✅ Debe funcionar

#### Tabla: `inventario_movimientos`
**Política actual**: `auth.uid() IS NOT NULL`
**Verificar**: ✅ Debe funcionar

#### Tabla: `work_orders`
**Política actual**: Técnico, sucursal o admin
**Verificar**: ⚠️ Probar con múltiples sucursales

#### Tabla: `customers`
**Política actual**: `auth.uid() IS NOT NULL`
**Verificar**: ⚠️ Probar desde sucursales

#### Tabla: `order_services`
**Política actual**: `auth.uid() IS NOT NULL`
**Verificar**: ⚠️ Probar desde sucursales

#### Tabla: `system_settings`
**Política actual**: `auth.uid() IS NOT NULL`
**Verificar**: ✅ Debe funcionar

### 2. Triggers y Funciones

#### Trigger: `actualizar_stock_por_venta`
**Función**: Actualiza stock cuando se completa venta
**Verificar**: ⚠️ Probar con ventas simultáneas

#### Trigger: `registrar_movimiento_inventario`
**Función**: Registra movimientos de inventario
**Verificar**: ⚠️ Probar con múltiples movimientos simultáneos

#### Trigger: `update_order_metadata`
**Función**: Actualiza week_start, month, year
**Verificar**: ✅ Debe funcionar

### 3. Validaciones de Formularios

#### OrderForm
- ✅ Cliente requerido
- ✅ Dispositivo requerido
- ✅ Problema requerido
- ⚠️ Validar que servicios tengan precio > 0

#### POS
- ✅ Producto debe existir
- ✅ Stock debe ser > 0
- ✅ Cantidad debe ser > 0
- ⚠️ Validar que venta tenga items antes de finalizar

#### ProductosStock
- ✅ Nombre requerido
- ✅ Precio de venta requerido
- ✅ Código de barras opcional
- ⚠️ Validar que código de barras sea único si existe

### 4. Concurrencia y Límites

#### Límites a Probar:
- ⚠️ Múltiples usuarios creando órdenes simultáneamente
- ⚠️ Múltiples ventas simultáneas desde diferentes sucursales
- ⚠️ Múltiples actualizaciones de stock simultáneas
- ⚠️ Generación de números de venta simultáneos
- ⚠️ Búsqueda de productos simultánea

---

## 🧪 PLAN DE PRUEBAS COMPLETO

### Prueba 1: Autenticación
- [ ] Login con usuario normal
- [ ] Login con sucursal
- [ ] Logout
- [ ] Sesión persistente
- [ ] Redirección si no autenticado

### Prueba 2: Crear Orden
- [ ] Buscar cliente existente
- [ ] Crear cliente nuevo
- [ ] Seleccionar dispositivo
- [ ] Completar checklist
- [ ] Agregar servicios
- [ ] Guardar orden
- [ ] Verificar que se creó correctamente

### Prueba 3: Editar Orden
- [ ] Abrir orden existente
- [ ] Modificar campos
- [ ] Cambiar estado
- [ ] Agregar nota
- [ ] Guardar cambios
- [ ] Verificar que se actualizó

### Prueba 4: POS - Escaneo
- [ ] Escanear producto con código de barras
- [ ] Verificar que se agrega al carrito
- [ ] Escanear mismo producto (debe incrementar cantidad)
- [ ] Escanear producto sin stock (debe mostrar error)
- [ ] Finalizar venta
- [ ] Verificar que stock se actualizó

### Prueba 5: POS - Búsqueda Manual
- [ ] Buscar producto por nombre
- [ ] Buscar producto por código
- [ ] Agregar producto desde resultados
- [ ] Buscar producto inexistente
- [ ] Finalizar venta

### Prueba 6: Productos/Stock
- [ ] Crear producto sin código de barras
- [ ] Crear producto con código de barras
- [ ] Crear producto duplicado (mismo código) - debe fallar
- [ ] Editar producto
- [ ] Agregar stock
- [ ] Verificar movimientos de inventario

### Prueba 7: Concurrencia
- [ ] 3 usuarios creando órdenes simultáneamente
- [ ] 3 sucursales haciendo ventas simultáneamente
- [ ] Múltiples actualizaciones de stock simultáneas
- [ ] Verificar que no hay conflictos

### Prueba 8: Permisos
- [ ] Admin puede ver todo
- [ ] Técnico solo ve sus órdenes
- [ ] Encargado ve órdenes de su sucursal
- [ ] Sucursal puede crear órdenes
- [ ] Verificar RLS en todas las tablas

---

## 🔍 CHECKLIST DE VERIFICACIÓN FINAL

### Base de Datos
- [ ] Todas las tablas creadas
- [ ] Todos los índices creados
- [ ] Todos los triggers funcionan
- [ ] Todas las políticas RLS sin recursión
- [ ] Todas las vistas funcionan

### Frontend
- [ ] Todas las páginas cargan
- [ ] Todos los formularios validan
- [ ] Todos los botones funcionan
- [ ] Manejo de errores en todos los componentes
- [ ] Loading states en todas las operaciones

### Integración
- [ ] Escaneo global funciona
- [ ] Búsqueda manual funciona
- [ ] Stock se actualiza correctamente
- [ ] Ventas se registran correctamente
- [ ] Métricas se calculan correctamente

---

## 📝 NOTAS IMPORTANTES

1. **Código de barras opcional**: Los productos pueden no tener código de barras
2. **Búsqueda manual**: El POS permite buscar por nombre o código
3. **Escaneo global**: Funciona desde cualquier pantalla
4. **RLS sin recursión**: Todas las políticas evitan consultar su propia tabla
5. **Triggers automáticos**: Stock se actualiza automáticamente

---

**Última actualización**: 2026-01-28
