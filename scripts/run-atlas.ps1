[CmdletBinding()]
param(
    [switch]$Development,
    [switch]$InstallDependencies
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot

if (-not $Development) {
    $packagedCandidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\Atlas\Atlas.exe"),
        (Join-Path $repo "frontend\release\win-unpacked\Atlas.exe")
    )
    $packaged = $packagedCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($packaged) {
        $oldElectronMode = $env:ELECTRON_RUN_AS_NODE
        try {
            $env:ELECTRON_RUN_AS_NODE = $null
            Start-Process -FilePath $packaged
        } finally {
            $env:ELECTRON_RUN_AS_NODE = $oldElectronMode
        }
        Write-Host "Atlas started: $packaged"
        return
    }
}

if ($InstallDependencies) {
    & "$PSScriptRoot\install.ps1"
}

if (-not (Test-Path -LiteralPath "$repo\frontend\node_modules")) {
    throw "Frontend dependencies are missing. Run scripts/install.ps1 or use -InstallDependencies."
}
if (-not (Test-Path -LiteralPath "$repo\model\.venv\Scripts\python.exe")) {
    throw "Atlas Native is not installed. Run scripts/install.ps1 or use -InstallDependencies."
}

Push-Location "$repo\frontend"
try { npm.cmd run desktop:dev } finally { Pop-Location }
