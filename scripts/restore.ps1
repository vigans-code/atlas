[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$BackupFile,
    [switch]$ConfirmRestore
)

$ErrorActionPreference = "Stop"
if (-not $ConfirmRestore) { throw "Restore replaces database contents. Re-run with -ConfirmRestore." }
$repo = Split-Path -Parent $PSScriptRoot
$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
if ([System.IO.Path]::GetExtension($resolvedBackup) -ne ".sql") { throw "Backup must be a .sql file." }

Get-Content -Raw -LiteralPath $resolvedBackup | docker compose -f "$repo\compose.release.yaml" exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
if ($LASTEXITCODE -ne 0) { throw "Database restore failed." }
Write-Host "Database restored from: $resolvedBackup"
