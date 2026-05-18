@echo off
setlocal
cd /d "%~dp0"

start "BlockBug Local Chain" cmd /k "cd /d %~dp0 && npm.cmd run chain"
timeout /t 8 /nobreak >nul
npm.cmd run deploy:local
start "BlockBug Audit Service" cmd /k "cd /d %~dp0 && npm.cmd run service"

echo BlockBug blockchain stack started.
echo Local chain window and audit service window should remain open while blockchain proof is in use.
