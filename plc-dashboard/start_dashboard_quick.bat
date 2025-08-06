@echo off
echo Starting PLC Dashboard (Production Mode)...
cd /d "f:\Monitoring-2025\Web\plc-dashboard"

echo Opening browser...
timeout /t 3 /nobreak >nul
start "" http://localhost:3000/live

echo Starting server...
npm run start
