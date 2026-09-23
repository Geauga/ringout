@rem start.cmd
@rem Request: Launch the PIN-protected RINGOUT package on Windows natively.
@echo off
cd /d "%~dp0"
set "RINGOUT_NODE=node"
if exist node.exe set "RINGOUT_NODE=%~dp0node.exe"
"%RINGOUT_NODE%" -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1);require('node:sqlite')"
if errorlevel 1 (
  echo Error: Node.js 24 or newer is required. Use the portable Windows package or install Node.js 24+.
  pause
  exit /b 1
)
"%RINGOUT_NODE%" scripts\setup-pin.mjs
if errorlevel 1 (pause & exit /b 1)
echo Your PIN is saved in .private\access-pin.txt.
echo Open http://127.0.0.1:4173 after the ready message below.
"%RINGOUT_NODE%" server.cjs
pause
@rem Purpose: Launch the protected game with bundled Node or an installed Node 24+ fallback.
@rem Upstream: setup-pin.mjs configures access; server.cjs serves the authenticated game. Environment: Windows cmd.
@rem Updated: 2026-09-23 America/New_York. Lines 5-16 select and validate the runtime before setup/server startup.
