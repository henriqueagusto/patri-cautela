@echo off
rem PATRI - desativar-inicio-automatico (pede permissao de administrador)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1" -Acao remover
