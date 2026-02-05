# Script para corregir la configuración de Git
# Ejecuta este script desde la carpeta sistema-playbox

Write-Host "=== CORRECCIÓN DE CONFIGURACIÓN GIT ===" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la carpeta correcta
$carpetaActual = Split-Path -Leaf (Get-Location)
if ($carpetaActual -ne "sistema-playbox") {
    Write-Host "❌ Error: Este script debe ejecutarse desde la carpeta sistema-playbox" -ForegroundColor Red
    Write-Host "   Carpeta actual: $carpetaActual" -ForegroundColor Yellow
    Write-Host "   Ejecuta: cd sistema-playbox" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Carpeta correcta: sistema-playbox" -ForegroundColor Green
Write-Host ""

# Verificar si existe .git
if (-not (Test-Path ".git")) {
    Write-Host "⚠️  No existe carpeta .git - Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Repositorio Git inicializado" -ForegroundColor Green
    Write-Host ""
}

# Verificar configuración actual del remoto
Write-Host "📋 Configuración actual del remoto:" -ForegroundColor Cyan
git remote -v
Write-Host ""

# Preguntar al usuario por su usuario de GitHub
Write-Host "Por favor, ingresa tu usuario de GitHub:" -ForegroundColor Yellow
$usuarioGitHub = Read-Host "Usuario"

if ([string]::IsNullOrWhiteSpace($usuarioGitHub)) {
    Write-Host "❌ No se ingresó un usuario. Saliendo..." -ForegroundColor Red
    exit 1
}

# Configurar el remoto correcto
$nuevoRemoto = "https://github.com/$usuarioGitHub/sistema-playbox.git"

Write-Host ""
Write-Host "🔧 Configurando remoto..." -ForegroundColor Cyan
Write-Host "   Nuevo remoto: $nuevoRemoto" -ForegroundColor White

# Eliminar remoto antiguo si existe
$remotos = git remote
if ($remotos -contains "origin") {
    Write-Host "   Eliminando remoto 'origin' antiguo..." -ForegroundColor Yellow
    git remote remove origin
}

# Agregar nuevo remoto
git remote add origin $nuevoRemoto

Write-Host "✅ Remoto configurado correctamente" -ForegroundColor Green
Write-Host ""

# Verificar configuración
Write-Host "📋 Nueva configuración del remoto:" -ForegroundColor Cyan
git remote -v
Write-Host ""

# Configurar nombre del repositorio en Git
Write-Host "🔧 Configurando nombre del repositorio local..." -ForegroundColor Cyan
git config --local user.name "$usuarioGitHub" 2>$null
Write-Host "✅ Configuración actualizada" -ForegroundColor Green
Write-Host ""

Write-Host "=== INSTRUCCIONES SIGUIENTES ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Crea el repositorio en GitHub (si no existe):" -ForegroundColor Yellow
Write-Host "   https://github.com/new" -ForegroundColor White
Write-Host "   Nombre: sistema-playbox" -ForegroundColor White
Write-Host ""
Write-Host "2. Reinicia GitHub Desktop completamente" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. En GitHub Desktop:" -ForegroundColor Yellow
Write-Host "   - File → Add Local Repository" -ForegroundColor White
Write-Host "   - Selecciona la carpeta: sistema-playbox" -ForegroundColor White
Write-Host "   - Debería detectar el remoto correctamente" -ForegroundColor White
Write-Host ""
Write-Host "4. Si aún hay problemas, ejecuta:" -ForegroundColor Yellow
Write-Host "   git remote set-url origin $nuevoRemoto" -ForegroundColor White
Write-Host ""
