@echo off
rem Run once: creates the Python venv and installs all dependencies.
cd /d "%~dp0backend"
python -m venv venv || goto :err
call venv\Scripts\activate.bat
pip install -r requirements.txt || goto :err
cd /d "%~dp0frontend"
call npm install || goto :err
echo.
echo Setup finished. Now double-click start.bat
pause
exit /b 0
:err
echo Setup failed. Check that Python 3.10+ and Node.js 18+ are installed.
pause
