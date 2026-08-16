[CmdletBinding()]
param([switch]$SkipSmokeTest)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$modelRoot = Join-Path $repo "model"
$python = Join-Path $modelRoot ".venv\Scripts\python.exe"
$checkpoint = Join-Path $modelRoot "checkpoints\atlas-v0.pt"
$distRoot = Join-Path $modelRoot "dist"
$runtimeRoot = Join-Path $distRoot "atlas-model"
$workRoot = Join-Path $modelRoot "build\pyinstaller"

if (-not (Test-Path -LiteralPath $python)) {
    throw "Atlas model environment is missing. Run scripts/install.ps1 first."
}
if (-not (Test-Path -LiteralPath $checkpoint)) {
    throw "Atlas checkpoint is missing: $checkpoint"
}

& $python -m pip install -e "$modelRoot[package]"
if ($LASTEXITCODE -ne 0) { throw "Could not install the model packager." }

& $python -m PyInstaller `
    --noconfirm `
    --clean `
    --onedir `
    --noconsole `
    --name atlas-model `
    --distpath $distRoot `
    --workpath $workRoot `
    --specpath $workRoot `
    --paths $modelRoot `
    (Join-Path $modelRoot "atlas_model\standalone.py")
if ($LASTEXITCODE -ne 0) { throw "Atlas Native runtime packaging failed." }

$executable = Join-Path $runtimeRoot "atlas-model.exe"
if (-not (Test-Path -LiteralPath $executable)) {
    throw "Packaged Atlas Native executable was not created."
}

if (-not $SkipSmokeTest) {
    $portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $portProbe.Start()
    $smokePort = ([System.Net.IPEndPoint]$portProbe.LocalEndpoint).Port
    $portProbe.Stop()
    $oldCheckpoint = $env:ATLAS_MODEL_CHECKPOINT
    $oldPort = $env:ATLAS_MODEL_PORT
    $oldErrorLog = $env:ATLAS_MODEL_ERROR_LOG
    $process = $null
    try {
        $env:ATLAS_MODEL_CHECKPOINT = $checkpoint
        $env:ATLAS_MODEL_PORT = "$smokePort"
        $errorLog = Join-Path $env:TEMP "atlas-model-smoke-$([guid]::NewGuid()).log"
        $env:ATLAS_MODEL_ERROR_LOG = $errorLog
        $process = Start-Process -FilePath $executable -WindowStyle Hidden -PassThru
        $deadline = (Get-Date).AddSeconds(120)
        $ready = $false
        do {
            Start-Sleep -Milliseconds 500
            try {
                $health = Invoke-RestMethod -Uri "http://127.0.0.1:$smokePort/v1/health" -TimeoutSec 2
                $ready = $health.status -eq "ready"
            } catch {
                $ready = $false
            }
        } while (-not $ready -and -not $process.HasExited -and (Get-Date) -lt $deadline)
        if (-not $ready) {
            $detail = if (Test-Path -LiteralPath $errorLog) { Get-Content -LiteralPath $errorLog -Raw } else { "No runtime error log was produced." }
            throw "Packaged Atlas Native runtime failed its health check.`n$detail"
        }
    } finally {
        if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
        $env:ATLAS_MODEL_CHECKPOINT = $oldCheckpoint
        $env:ATLAS_MODEL_PORT = $oldPort
        $env:ATLAS_MODEL_ERROR_LOG = $oldErrorLog
        if ($errorLog -and (Test-Path -LiteralPath $errorLog)) { Remove-Item -LiteralPath $errorLog }
    }
}

$size = (Get-ChildItem -LiteralPath $runtimeRoot -Recurse -File | Measure-Object Length -Sum).Sum
Write-Host "Standalone Atlas Native runtime ready: $runtimeRoot ($([math]::Round($size / 1MB, 1)) MB)"
