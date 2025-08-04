@echo off
echo Creating Windows Scheduled Task for PLC Dashboard...

schtasks /create /tn "PLC Dashboard AutoStart" /tr "f:\Monitoring-2025\Web\plc-dashboard\start_dashboard_quick.bat" /sc onstart /ru "%USERNAME%" /rl highest /f

if %errorlevel% equ 0 (
    echo Task created successfully!
    echo Dashboard will start automatically when Windows boots.
    echo You can manage this task in Task Scheduler.
) else (
    echo Failed to create task. You may need to run as Administrator.
)

pause
