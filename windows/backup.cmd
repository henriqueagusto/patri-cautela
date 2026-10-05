@echo off
rem PATRI - copia de seguranca manual (banco + fotos + configuracao).
rem Para gravar em outro lugar (sem barra no final):  backup.cmd E:\PATRI-backups
cd /d "%~dp0..\server"
if "%~1"=="" (
  call npm run --silent backup
) else (
  call npm run --silent backup -- --destino "%~1"
)
echo.
pause
