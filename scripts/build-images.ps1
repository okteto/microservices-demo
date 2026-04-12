#Requires -Version 5.1
<#
.SYNOPSIS
    Builds Docker images for vote, worker, and result (same contexts as CI).
.PARAMETER Tag
    Image tag (default: local-dev).
.PARAMETER RegistryPrefix
    Registry and path prefix without trailing slash, e.g. ghcr.io/myorg/microservices-demo
#>
param(
    [string]$Tag = "local-dev",
    [string]$RegistryPrefix = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Build-Image {
    param([string]$Name, [string]$Context)
    $image = if ($RegistryPrefix) { "${RegistryPrefix}/${Name}:${Tag}" } else { "${Name}:${Tag}" }
    Write-Host "==> docker build -t $image $Context" -ForegroundColor Cyan
    docker build -t $image $Context
}

Build-Image "vote" (Join-Path $Root "vote")
Build-Image "worker" (Join-Path $Root "worker")
Build-Image "result" (Join-Path $Root "result")

Write-Host "Done. Images tagged with :$Tag" -ForegroundColor Green
