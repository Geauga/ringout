# package.ps1
# Request: Build a downloadable PIN-protected game package without local secrets.
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stagePath = Join-Path $projectRoot ('.tmp/package-' + [Guid]::NewGuid().ToString('N'))
$releasePath = Join-Path $projectRoot 'release'
New-Item -ItemType Directory -Path $stagePath,$releasePath -Force | Out-Null
foreach ($name in @('server.cjs','start.cmd','README.md','SECURITY.md','.env.example','src/auth.mjs','scripts/setup-pin.mjs','scripts/local-db.mjs','dist/server/index.js','dist/server/package.json')) {
  $targetPath = Join-Path $stagePath $name
  New-Item -ItemType Directory -Path (Split-Path $targetPath) -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $targetPath
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'drizzle') -Destination (Join-Path $stagePath 'drizzle') -Recurse
$archivePath = Join-Path $releasePath 'RINGOUT-secure.zip'
Compress-Archive -Path (Join-Path $stagePath '*') -DestinationPath $archivePath -Force
Get-FileHash -LiteralPath $archivePath -Algorithm SHA256 | Format-List
Write-Output ('Package ready: ' + $archivePath)
# Purpose: Whitelisted release packaging. Upstream: tested server build and migrations. Environment: PowerShell 7 / Windows. Generated: 2026-09-15 America/New_York. New file, all lines.
