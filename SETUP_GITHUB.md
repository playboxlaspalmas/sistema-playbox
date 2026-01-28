# 🚀 Configurar Repositorio en GitHub

Este error ocurre porque el repositorio Git no está inicializado o el remoto no está configurado correctamente.

## Opción 1: Crear Nuevo Repositorio en GitHub (Recomendado)

### Paso 1: Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com) e inicia sesión
2. Haz clic en el botón **"+"** (arriba a la derecha) → **"New repository"**
3. Configura el repositorio:
   - **Repository name**: `sistema-gestion-orden`
   - **Description**: "Sistema de gestión de órdenes de servicio técnico"
   - **Visibility**: Private (recomendado) o Public
   - ⚠️ **NO marques** "Add a README file"
   - ⚠️ **NO marques** "Add .gitignore"
   - ⚠️ **NO marques** "Choose a license"
4. Haz clic en **"Create repository"**
5. **Copia la URL** del repositorio (ej: `https://github.com/tu-usuario/sistema-gestion-orden.git`)

### Paso 2: Inicializar Git Localmente

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
cd sistema-gestion-orden

# Inicializar Git
git init

# Agregar todos los archivos
git add .

# Primer commit
git commit -m "Initial commit: Sistema de gestión de órdenes"

# Cambiar branch a main
git branch -M main

# Agregar remoto (reemplaza con tu URL)
git remote add origin https://github.com/tu-usuario/sistema-gestion-orden.git

# Verificar remoto
git remote -v

# Hacer push
git push -u origin main
```

Si te pide autenticación, usa un **Personal Access Token** de GitHub.

---

## Opción 2: Si el Repositorio Ya Existe

Si ya creaste el repositorio en GitHub pero el remoto no está configurado:

```powershell
cd sistema-gestion-orden

# Verificar si Git está inicializado
git status

# Si no está inicializado:
git init
git add .
git commit -m "Initial commit"

# Agregar remoto (reemplaza con tu URL)
git remote add origin https://github.com/tu-usuario/sistema-gestion-orden.git

# O si ya existe pero está mal:
git remote set-url origin https://github.com/tu-usuario/sistema-gestion-orden.git

# Verificar
git remote -v

# Hacer push
git branch -M main
git push -u origin main
```

---

## Opción 3: Si el Repositorio Fue Renombrado o Eliminado

Si el repositorio fue renombrado en GitHub:

```powershell
cd sistema-gestion-orden

# Ver remoto actual
git remote -v

# Actualizar URL del remoto
git remote set-url origin https://github.com/tu-usuario/nuevo-nombre.git

# Verificar
git remote -v

# Hacer push
git push -u origin main
```

Si el repositorio fue eliminado, sigue la **Opción 1** para crear uno nuevo.

---

## Solución de Problemas

### Error: "repository does not exist"

**Causas posibles:**
1. El repositorio no existe en GitHub
2. El nombre del repositorio está mal escrito
3. No tienes acceso al repositorio
4. El repositorio fue eliminado o renombrado

**Solución:**
- Verifica que el repositorio exista en GitHub
- Verifica que tengas acceso (si es privado)
- Verifica que la URL sea correcta: `git remote -v`

### Error: "authentication failed"

**Solución:**
1. Ve a GitHub → Settings → Developer settings → Personal access tokens
2. Crea un nuevo token con permisos `repo`
3. Usa el token como contraseña cuando Git te lo pida

### Error: "fatal: not a git repository"

**Solución:**
```powershell
cd sistema-gestion-orden
git init
```

### Error: "remote origin already exists"

**Solución:**
```powershell
# Ver remoto actual
git remote -v

# Eliminar remoto existente
git remote remove origin

# Agregar nuevo remoto
git remote add origin https://github.com/tu-usuario/sistema-gestion-orden.git
```

---

## Verificar Configuración

Después de configurar, verifica:

```powershell
cd sistema-gestion-orden

# Ver remoto
git remote -v

# Debería mostrar:
# origin  https://github.com/tu-usuario/sistema-gestion-orden.git (fetch)
# origin  https://github.com/tu-usuario/sistema-gestion-orden.git (push)

# Ver estado
git status

# Ver branches
git branch
```

---

## Comandos Rápidos

```powershell
# Inicializar y configurar todo de una vez
cd sistema-gestion-orden
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/sistema-gestion-orden.git
git push -u origin main
```

---

## Próximos Pasos

Una vez configurado el repositorio:

1. ✅ El código estará en GitHub
2. ✅ Puedes conectar con Vercel para deploy automático
3. ✅ Cada `git push` actualizará el repositorio

**Ver guía de deploy:** [DEPLOY.md](./DEPLOY.md)
