# Script para verificar y crear repositorio en GitHub
Write-Host "=== VERIFICACIÓN DE REPOSITORIO GITHUB ===" -ForegroundColor Cyan
Write-Host ""

# Verificar remoto actual
Write-Host "📋 Remoto configurado:" -ForegroundColor Yellow
if (Test-Path ".git\config") {
    $config = Get-Content ".git\config" -Raw
    if ($config -match 'url = (https://github\.com/[^/]+/[^/]+\.git)') {
        $remoto = $matches[1]
        Write-Host "   $remoto" -ForegroundColor White
        Write-Host ""
        
        # Extraer usuario y repositorio
        if ($remoto -match 'https://github\.com/([^/]+)/([^/]+)\.git') {
            $usuario = $matches[1]
            $repo = $matches[2]
            
            Write-Host "👤 Usuario: $usuario" -ForegroundColor Cyan
            Write-Host "📦 Repositorio: $repo" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "🔗 URL del repositorio:" -ForegroundColor Yellow
            Write-Host "   https://github.com/$usuario/$repo" -ForegroundColor White
            Write-Host ""
            Write-Host "=== INSTRUCCIONES ===" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "1. Abre esta URL en tu navegador:" -ForegroundColor Yellow
            Write-Host "   https://github.com/$usuario/$repo" -ForegroundColor White
            Write-Host ""
            Write-Host "2. Si ves '404 - Not Found':" -ForegroundColor Red
            Write-Host "   → El repositorio NO existe, necesitas crearlo" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "3. Si el repositorio existe pero no tienes acceso:" -ForegroundColor Red
            Write-Host "   → Verifica que tengas permisos de escritura" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "4. Para CREAR el repositorio:" -ForegroundColor Green
            Write-Host "   a) Ve a: https://github.com/new" -ForegroundColor White
            Write-Host "   b) Nombre: $repo" -ForegroundColor White
            Write-Host "   c) NO marques README, .gitignore ni license" -ForegroundColor White
            Write-Host "   d) Crea el repositorio" -ForegroundColor White
            Write-Host ""
        }
    } else {
        Write-Host "   ❌ No se encontró remoto configurado" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Git no está inicializado" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== DESPUÉS DE CREAR EL REPOSITORIO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta estos comandos:" -ForegroundColor Yellow
Write-Host "   git branch -M main" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host ""
