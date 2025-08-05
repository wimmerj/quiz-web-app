@echo off
title Enhanced Quiz Server v3.0 - Standalone
echo.
echo ===============================================
echo  Enhanced Quiz Server v3.0 - Standalone
echo ===============================================
echo.

cd /d "%~dp0"

echo Starting server without GUI...
echo This helps test the server independently.
echo Press Ctrl+C to stop the server.
echo.

python standalone_server_v3.py

echo.
echo Server stopped.
pause
