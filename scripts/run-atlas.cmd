@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-atlas.ps1" %*
exit /b %errorlevel%
