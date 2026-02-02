@echo off
echo ==========================================
echo   SHOW PLANNER - LAUNCHER
echo ==========================================

echo [1/3] Starting Backend Server (Flask)...
start "ShowPlanner Backend" cmd /k "cd backend && python app.py"

echo [2/3] Starting Frontend Server (Vite)...
start "ShowPlanner Frontend" cmd /k "cd frontend && npm run dev"

echo [3/3] Opening Application in Browser...
echo Waiting 5 seconds for servers to initialize...
timeout /t 5 >nul
start http://localhost:5173

echo ==========================================
echo   DONE! App is running.
echo   Do not close the terminal windows until you are finished.
echo ==========================================
pause
