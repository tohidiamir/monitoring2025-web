@echo off
echo Removing PLC Dashboard from startup...

echo Removing from startup folder...
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PLC Dashboard.lnk" 2>nul

echo Removing scheduled task...
schtasks /delete /tn "PLC Dashboard AutoStart" /f 2>nul

echo Removing from registry...
reg delete "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run" /v "PLC Dashboard" /f 2>nul

echo PLC Dashboard removed from startup!
pause
