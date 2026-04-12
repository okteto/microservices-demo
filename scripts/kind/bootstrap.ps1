#Requires -Version 5.1
<#
.SYNOPSIS
    Creates a local Kubernetes cluster using kind (Kubernetes in Docker).
.PARAMETER ClusterName
    kind cluster name (default: microservices-demo).
#>
param(
    [string]$ClusterName = "microservices-demo"
)

$ErrorActionPreference = "Stop"
$ConfigDir = $PSScriptRoot
$ConfigFile = Join-Path $ConfigDir "kind-config.yaml"

if (-not (Get-Command kind -ErrorAction SilentlyContinue)) {
    Write-Error "kind is not installed. See https://kind.sigs.k8s.io/docs/user/quick-start/"
}

$existing = kind get clusters 2>$null | Where-Object { $_ -eq $ClusterName }
if ($existing) {
    Write-Host "Cluster '$ClusterName' already exists. Skipping create. Use: kind delete cluster --name $ClusterName" -ForegroundColor Yellow
} else {
    Write-Host "Creating kind cluster '$ClusterName'..." -ForegroundColor Cyan
    kind create cluster --name $ClusterName --config $ConfigFile
}

kubectl cluster-info --context "kind-$ClusterName"
Write-Host "Done. Context: kind-$ClusterName" -ForegroundColor Green
