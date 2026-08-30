@echo off
setlocal
cd /d "%~dp0android"

if not defined JAVA_HOME set "JAVA_HOME=%USERPROFILE%\android-build\jdk17"
if not defined ANDROID_HOME set "ANDROID_HOME=%USERPROFILE%\android-build\sdk"
set "GRADLE_BIN=%USERPROFILE%\android-build\gradle-8.9\bin\gradle.bat"

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo [ERROR] JDK not found: %JAVA_HOME%
  exit /b 1
)
if not exist "%ANDROID_HOME%\platforms\android-35\android.jar" (
  echo [ERROR] Android SDK 35 not found: %ANDROID_HOME%
  exit /b 1
)
if not exist "%GRADLE_BIN%" (
  echo [ERROR] Gradle not found: %GRADLE_BIN%
  exit /b 1
)
if not exist "%~dp0android\typing.keystore" (
  echo [ERROR] Fixed signing key not found: %~dp0android\typing.keystore
  echo Restore it from backup before building an upgrade APK.
  exit /b 1
)
if not exist "%~dp0android\keystore.properties" (
  echo [ERROR] Signing configuration not found: %~dp0android\keystore.properties
  echo Restore it from backup before building an upgrade APK.
  exit /b 1
)

echo Building the full offline APK. Copying 619 MB of audio may take a few minutes...
call "%GRADLE_BIN%" --no-daemon assembleDebug
if errorlevel 1 exit /b %errorlevel%

set "GRADLE_APK=%~dp0android\app\build\outputs\apk\debug\app-debug.apk"
set "DELIVERY_APK=%~dp0EchoFlow-debug.apk"
copy /y "%GRADLE_APK%" "%DELIVERY_APK%" >nul
if errorlevel 1 (
  echo [ERROR] Failed to copy APK to project root.
  exit /b %errorlevel%
)

echo.
echo APK ready:
echo %DELIVERY_APK%
endlocal
