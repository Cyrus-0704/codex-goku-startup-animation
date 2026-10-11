@echo off
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0Launch.ps1" -Console
if errorlevel 1 pause
