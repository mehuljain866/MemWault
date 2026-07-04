@echo off
title MemWault Starter
echo =========================================
echo       MemWault One-Click Starter
echo =========================================
echo.

echo [1/4] Checking/Setting up Python Backend...
cd techstack\backend
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing Python dependencies...
pip install -r requirements.txt
echo Ensuring Playwright browser is installed...
playwright install chromium
cd ..\..
echo.

echo [2/4] Checking/Setting up Frontend...
cd techstack\frontend
if not exist "node_modules" (
    echo Installing Node dependencies...
    npm install
)
cd ..\..
echo.

echo [3/4] Starting Backend Server...
cd techstack\backend
start "MemWault Backend" cmd /k "call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
cd ..\..
echo.

echo [4/4] Starting Frontend Server...
cd techstack\frontend
start "MemWault Frontend" cmd /k "npm run dev"
cd ..\..
echo.

echo =========================================
echo MemWault is now starting up! 
echo.
echo A new window has opened for the Backend API.
echo A new window has opened for the Frontend UI.
echo.
echo You can access the app at: http://localhost:5173
echo =========================================
pause
