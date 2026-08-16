[CmdletBinding()]
param([switch]$BuildWindowsInstaller)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$version = (Get-Content "$repo\VERSION" -Raw).Trim()
& "$PSScriptRoot\verify.ps1"

if ($BuildWindowsInstaller) {
    Push-Location "$repo\frontend"
    try { npm.cmd run desktop:package } finally { Pop-Location }
}

$releaseDir = Join-Path $repo "release"
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
$archive = Join-Path $releaseDir "atlas-$version-source.zip"
if (Test-Path $archive) { Remove-Item -LiteralPath $archive }
$manifest = Join-Path ([System.IO.Path]::GetTempPath()) "atlas-release-$([guid]::NewGuid()).txt"
try {
    git -C $repo ls-files -co --exclude-standard |
        Where-Object { Test-Path -LiteralPath (Join-Path $repo $_) } |
        Set-Content -Encoding ascii $manifest
    Push-Location $repo
    try { tar.exe -a -c -f $archive -T $manifest } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw "Source archive creation failed." }
} finally {
    if (Test-Path -LiteralPath $manifest) { Remove-Item -LiteralPath $manifest }
}
(Get-FileHash -Algorithm SHA256 $archive).Hash.ToLowerInvariant() + "  " + (Split-Path -Leaf $archive) | Set-Content "$archive.sha256"
Write-Host "Release archive created: $archive"
