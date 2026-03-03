@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] npm is not installed or not in PATH.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  call npm.cmd install
  if %errorlevel% neq 0 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo [INFO] Starting Vite dev server...
call npm.cmd run dev -- --host 127.0.0.1 --port 5173

if %errorlevel% neq 0 (
  echo [ERROR] Dev server stopped with an error.
  pause
  exit /b 1
)

endlocal
