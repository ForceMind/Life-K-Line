@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo       Life K-Line One-Click Start
echo ==========================================

echo.
echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Building Frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Error building frontend!
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Starting Server...
echo.
echo Server is running!
echo - Main App: http://localhost:3000
echo - Admin Panel: http://localhost:3000/admin
echo.
echo Press Ctrl+C to stop the server.
echo.

node server/index.js
pause
