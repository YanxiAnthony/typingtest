@echo off
setlocal EnableExtensions

cd /d "%~dp0"
set "PORT=8000"
set "APP_URL=http://127.0.0.1:%PORT%/"
set "HEALTH_URL=http://127.0.0.1:%PORT%/api/health"

rem Reuse the server if this project is already running.
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing '%HEALTH_URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto open_app

where py >nul 2>&1
if not errorlevel 1 goto launch_with_py

where python >nul 2>&1
if not errorlevel 1 goto launch_with_python

echo.
echo Python 3 was not found.
echo Install Python 3 and enable "Add Python to PATH", then run this file again.
pause
exit /b 1

:launch_with_py
start "Typing Local Server" /min py -3 server.py --port %PORT% --host 127.0.0.1
goto wait_for_server

:launch_with_python
start "Typing Local Server" /min python server.py --port %PORT% --host 127.0.0.1

:wait_for_server
rem Open the browser only after the server is accepting connections.
powershell -NoProfile -Command "$deadline = (Get-Date).AddSeconds(10); do { try { Invoke-WebRequest -UseBasicParsing '%HEALTH_URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 250 } } while ((Get-Date) -lt $deadline); exit 1" >nul 2>&1
if errorlevel 1 goto server_failed

:open_app
start "" "%APP_URL%"
exit /b 0

:server_failed
echo.
echo The local server could not start at %APP_URL%
echo Keep this window open and check the minimized "Typing Local Server" window for details.
pause
exit /b 1
