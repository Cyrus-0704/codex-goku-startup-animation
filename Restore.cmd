@echo off
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0Launch.ps1" -Restore -Console
if errorlevel 1 pause
