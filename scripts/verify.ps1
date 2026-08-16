[CmdletBinding()]
param([switch]$SkipDockerConfig)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot

& "$repo\backend\.venv\Scripts\python.exe" -m ruff check "$repo\backend\app" "$repo\backend\tests"
& "$repo\backend\.venv\Scripts\python.exe" -m ruff format --check "$repo\backend\app" "$repo\backend\tests"
& "$repo\backend\.venv\Scripts\python.exe" -m pytest -q "$repo\backend\tests"
& "$repo\model\.venv\Scripts\python.exe" -m ruff check "$repo\model\atlas_model" "$repo\model\tests"
& "$repo\model\.venv\Scripts\python.exe" -m ruff format --check "$repo\model\atlas_model" "$repo\model\tests"
& "$repo\model\.venv\Scripts\python.exe" -m pytest -q "$repo\model\tests"

Push-Location "$repo\frontend"
try {
    npm.cmd run lint
    npm.cmd run test
    npm.cmd run test:security
    npm.cmd run build
} finally { Pop-Location }

if (-not $SkipDockerConfig -and (Get-Command docker -ErrorAction SilentlyContinue)) {
    docker compose -f "$repo\compose.yaml" config --quiet
    docker compose --env-file "$repo\.env.production.example" -f "$repo\compose.release.yaml" config --quiet
}

Write-Host "Atlas verification passed."
