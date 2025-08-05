@echo off
echo.
echo ================================================
echo Enhanced Quiz Server Manager v3.0 - Quick Start
echo ================================================
echo.

REM Check if dependencies are installed
echo 🔍 Checking dependencies...
python -c "import flask, flask_cors, requests, jwt, bcrypt" 2>nul
if errorlevel 1 (
    echo.
    echo ❌ Missing dependencies detected!
    echo.
    echo Would you like to install them automatically? (Y/N)
    set /p install_deps="Install dependencies? (Y/N): "
    if /i "%install_deps%"=="Y" (
        echo.
        echo 📦 Installing dependencies...
        call install_dependencies_v3.bat
        echo.
    ) else (
        echo.
        echo ⚠️ Some features may not work without all dependencies.
        echo   To install later, run: install_dependencies_v3.bat
        echo.
    )
)

echo.
echo 🚀 Starting Enhanced GUI with Real-time Monitoring...
echo.
echo New in v3.0:
echo   • Real-time user registration monitoring
echo   • Live activity tracking  
echo   • API-based monitoring
echo   • Instant notifications for new users
echo   • Enhanced user management
echo.
echo 🎯 Usage:
echo   1. Click "Quick Start Enhanced" (or Ctrl+Q)
echo   2. Go to "Real-time Monitoring" tab
echo   3. Open web: http://localhost:5000
echo   4. Register new users and watch live notifications!
echo.
echo 🛠️ Troubleshooting tools:
echo   - test_server_v3.bat     : Test server independently
echo   - debug_server_v3.bat    : Run server in debug mode
echo   - quick_fix_v3.bat       : Fix common issues
echo.

REM Start the GUI
python enhanced_gui.py

REM If GUI exited with error, offer troubleshooting
if errorlevel 1 (
    echo.
    echo ❌ Enhanced GUI exited with an error.
    echo.
    echo 🛠️ Troubleshooting options:
    echo   1. Run quick_fix_v3.bat to fix common issues
    echo   2. Run test_server_v3.bat to test server independently  
    echo   3. Run debug_server_v3.bat for detailed error info
    echo.
)

pause
