@echo off
echo ===============================================
echo    Enhanced Quiz Server Manager - Quick GUI
echo ===============================================
echo.
echo Features:
echo  - Quick Start Enhanced Backend (Ctrl+Q or F5)
echo  - Auto-configure enhanced_backend_fixed.py
echo  - One-click database setup
echo  - Automatic browser opening
echo  - Real-time server monitoring
echo.
echo Starting Enhanced GUI...
echo ===============================================

..\.venv\Scripts\python.exe enhanced_gui.py

echo.
echo GUI closed. Press any key to exit...
pause > nul
