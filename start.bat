@echo off
title Ajan Simit
echo.
echo  ╔══════════════════════════════════╗
echo  ║      Ajan Simit            ║
echo  ║  Backend  : http://localhost:3001 ║
echo  ║  Frontend : http://localhost:5173 ║
echo  ╚══════════════════════════════════╝
echo.

start "Ajan Simit - Backend" cmd /k "cd /d d:\102-Codex\AjanSimit\apps\backend && npx tsx src/index.ts"

timeout /t 2 /nobreak >nul

start "Ajan Simit - Frontend" cmd /k "cd /d d:\102-Codex\AjanSimit\apps\frontend && npm run dev"

timeout /t 3 /nobreak >nul

start "" http://localhost:5173
