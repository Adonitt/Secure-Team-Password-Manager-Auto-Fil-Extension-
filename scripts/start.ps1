$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    docker compose up -d --build
    if ($LASTEXITCODE -ne 0) { throw 'Docker startup failed. Check that Docker Desktop is running.' }
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    npm run build -w extension
    if ($LASTEXITCODE -ne 0) { throw 'Extension build failed.' }
    Write-Host 'Web app: http://localhost:5174'
    Write-Host 'Chrome demo website: http://localhost:8083'
    Write-Host "Load unpacked extension from: $projectRoot\extension\dist"
} finally { Pop-Location }
