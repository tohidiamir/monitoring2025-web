@echo off
echo Starting PLC Dashboard...
cd /d "f:\Monitoring-2025\Web\plc-dashboard"

echo Building project...
call npm run build

if %errorlevel% neq 0 (
    echo Build failed! Press any key to exit...
    pause
    exit /b 1
)

echo Starting dashboard server...
start "" http://localhost:3000/live
call npm run start
