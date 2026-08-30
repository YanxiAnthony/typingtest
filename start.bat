@echo off
setlocal EnableExtensions

cd /d "%~dp0"
set "PROJECT_ROOT=%~dp0"
set "PORT_MIN=8000"
set "PORT_MAX=8010"
set "PORT="
set "SERVER_STATE="

rem Reuse only this project instance. An old copy may still own port 8000 after
rem the project directory is renamed, so remember the first free fallback port.
for /f "tokens=1,2 delims=:" %%A in ('powershell -NoProfile -Command "$expected = [IO.Path]::GetFullPath($env:PROJECT_ROOT).TrimEnd([IO.Path]::DirectorySeparatorChar); $listening = @(); foreach ($endpoint in [Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()) { $listening += $endpoint.Port }; $available = $null; foreach ($candidate in ([int]$env:PORT_MIN)..([int]$env:PORT_MAX)) { try { $health = Invoke-RestMethod ('http://127.0.0.1:' + $candidate + '/api/health') -TimeoutSec 1; $reported = [string]$health.projectRoot; if ($health.app -eq 'EchoFlow' -and $reported -and [IO.Path]::GetFullPath($reported).TrimEnd([IO.Path]::DirectorySeparatorChar) -ieq $expected) { Write-Output ('RUNNING:' + $candidate); exit 0 } } catch {}; if ($null -eq $available -and $listening -notcontains $candidate) { $available = $candidate } }; if ($null -ne $available) { Write-Output ('AVAILABLE:' + $available) }"') do (
  set "SERVER_STATE=%%A"
  set "PORT=%%B"
)

if not defined PORT goto no_available_port
set "APP_URL=http://127.0.0.1:%PORT%/"
set "HEALTH_URL=http://127.0.0.1:%PORT%/api/health"
if /i "%SERVER_STATE%"=="RUNNING" goto open_app

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
start "NCE_STADY Local Server" /min py -3 server.py --port %PORT% --host 127.0.0.1
goto wait_for_server

:launch_with_python
start "NCE_STADY Local Server" /min python server.py --port %PORT% --host 127.0.0.1

:wait_for_server
rem Open the browser only after the server is accepting connections.
powershell -NoProfile -Command "$deadline = (Get-Date).AddSeconds(10); do { try { Invoke-WebRequest -UseBasicParsing '%HEALTH_URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 250 } } while ((Get-Date) -lt $deadline); exit 1" >nul 2>&1
if errorlevel 1 goto server_failed

:open_app
if defined NCE_STADY_SKIP_BROWSER exit /b 0
start "" "%APP_URL%"
exit /b 0

:server_failed
echo.
echo The local server could not start at %APP_URL%
echo Keep this window open and check the minimized "NCE_STADY Local Server" window for details.
pause
exit /b 1

:no_available_port
echo.
echo No available local port was found between %PORT_MIN% and %PORT_MAX%.
echo Close an old local server and run this file again.
pause
exit /b 1
