#Requires -Version 5.1
<#
.SYNOPSIS
    Runs helm lint and helm template checks (same as ci-infra).
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$charts = @(
    "infrastructure",
    "vote/chart",
    "worker/chart",
    "result/chart"
)

foreach ($d in $charts) {
    $path = Join-Path $Root $d
    Write-Host "==> helm lint $d" -ForegroundColor Cyan
    helm lint $path
}

helm template test-infra (Join-Path $Root "infrastructure") | Out-Null
helm template test-vote (Join-Path $Root "vote/chart") --set image=example.local/vote:test | Out-Null
helm template test-worker (Join-Path $Root "worker/chart") --set image=example.local/worker:test | Out-Null
helm template test-result (Join-Path $Root "result/chart") --set image=example.local/result:test | Out-Null

Write-Host "Helm lint and template checks passed." -ForegroundColor Green
