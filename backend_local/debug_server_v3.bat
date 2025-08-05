@echo off
title Enhanced Quiz Server Manager v3.0 - Debug Mode
echo.
echo ===============================================
echo  Enhanced Quiz Server Manager v3.0 - Debug Mode
echo ===============================================
echo.

cd /d "%~dp0"

echo Starting server in DEBUG mode...
echo This will show detailed error information.
echo Close this window or press Ctrl+C to stop the server.
echo.

python debug_server_v3.py

echo.
echo Server stopped.
pause
