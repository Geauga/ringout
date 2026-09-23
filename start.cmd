@rem start.cmd
@rem Request: Launch the PIN-protected RINGOUT package on Windows natively.
@echo off
cd /d "%~dp0"
if not exist node.exe (
  echo Error: Portable node.exe not found.
  pause
  exit /b 1
)
.\node.exe scripts\setup-pin.mjs
if errorlevel 1 (pause & exit /b 1)
echo Your PIN is saved in .private\access-pin.txt.
echo Open http://127.0.0.1:4173 after the ready message below.
.\node.exe server.cjs
pause
