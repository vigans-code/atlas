[CmdletBinding()]
param([string]$OutputDirectory = "")

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $repo "backups" }
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $resolvedOutput "atlas-postgres-$stamp.sql"

docker compose -f "$repo\compose.release.yaml" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' | Set-Content -Encoding utf8 $target
if ($LASTEXITCODE -ne 0) { throw "Database backup failed." }
(Get-FileHash -Algorithm SHA256 $target).Hash.ToLowerInvariant() + "  " + (Split-Path -Leaf $target) | Set-Content "$target.sha256"
Write-Host "Backup created: $target"
