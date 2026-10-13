param([string]$DatabasePassword = 'vault-local-only')
$ErrorActionPreference = 'Stop'
$backendRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'backend'
Push-Location $backendRoot
try {
    & .\mvnw.cmd -q '-DskipTests' package
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
    java -jar target/team-vault-1.0.0.jar '--spring.datasource.url=jdbc:postgresql://localhost:5433/vault' '--spring.datasource.username=vault' "--spring.datasource.password=$DatabasePassword"
} finally { Pop-Location }
