@echo off
rem PATRI - mostra se o servidor esta funcionando e o endereco para os outros aparelhos.
cd /d "%~dp0..\server"
call npm run --silent status
echo.
pause
