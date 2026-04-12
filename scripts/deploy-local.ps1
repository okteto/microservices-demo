#Requires -Version 5.1
<#
.SYNOPSIS
    Deploys Helm charts to the current kubectl context using images from GHCR (or any registry).
.DESCRIPTION
    Order: infrastructure -> vote -> result -> worker (same as okteto.yml).
    Disables Ingress on vote/result for local port-forward workflows (unless -IngressEnabled).
.PARAMETER ImageTag
    Image tag shared by all three services (e.g. full Git SHA from GitHub Actions).
.PARAMETER ImagePrefix
    Registry prefix without service name, lowercase, e.g. ghcr.io/myorg/microservices-demo
.PARAMETER Namespace
    Kubernetes namespace (default: default).
.PARAMETER IngressEnabled
    If set, keeps Ingress on vote/result (Okteto-style). Default: off for kind + port-forward.
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$ImageTag,
    [Parameter(Mandatory = $true)]
    [string]$ImagePrefix,
    [string]$Namespace = "default",
    [switch]$IngressEnabled
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$voteImage = "${ImagePrefix}/vote:${ImageTag}"
$workerImage = "${ImagePrefix}/worker:${ImageTag}"
$resultImage = "${ImagePrefix}/result:${ImageTag}"

Write-Host "Deploying with:" -ForegroundColor Cyan
Write-Host "  vote:   $voteImage"
Write-Host "  worker: $workerImage"
Write-Host "  result: $resultImage"
Write-Host "  namespace: $Namespace"

$nsArgs = @()
if ($Namespace -ne "default") {
    $nsArgs = @("-n", $Namespace, "--create-namespace")
}

$ingressVal = if ($IngressEnabled) { "true" } else { "false" }

function Invoke-HelmUpgrade {
    param(
        [string]$Release,
        [string]$ChartPath,
        [hashtable]$Sets
    )
    $helmLine = @("upgrade", "--install", $Release, $ChartPath, "--wait", "--timeout", "15m") + $nsArgs
    foreach ($key in $Sets.Keys) {
        $helmLine += @("--set", "$key=$($Sets[$key])")
    }
    Write-Host "==> helm $($helmLine -join ' ')" -ForegroundColor Cyan
    & helm @helmLine
}

Invoke-HelmUpgrade -Release "infrastructure" -ChartPath (Join-Path $Root "infrastructure") -Sets @{}

Invoke-HelmUpgrade -Release "vote" -ChartPath (Join-Path $Root "vote\chart") -Sets @{
    "image"             = $voteImage
    "ingress.enabled"   = $ingressVal
}

Invoke-HelmUpgrade -Release "result" -ChartPath (Join-Path $Root "result\chart") -Sets @{
    "image"             = $resultImage
    "ingress.enabled"   = $ingressVal
}

Invoke-HelmUpgrade -Release "worker" -ChartPath (Join-Path $Root "worker\chart") -Sets @{
    "image" = $workerImage
}

Write-Host ""
Write-Host "Deployment finished. Check pods: kubectl get pods $(if ($Namespace -ne 'default') { "-n $Namespace" })" -ForegroundColor Green
Write-Host "Port-forward examples (when Ingress is off):" -ForegroundColor Green
Write-Host "  kubectl $(if ($Namespace -ne 'default') { "-n $Namespace " })port-forward svc/vote 8080:8080"
Write-Host "  kubectl $(if ($Namespace -ne 'default') { "-n $Namespace " })port-forward svc/result 8081:80"
