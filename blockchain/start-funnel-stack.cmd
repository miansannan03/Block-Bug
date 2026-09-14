@REM LEGACY BLOCKCHAIN STARTER - intentionally disabled and retained for reference.
@REM @echo off
@REM setlocal
@REM cd /d "%~dp0"
@REM set "TAILSCALE_EXE=C:\Program Files\Tailscale\tailscale.exe"
@REM if not exist "%TAILSCALE_EXE%" (
@REM   echo Tailscale CLI was not found at "%TAILSCALE_EXE%".
@REM   echo Update the path in start-funnel-stack.cmd if Tailscale is installed elsewhere.
@REM   exit /b 1
@REM )
@REM start "BlockBug Local Chain" cmd /k "cd /d %~dp0 && npm.cmd run chain"
@REM timeout /t 8 /nobreak >nul
@REM npm.cmd run deploy:local
@REM start "BlockBug Audit Service" cmd /k "cd /d %~dp0 && npm.cmd run service"
@REM timeout /t 3 /nobreak >nul
@REM "%TAILSCALE_EXE%" funnel --bg --yes 8787
@REM echo BlockBug local blockchain stack and Tailscale funnel are starting.
