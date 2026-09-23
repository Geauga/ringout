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
Write-Output "Downloading portable Node.js runtime..."
$runtimePath = Join-Path $stagePath 'node.exe'
Invoke-WebRequest -Uri 'https://nodejs.org/dist/v24.21.0/win-x64/node.exe' -OutFile $runtimePath
# Official v24.21.0 SHASUMS256.txt entry for win-x64/node.exe.
$runtimeHash = 'BA4E6D110E8C1592A1ECD390F6B05F3DA124B13871A5BE62B341A07A853C6C32'
if ((Get-FileHash -LiteralPath $runtimePath -Algorithm SHA256).Hash -ne $runtimeHash) { throw 'Portable Node.js checksum mismatch.' }
& $runtimePath -e "require('node:sqlite'); console.log('Portable runtime ready:', process.version)"
if ($LASTEXITCODE -ne 0) { throw 'Portable Node.js cannot load SQLite.' }
$archivePath = Join-Path $releasePath 'RINGOUT-secure.zip'
Compress-Archive -Path (Join-Path $stagePath '*') -DestinationPath $archivePath -Force
Get-FileHash -LiteralPath $archivePath -Algorithm SHA256 | Format-List
Write-Output ('Package ready: ' + $archivePath)
# Purpose: Whitelisted release packaging. Upstream: tested server build and migrations. Environment: PowerShell 7 / Windows. Generated: 2026-09-15 America/New_York. New file, all lines.
# Updated: 2026-09-23 America/New_York. Lines 15-21 pin Node 24.21.0, check its official SHA256 and load SQLite before archiving. Purpose: ship a compatible portable runtime; upstream: protected build and nodejs.org release; environment: Windows x64 / PowerShell.
