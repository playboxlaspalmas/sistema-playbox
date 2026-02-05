# 🔧 Corrección Inmediata: Git Remote

## Problema Encontrado

Tu configuración de Git apunta a:
- ❌ `https://github.com/mimotocursor-lang/sistema-gestion-orden.git`

Pero debería apuntar a:
- ✅ `https://github.com/TU-USUARIO/sistema-playbox.git`

## Solución Rápida (Ejecuta en PowerShell)

### Paso 1: Ve a la carpeta del proyecto

```powershell
cd "C:\Users\Dell\Pictures\playbox-gestion\sistema-playbox"
```

### Paso 2: Elimina el remoto antiguo

```powershell
git remote remove origin
```

### Paso 3: Agrega el nuevo remoto

**Reemplaza `TU-USUARIO` con tu usuario de GitHub real:**

```powershell
git remote add origin https://github.com/TU-USUARIO/sistema-playbox.git
```

### Paso 4: Verifica que quedó correcto

```powershell
git remote -v
```

Debería mostrar:
```
origin  https://github.com/TU-USUARIO/sistema-playbox.git (fetch)
origin  https://github.com/TU-USUARIO/sistema-playbox.git (push)
```

### Paso 5: Crea el repositorio en GitHub (si no existe)

1. Ve a: https://github.com/new
2. **Repository name**: `sistema-playbox`
3. Selecciona **Private** o **Public**
4. **NO** marques ninguna opción (README, .gitignore, license)
5. Haz clic en **Create repository**

### Paso 6: Reinicia GitHub Desktop

1. **Cierra GitHub Desktop completamente**
2. **Abre GitHub Desktop nuevamente**
3. Ve a **File** → **Add Local Repository**
4. Selecciona la carpeta: `C:\Users\Dell\Pictures\playbox-gestion\sistema-playbox`
5. GitHub Desktop debería detectar el remoto correctamente ahora

## Solución Automática (Script)

También puedes ejecutar el script que creé:

```powershell
cd "C:\Users\Dell\Pictures\playbox-gestion\sistema-playbox"
.\fix-git-config.ps1
```

El script te pedirá tu usuario de GitHub y configurará todo automáticamente.

## Verificación Final

Después de corregir, verifica:

```powershell
# Verificar remoto
git remote -v

# Verificar nombre del proyecto
Get-Content package.json | Select-String "name"
```

Ambos deberían mostrar `sistema-playbox` y tu usuario de GitHub.

## Archivos Corregidos

- ✅ `package.json` - Nombre actualizado de `sistema-gestion-orden` a `sistema-playbox`
- ✅ Script `fix-git-config.ps1` creado para automatizar la corrección
