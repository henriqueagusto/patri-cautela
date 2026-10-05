@echo off
rem PATRI - instalacao no notebook-servidor. Pode ser executado de novo sem risco:
rem nao apaga banco, fotos nem configuracao.
setlocal
cd /d "%~dp0.."

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js nao encontrado. Instale a versao LTS em https://nodejs.org e execute de novo.
  goto :fim_erro
)

echo.
echo === [1/7] Dependencias das telas ===
call npm install
if errorlevel 1 goto :fim_erro

echo.
echo === [2/7] Compilando as telas ===
call npm run build
if errorlevel 1 goto :fim_erro

cd server
echo.
echo === [3/7] Dependencias do servidor ===
call npm install
if errorlevel 1 goto :fim_erro

echo.
echo === [4/7] Configuracao (banco, senhas, pastas) ===
call npm run configurar
if errorlevel 1 goto :fim_erro

echo.
echo === [5/7] Compilando o servidor ===
call npm run build
if errorlevel 1 goto :fim_erro

echo.
echo === [6/7] Copia de seguranca antes de mexer na estrutura do banco ===
call npm run backup -- --tipo antes-de-instalar
if errorlevel 1 goto :fim_erro

echo.
echo === [7/7] Estrutura do banco (so acrescenta; recusa se houver perda de dados) ===
call npx prisma db push --skip-generate
if errorlevel 1 goto :fim_erro
call npm run db:seed
if errorlevel 1 goto :fim_erro

echo.
echo ============================================================
echo  Instalacao concluida.
echo  Proximo passo: execute  windows\2-ativar-inicio-automatico.cmd
echo ============================================================
echo.
pause
exit /b 0

:fim_erro
echo.
echo *** A instalacao parou por causa do erro acima. Nada foi apagado. ***
echo.
pause
exit /b 1
