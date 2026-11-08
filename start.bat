@echo off
rem One-click start for local development (run setup.bat once first).
cd /d "%~dp0"
start "BugMap backend" powershell -NoExit -Command "cd backend; .\venv\Scripts\Activate.ps1; python app.py"
start "BugMap frontend" powershell -NoExit -Command "cd frontend; npm run dev"
timeout /t 7 >nul
start http://localhost:5173
