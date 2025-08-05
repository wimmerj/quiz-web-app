@echo off
title Enhanced Quiz Server Manager v3.0 - Quick Fix
echo.
echo ===============================================
echo  Enhanced Quiz Server Manager v3.0 - Quick Fix
echo ===============================================
echo.

cd /d "%~dp0"

echo Running diagnostic and fix tool...
echo.

python quick_fix_v3.py

echo.
echo Fix process completed.
echo.
pause
