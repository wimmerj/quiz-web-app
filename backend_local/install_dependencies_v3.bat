@echo off
echo.
echo ================================================================
echo Enhanced Quiz Server Manager v3.0 - Dependency Installer
echo ================================================================
echo.
echo Installing required Python packages...
echo.

REM Install dependencies one by one with clear output
echo [1/5] Installing Flask...
pip install Flask
echo.

echo [2/5] Installing Flask-CORS...
pip install Flask-CORS
echo.

echo [3/5] Installing requests...
pip install requests
echo.

echo [4/5] Installing PyJWT...
pip install PyJWT
echo.

echo [5/5] Installing bcrypt...
pip install bcrypt
echo.

echo ================================================================
echo Installation completed!
echo ================================================================
echo.
echo Testing installation...
python install_dependencies_v3.py
echo.

echo ================================================================
echo Enhanced Quiz Server Manager v3.0 is ready!
echo ================================================================
echo.
echo To start the application:
echo   1. Run: start_enhanced_gui_v3.bat
echo   2. Or run: python enhanced_gui.py
echo.

pause
