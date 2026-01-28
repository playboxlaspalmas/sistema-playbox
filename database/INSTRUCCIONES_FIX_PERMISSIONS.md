# 🔧 Solución: Error "Could not find the 'permissions' column"

## Problema

El error indica que la columna `permissions` no existe en la tabla `users` de la base de datos.

## ✅ Solución Rápida

### Paso 1: Ejecutar el Script SQL

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Abre el **SQL Editor**
3. Copia y pega el contenido del archivo:
   ```
   database/fix_add_permissions_column.sql
   ```
4. Haz clic en **"Run"** o presiona `Ctrl+Enter`

### Paso 2: Verificar

Después de ejecutar el script, verifica que la columna se agregó:

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'permissions';
```

Deberías ver:
```
column_name  | data_type
-------------|----------
permissions  | jsonb
```

### Paso 3: Probar la Funcionalidad

1. Recarga la aplicación
2. Intenta dar permisos a una sucursal nuevamente
3. El error debería desaparecer

---

## 📋 Qué Hace el Script

El script `fix_add_permissions_column.sql`:

1. ✅ Verifica si la columna `permissions` existe
2. ✅ Si no existe, la agrega como tipo `JSONB` con valor por defecto `{}`
3. ✅ Si ya existe, no hace nada (seguro de ejecutar múltiples veces)

---

## 🔍 Verificación Manual

Si quieres verificar manualmente si la columna existe:

```sql
-- Ver todas las columnas de la tabla users
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;
```

Si `permissions` no aparece en la lista, necesitas ejecutar el script.

---

## 🆘 Si el Error Persiste

### Verificar que el Script se Ejecutó Correctamente

1. Ejecuta el script nuevamente
2. Deberías ver un mensaje: "Columna permissions agregada exitosamente"
3. Si ves "La columna permissions ya existe", entonces está bien

### Verificar Permisos de RLS

Si la columna existe pero aún hay errores, verifica las políticas RLS:

```sql
-- Ver políticas RLS de la tabla users
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### Limpiar Cache de Supabase

A veces Supabase cachea el esquema. Intenta:

1. Esperar unos minutos
2. Recargar la página de la aplicación
3. Si persiste, contacta soporte de Supabase

---

## 📝 Estructura de Permissions

La columna `permissions` almacena un objeto JSONB con esta estructura:

```json
{
  "use_admin_panel": false,
  "use_statistics_panel": false,
  "modify_orders": true,
  "edit_product_stock": false,
  "delete_orders": true,
  "use_branch_panel": false,
  "view_all_business_orders": false,
  "edit_view_cost_price": true,
  "close_day": false
}
```

Cada permiso es opcional. Si no está definido, se usa el permiso por defecto según el rol del usuario.

---

## ✅ Checklist

- [ ] Script SQL ejecutado en Supabase
- [ ] Columna `permissions` verificada en la base de datos
- [ ] Aplicación recargada
- [ ] Funcionalidad de permisos probada
- [ ] Error desapareció

---

## 📚 Archivos Relacionados

- `database/fix_add_permissions_column.sql` - Script para agregar la columna
- `database/add_permissions.sql` - Script alternativo (mismo propósito)
- `src/types.ts` - Definición de `UserPermissions`
- `src/lib/permissions.ts` - Lógica de permisos
- `src/react/components/BranchPermissionsModal.tsx` - Componente que usa permissions
