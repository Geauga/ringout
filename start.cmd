@rem start.cmd
@rem Request: Launch the PIN-protected RINGOUT package on Windows.
@echo off
cd /d "%~dp0"
where node
if errorlevel 1 (
  echo Install Node.js 24 or newer from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
node scripts\setup-pin.mjs
if errorlevel 1 (pause & exit /b 1)
echo Your PIN is saved in .private\access-pin.txt.
echo Open http://127.0.0.1:4173 after the ready message below.
node server.cjs
pause
@rem Purpose: Portable Windows launch. Upstream: setup script and built server. Environment: Windows with Node 24. Generated: 2026-09-15 America/New_York. New file, all lines.
