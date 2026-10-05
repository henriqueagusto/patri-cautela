@echo off
rem PATRI - aplicar uma versao nova do codigo. Faz backup, recompila e reinicia.
setlocal
cd /d "%~dp0.."

echo.
echo === [1/5] Copia de seguranca ===
cd server
call npm run backup -- --tipo antes-de-atualizar
if errorlevel 1 goto :fim_erro
cd ..

echo.
echo === [2/5] Telas ===
call npm install
if errorlevel 1 goto :fim_erro
call npm run build
if errorlevel 1 goto :fim_erro

echo.
echo === [3/5] Servidor ===
cd server
call npm install
if errorlevel 1 goto :fim_erro
call npm run build
if errorlevel 1 goto :fim_erro

echo.
echo === [4/5] Estrutura do banco (so acrescenta; recusa se houver perda de dados) ===
call npx prisma db push --skip-generate
if errorlevel 1 goto :fim_erro

echo.
echo === [5/5] Reiniciando o PATRI ===
cd ..
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1" -Acao reiniciar
echo.
pause
exit /b 0

:fim_erro
echo.
echo *** A atualizacao parou por causa do erro acima. O backup feito no passo 1 esta guardado. ***
echo.
pause
exit /b 1
