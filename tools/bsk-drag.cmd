@echo off
setlocal
set "EXE=%~dp0..\runtime\windows-x64\bsk-drag.exe"
if not exist "%EXE%" (
  echo Extract the paired Windows runtime ZIP into this project first. 1>&2
  exit /b 2
)
if not defined LOCALAPPDATA (
  echo LOCALAPPDATA is required for the isolated runtime home. 1>&2
  exit /b 2
)
set "BSK_HOME=%LOCALAPPDATA%\BrowserSkillDragStandalone\bsk-home"
set "BSK_AUTO_START=0"
if "%~1"=="daemon-start" (
  "%EXE%" daemon start --port 52841 --foreground
  exit /b
)
if "%~1"=="daemon-stop" (
  "%EXE%" daemon stop
  exit /b
)
if "%~1"=="daemon" (
  echo Use daemon-start or daemon-stop for isolated service lifecycle. 1>&2
  exit /b 2
)
if "%~1"=="" (
  "%EXE%" --version
) else (
  "%EXE%" %*
)
exit /b
