@rem start.cmd
@rem Request: Launch the RINGOUT game natively.
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
echo Open http://127.0.0.1:4173 after the ready message below.
"%RINGOUT_NODE%" server.cjs
pause

@rem Purpose: Launch the local game using bundled or installed Node 24+.
@rem Upstream: server.cjs serves the built Worker and SQLite map library.
@rem Environment: Windows cmd / Node 24+. Updated: 2026-10-04 America/New_York.
@rem Changes: line 1 removes the UTF-8 BOM so cmd recognizes the initial filename comment.
