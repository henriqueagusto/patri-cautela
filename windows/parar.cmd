@echo off
rem PATRI - parar (pede permissao de administrador)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1" -Acao parar
