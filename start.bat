@echo off
setlocal
cd /d "%~dp0"
title MemWault Starter

echo =========================================
echo       MemWault One-Click Starter
echo =========================================
echo.

REM Ensure icon & desktop shortcut exist
if not exist "%~dp0memwault.ico" (
    if exist "%~dp0memwault logo.png" (
        if exist "%~dp0techstack\backend\venv\Scripts\python.exe" (
            "%~dp0techstack\backend\venv\Scripts\python.exe" -c "from PIL import Image; Image.open('memwault logo.png').save('memwault.ico', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])" 2>nul
        )
    )
)

if not exist "%~dp0MemWault.lnk" (
    powershell -ExecutionPolicy Bypass -File "%~dp0create_shortcut.ps1" 2>nul
)

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
start "MemWault Backend API" /D "%~dp0techstack\backend" cmd /k "title MemWault Backend API && call venv\Scripts\activate && python -m uvicorn app.main:app --reload --port 8000"

echo.
echo [3/3] Starting Frontend UI on http://localhost:5173 ...
start "MemWault Frontend UI" /D "%~dp0techstack\frontend" cmd /k "title MemWault Frontend UI && npm run dev"

echo.
echo =========================================
echo  MemWault is now starting up!
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo =========================================
timeout /t 3 /nobreak >nul
start http://localhost:5173
exit /b 0
