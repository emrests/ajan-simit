@echo off
title Ajan Simit - Durduruluyor
echo.
echo  Ajan Simit durduruluyor...
echo.

echo  [Backend] Port 3001 kapatiliyor...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo  [Frontend] Port 5173 kapatiliyor...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo  Tum servisler durduruldu.
echo  Yeniden baslatmak icin start.bat calistirin.
echo.
timeout /t 3 /nobreak >nul
