#Requires -Version 5.1
<#
.SYNOPSIS
    Runs the same tests as ci-app locally (Maven, Go, Node).
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==> vote: mvn verify" -ForegroundColor Cyan
Push-Location (Join-Path $Root "vote")
try {
    mvn -B verify
} finally {
    Pop-Location
}

Write-Host "==> worker: go vet && go test" -ForegroundColor Cyan
Push-Location (Join-Path $Root "worker")
try {
    go vet ./...
    go test ./...
} finally {
    Pop-Location
}

Write-Host "==> result: npm ci && npm test" -ForegroundColor Cyan
Push-Location (Join-Path $Root "result")
try {
    npm ci
    npm test
} finally {
    Pop-Location
}

Write-Host "All tests passed." -ForegroundColor Green
