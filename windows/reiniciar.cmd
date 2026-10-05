@echo off
rem PATRI - reiniciar (pede permissao de administrador)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1" -Acao reiniciar
