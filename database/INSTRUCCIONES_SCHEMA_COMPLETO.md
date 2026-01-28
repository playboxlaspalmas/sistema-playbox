# 📋 Instrucciones para Recrear la Base de Datos Completa

## ⚠️ ADVERTENCIA IMPORTANTE

Este script **ELIMINARÁ TODAS LAS TABLAS EXISTENTES** y recreará la base de datos desde cero.

**⚠️ HAZ BACKUP DE TUS DATOS ANTES DE EJECUTAR SI TIENES INFORMACIÓN IMPORTANTE**

## 🎯 ¿Cuándo usar este script?

- ✅ Cuando es un sistema nuevo/clon y necesitas crear la base de datos desde cero
- ✅ Cuando quieres resetear completamente la base de datos
- ✅ Cuando necesitas asegurarte de que todas las tablas están creadas correctamente

## 📝 Contenido del Script

El script `schema_completo.sql` incluye:

### Sistemas Incluidos:
1. **Sistema de Reparaciones**
   - Tabla `orders` (órdenes de reparación)
   - Tabla `suppliers` (proveedores)
   - Tabla `salary_adjustments` (ajustes de sueldo)

2. **Sistema de Gestión de Órdenes**
   - Tabla `branches` (sucursales)
   - Tabla `customers` (clientes)
   - Tabla `services` (servicios)
   - Tabla `device_checklist_items` (checklist de dispositivos)
   - Tabla `work_orders` (órdenes de trabajo)
   - Tabla `order_services` (servicios por orden)
   - Tabla `order_notes` (notas de órdenes)

3. **Módulo de Ventas y Stock**
   - Tabla `productos` (productos/accesorios)
   - Tabla `ventas` (ventas realizadas)
   - Tabla `venta_items` (items de cada venta)
   - Tabla `inventario_movimientos` (movimientos de stock)

### También incluye:
- ✅ Todos los índices para optimización
- ✅ Todas las funciones (triggers, cálculos, etc.)
- ✅ Todos los triggers automáticos
- ✅ Row Level Security (RLS) completo
- ✅ Políticas de seguridad
- ✅ Vistas para reportes
- ✅ Datos iniciales (proveedores, servicios, checklists)

## 🚀 Pasos para Ejecutar

### Paso 1: Acceder a Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **SQL Editor** (menú lateral izquierdo)

### Paso 2: Ejecutar el Script

1. Abre el archivo `database/schema_completo.sql`
2. **IMPORTANTE**: Lee todo el script primero para entender qué hace
3. Copia TODO el contenido del archivo
4. Pégalo en el SQL Editor de Supabase
5. Haz clic en **RUN** (o presiona Ctrl+Enter)

### Paso 3: Verificar Instalación

Ejecuta esta consulta para verificar que todas las tablas se crearon:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Deberías ver estas tablas:
- branches
- customers
- device_checklist_items
- inventario_movimientos
- order_notes
- order_services
- orders
- productos
- salary_adjustments
- services
- suppliers
- users
- venta_items
- ventas
- work_orders

### Paso 4: Verificar Vistas

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Deberías ver:
- productos_mas_vendidos
- productos_stock_bajo
- ventas_del_dia

## 👤 Crear Usuarios

Después de ejecutar el script, necesitas crear usuarios:

### 1. Crear usuario en Authentication

1. Ve a **Authentication** → **Users** en Supabase
2. Haz click en **Add user** → **Create new user**
3. Ingresa email y contraseña
4. Copia el **User UID** que se genera

### 2. Insertar en tabla users

Ejecuta este SQL (reemplaza los valores):

```sql
INSERT INTO users (id, role, name, email) 
VALUES (
  'UUID-DEL-USUARIO-AQUI',  -- El User UID que copiaste
  'admin',                   -- o 'technician', 'encargado', 'recepcionista'
  'Nombre del Usuario',
  'email@ejemplo.com'
);
```

### Ejemplo para Admin:

```sql
INSERT INTO users (id, role, name, email) 
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- Reemplazar con UUID real
  'admin',
  'Administrador',
  'admin@ejemplo.com'
);
```

### Ejemplo para Técnico:

```sql
INSERT INTO users (id, role, name, email) 
VALUES (
  '123e4567-e89b-12d3-a456-426614174001',  -- Reemplazar con UUID real
  'technician',
  'Juan Pérez',
  'juan@ejemplo.com'
);
```

## 🏢 Crear Sucursales (Opcional)

Si necesitas crear sucursales:

```sql
INSERT INTO branches (name, address, phone, email, is_active) 
VALUES 
  ('Sucursal Centro', 'Calle Principal 123', '+56 9 1234 5678', 'centro@ejemplo.com', true),
  ('Sucursal Norte', 'Avenida Norte 456', '+56 9 8765 4321', 'norte@ejemplo.com', true)
ON CONFLICT (name) DO NOTHING;
```

## ✅ Verificación Final

Ejecuta estas consultas para verificar que todo funciona:

### Verificar usuarios:
```sql
SELECT id, name, email, role FROM users;
```

### Verificar sucursales:
```sql
SELECT id, name, is_active FROM branches;
```

### Verificar servicios:
```sql
SELECT name, default_price FROM services LIMIT 5;
```

### Verificar productos (debería estar vacío inicialmente):
```sql
SELECT COUNT(*) as total_productos FROM productos;
```

## 🔧 Solución de Problemas

### Error: "relation already exists"
- El script intenta eliminar todas las tablas primero
- Si alguna tabla no se puede eliminar, verifica dependencias
- Ejecuta manualmente: `DROP TABLE nombre_tabla CASCADE;`

### Error: "permission denied"
- Asegúrate de tener permisos de administrador en Supabase
- Verifica que estés usando el SQL Editor con permisos completos

### Error: "foreign key constraint"
- El script elimina las tablas en el orden correcto
- Si hay error, verifica que todas las tablas se eliminaron correctamente

### No se crean las vistas
- Las vistas dependen de las tablas
- Asegúrate de que todas las tablas se crearon primero
- Ejecuta manualmente la sección de vistas si es necesario

## 📚 Estructura Completa

```
Base de Datos
├── Sistema Reparaciones
│   ├── users
│   ├── suppliers
│   ├── orders
│   └── salary_adjustments
├── Sistema Gestión Órdenes
│   ├── branches
│   ├── customers
│   ├── services
│   ├── device_checklist_items
│   ├── work_orders
│   ├── order_services
│   └── order_notes
└── Módulo Ventas y Stock
    ├── productos
    ├── ventas
    ├── venta_items
    └── inventario_movimientos
```

## 🎉 ¡Listo!

Una vez ejecutado el script y creados los usuarios, el sistema está listo para usar.

**Próximos pasos:**
1. Configurar variables de entorno en el proyecto
2. Iniciar sesión con un usuario creado
3. Comenzar a usar el sistema

## 📞 Soporte

Si tienes problemas:
1. Verifica los logs en Supabase (Logs → Postgres Logs)
2. Revisa que todas las tablas se crearon
3. Verifica que los usuarios tienen los permisos correctos
4. Consulta la documentación del módulo: `MODULO_VENTAS_STOCK.md`
