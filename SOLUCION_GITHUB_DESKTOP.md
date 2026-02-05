# 🔧 Solución: GitHub Desktop detecta repositorio de otro perfil

## Problema

GitHub Desktop muestra que estás agregando el repositorio `sistema-gestion-orden` de otro perfil de GitHub, pero tu carpeta se llama `sistema-playbox`.

## Causa

El problema es que hay referencias antiguas en la configuración de Git que apuntan a otro repositorio y usuario.

## Solución Rápida

### Opción 1: Usar el Script Automático (Recomendado)

1. Abre PowerShell en la carpeta `sistema-playbox`
2. Ejecuta:
   ```powershell
   .\fix-git-config.ps1
   ```
3. Ingresa tu usuario de GitHub cuando se solicite
4. Sigue las instrucciones que aparecen

### Opción 2: Solución Manual

#### Paso 1: Verificar configuración actual

Abre PowerShell en la carpeta `sistema-playbox` y ejecuta:

```powershell
git remote -v
```

Si muestra algo como `sistema-gestion-orden` o un usuario diferente, continúa con el paso 2.

#### Paso 2: Eliminar remoto antiguo

```powershell
git remote remove origin
```

#### Paso 3: Agregar nuevo remoto con tu usuario

Reemplaza `TU-USUARIO` con tu usuario de GitHub:

```powershell
git remote add origin https://github.com/TU-USUARIO/sistema-playbox.git
```

#### Paso 4: Verificar

```powershell
git remote -v
```

Debería mostrar:
```
origin  https://github.com/TU-USUARIO/sistema-playbox.git (fetch)
origin  https://github.com/TU-USUARIO/sistema-playbox.git (push)
```

#### Paso 5: Crear repositorio en GitHub (si no existe)

1. Ve a: https://github.com/new
2. Nombre del repositorio: `sistema-playbox`
3. Selecciona Privado o Público
4. **NO** inicialices con README, .gitignore o licencia
5. Haz clic en "Create repository"

#### Paso 6: Reiniciar GitHub Desktop

1. **Cierra GitHub Desktop completamente**
2. **Abre GitHub Desktop nuevamente**
3. Ve a **File** → **Add Local Repository**
4. Selecciona la carpeta `sistema-playbox`
5. GitHub Desktop debería detectar el remoto correctamente

## Verificar que todo está correcto

### En PowerShell:

```powershell
# Verificar remoto
git remote -v

# Verificar nombre del proyecto
cat package.json | Select-String "name"
```

Debería mostrar:
- Remoto: `https://github.com/TU-USUARIO/sistema-playbox.git`
- Nombre: `"sistema-playbox"`

### En GitHub Desktop:

1. Ve a **Repository** → **Repository Settings** → **Remote**
2. Debería mostrar: `https://github.com/TU-USUARIO/sistema-playbox.git`

## Si el problema persiste

### Limpiar completamente la configuración de Git:

```powershell
# Eliminar carpeta .git (CUIDADO: Esto elimina el historial local)
Remove-Item -Recurse -Force .git

# Reinicializar Git
git init

# Agregar todos los archivos
git add .

# Hacer commit inicial
git commit -m "Initial commit"

# Agregar remoto
git remote add origin https://github.com/TU-USUARIO/sistema-playbox.git

# Verificar
git remote -v
```

Luego en GitHub Desktop:
1. File → Add Local Repository
2. Selecciona la carpeta `sistema-playbox`
3. Debería funcionar correctamente

## Archivos Corregidos

- ✅ `package.json` - Nombre actualizado a `sistema-playbox`
- ✅ Script `fix-git-config.ps1` creado para automatizar la corrección

## Notas Importantes

- El nombre de la carpeta (`sistema-playbox`) y el nombre en `package.json` ahora coinciden
- Asegúrate de que el repositorio existe en GitHub antes de hacer push
- Si el repositorio no existe, créalo primero en GitHub antes de intentar hacer push
