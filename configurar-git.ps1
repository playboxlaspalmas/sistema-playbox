# Script para configurar Git y conectar con GitHub
# Ejecuta este script desde la carpeta sistema-gestion-orden

Write-Host "=== CONFIGURACIÓN DE GIT PARA GITHUB ===" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ ERROR: No se encontró package.json" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar este script desde la carpeta sistema-gestion-orden" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Directorio correcto encontrado" -ForegroundColor Green
Write-Host ""

# Verificar si Git está inicializado
if (Test-Path ".git") {
    Write-Host "✅ Git ya está inicializado" -ForegroundColor Green
} else {
    Write-Host "📦 Inicializando Git..." -ForegroundColor Cyan
    git init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Git inicializado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al inicializar Git" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Verificar remoto
Write-Host "🔍 Verificando remoto..." -ForegroundColor Cyan
$remote = git remote get-url origin 2>$null

if ($remote) {
    Write-Host "✅ Remoto configurado: $remote" -ForegroundColor Green
    Write-Host ""
    Write-Host "¿Quieres cambiar el remoto? (S/N)" -ForegroundColor Yellow
    $cambiar = Read-Host
    if ($cambiar -eq "S" -or $cambiar -eq "s") {
        Write-Host ""
        Write-Host "Ingresa la URL del repositorio de GitHub:" -ForegroundColor Cyan
        Write-Host "Ejemplo: https://github.com/tu-usuario/sistema-gestion-orden.git" -ForegroundColor Gray
        $nuevaUrl = Read-Host
        git remote set-url origin $nuevaUrl
        Write-Host "✅ Remoto actualizado" -ForegroundColor Green
    }
} else {
    Write-Host "❌ No hay remoto configurado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ingresa la URL del repositorio de GitHub:" -ForegroundColor Cyan
    Write-Host "Ejemplo: https://github.com/tu-usuario/sistema-gestion-orden.git" -ForegroundColor Gray
    $url = Read-Host
    git remote add origin $url
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Remoto agregado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al agregar remoto" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== VERIFICACIÓN ===" -ForegroundColor Cyan
git remote -v
Write-Host ""

# Verificar si hay cambios sin commit
$status = git status --porcelain
if ($status) {
    Write-Host "📝 Hay archivos sin commitear" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "¿Quieres hacer commit de todos los cambios? (S/N)" -ForegroundColor Yellow
    $commit = Read-Host
    if ($commit -eq "S" -or $commit -eq "s") {
        git add .
        Write-Host ""
        Write-Host "Ingresa el mensaje del commit:" -ForegroundColor Cyan
        Write-Host "(Presiona Enter para usar 'Initial commit')" -ForegroundColor Gray
        $mensaje = Read-Host
        if (-not $mensaje) {
            $mensaje = "Initial commit"
        }
        git commit -m $mensaje
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Commit realizado correctamente" -ForegroundColor Green
        }
    }
} else {
    Write-Host "✅ No hay cambios pendientes" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== CONFIGURACIÓN COMPLETA ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para hacer push a GitHub, ejecuta:" -ForegroundColor Yellow
Write-Host "  git branch -M main" -ForegroundColor White
Write-Host "  git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "¿Quieres hacer push ahora? (S/N)" -ForegroundColor Yellow
$push = Read-Host
if ($push -eq "S" -or $push -eq "s") {
    git branch -M main
    git push -u origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Push realizado correctamente!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Error al hacer push. Verifica:" -ForegroundColor Red
        Write-Host "   - Que el repositorio exista en GitHub" -ForegroundColor Yellow
        Write-Host "   - Que tengas acceso al repositorio" -ForegroundColor Yellow
        Write-Host "   - Que tengas autenticación configurada" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== FIN ===" -ForegroundColor Cyan
