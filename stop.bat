@echo off
title MemWault Shutdown
cd /d "%~dp0"
echo Shutting down all MemWault background services and command prompts...
powershell -ExecutionPolicy Bypass -File "%~dp0shutdown.ps1"
timeout /t 1 /nobreak >nul
exit
