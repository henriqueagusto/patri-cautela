@echo off
rem PATRI - iniciar (pede permissao de administrador)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1" -Acao iniciar
