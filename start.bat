@echo off
setlocal
cd /d "%~dp0"
title MemWault Starter

echo =========================================
echo       MemWault One-Click Starter
echo =========================================
echo.

echo [1/3] Verifying environment...
if not exist "%~dp0techstack\backend\venv" (
    echo Creating Python virtual environment...
    cd /d "%~dp0techstack\backend"
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    playwright install chromium
)

if not exist "%~dp0techstack\frontend\node_modules" (
    echo Installing Node dependencies...
    cd /d "%~dp0techstack\frontend"
    cmd /c npm install
)

echo.
echo [2/3] Starting Backend API on http://localhost:8000 ...
start "MemWault Backend API" /D "%~dp0techstack\backend" cmd /k "call venv\Scripts\activate && python -m uvicorn app.main:app --reload --port 8000"

echo.
echo [3/3] Starting Frontend UI on http://localhost:5173 ...
start "MemWault Frontend UI" /D "%~dp0techstack\frontend" cmd /k "npm run dev"

echo.
echo =========================================
echo  MemWault is now starting up!
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo =========================================
timeout /t 3 /nobreak >nul
start http://localhost:5173
exit /b 0
