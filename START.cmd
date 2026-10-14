@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "taskNode=node"
where node >nul 2>nul
if errorlevel 1 set "taskNode=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%taskNode%" -e "if(parseInt(process.versions.node)<24){console.error('Требуется Node.js 24 или новее');process.exit(1)}"
if errorlevel 1 (
  echo Установите Node.js 24 или новее и повторите запуск.
  pause
  exit /b 1
)
if not exist node_modules (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo Установите зависимости по инструкции README.md.
    pause
    exit /b 1
  )
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Откройте адрес Local, который появится ниже. По умолчанию: http://127.0.0.1:4173
echo Для остановки сервера нажмите Ctrl+C.
"%taskNode%" --env-file-if-exists=.env scripts/server.mjs
pause
