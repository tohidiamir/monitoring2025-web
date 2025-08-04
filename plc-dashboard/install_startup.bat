@echo off
echo Creating startup shortcut...

set "startupFolder=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "targetScript=f:\Monitoring-2025\Web\plc-dashboard\start_dashboard_quick.bat"
set "shortcutName=PLC Dashboard.lnk"

powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%startupFolder%\%shortcutName%'); $Shortcut.TargetPath = '%targetScript%'; $Shortcut.WorkingDirectory = 'f:\Monitoring-2025\Web\plc-dashboard'; $Shortcut.Description = 'PLC Dashboard Auto Start'; $Shortcut.Save()}"

echo Shortcut created in startup folder!
echo Dashboard will start automatically when Windows boots.
pause
