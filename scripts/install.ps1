[CmdletBinding()]
param([switch]$SkipModel)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw "Python 3.12+ is required." }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw "Node.js 22+ and npm are required." }

$pythonVersion = python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ([version]$pythonVersion -lt [version]"3.12") { throw "Python 3.12+ is required; found $pythonVersion." }

if (-not (Test-Path "$repo\backend\.venv")) { python -m venv "$repo\backend\.venv" }
& "$repo\backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
& "$repo\backend\.venv\Scripts\python.exe" -m pip install -e "$repo\backend[dev]"

if (-not $SkipModel) {
    if (-not (Test-Path "$repo\model\.venv")) { python -m venv "$repo\model\.venv" }
    & "$repo\model\.venv\Scripts\python.exe" -m pip install --upgrade pip
    & "$repo\model\.venv\Scripts\python.exe" -m pip install -e "$repo\model[dev]"
}

Push-Location "$repo\frontend"
try { npm.cmd ci } finally { Pop-Location }

Write-Host "Atlas dependencies installed. Run scripts/verify.ps1 next."
