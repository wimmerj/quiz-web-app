@echo off
title Enhanced Quiz Server Manager v3.0 - Server Test
echo.
echo ===============================================
echo  Enhanced Quiz Server Manager v3.0 - Server Test
echo ===============================================
echo.

cd /d "%~dp0"

echo Running server test...
echo This will help diagnose server startup issues.
echo.

python test_server_v3.py

echo.
echo Test completed.
echo.
pause
