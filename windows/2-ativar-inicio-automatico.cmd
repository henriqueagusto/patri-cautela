@echo off
rem PATRI - 2-ativar-inicio-automatico (pede permissao de administrador)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1" -Acao instalar
