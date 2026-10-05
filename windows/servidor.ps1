# PATRI - controle do servidor no Windows.
#
#   servidor.ps1 -Acao instalar    cria a tarefa que inicia o PATRI junto com o Windows,
#                                  libera a porta no Firewall (so rede local) e ajusta a energia
#   servidor.ps1 -Acao iniciar | parar | reiniciar
#   servidor.ps1 -Acao remover     desfaz o que "instalar" fez (nao apaga banco nem fotos)
#
# Use pelos arquivos .cmd desta pasta. Precisa de administrador: pede sozinho.
# (Arquivo sem acentos de proposito: o PowerShell 5 do Windows le melhor assim.)
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('instalar', 'iniciar', 'parar', 'reiniciar', 'remover')]
  [string]$Acao
)

$ErrorActionPreference = 'Stop'
$NomeTarefa = 'PATRI'
$NomeRegra = 'PATRI (rede local)'

# --- Administrador --------------------------------------------------------
$identidade = [Security.Principal.WindowsIdentity]::GetCurrent()
$ehAdmin = (New-Object Security.Principal.WindowsPrincipal($identidade)).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $ehAdmin) {
  Write-Host 'Pedindo permissao de administrador...'
  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-Acao', $Acao)
  exit
}

# --- Caminhos e configuracao ------------------------------------------------
$Raiz = Split-Path -Parent $PSScriptRoot
$Servidor = Join-Path $Raiz 'server'
$ArquivoEnv = Join-Path $Servidor '.env'
$Servico = Join-Path $Servidor 'scripts\servico.mjs'
$Parar = Join-Path $Servidor 'scripts\parar.mjs'

function Fim([int]$codigo) {
  Write-Host ''
  Read-Host 'Pressione Enter para fechar' | Out-Null
  exit $codigo
}

function Falhar([string]$mensagem) {
  Write-Host ''
  Write-Host "ERRO: $mensagem" -ForegroundColor Red
  Fim 1
}

$comandoNode = Get-Command node -ErrorAction SilentlyContinue
if (-not $comandoNode) { Falhar 'Node.js nao encontrado. Instale a versao LTS em https://nodejs.org' }
$Node = $comandoNode.Source

$Porta = 3333
if (Test-Path $ArquivoEnv) {
  $linha = Get-Content $ArquivoEnv | Where-Object { $_ -match '^\s*PORT\s*=\s*"?(\d+)"?\s*$' } | Select-Object -First 1
  if ($linha -and ($linha -match '(\d+)')) { $Porta = [int]$Matches[1] }
}

function Tarefa { Get-ScheduledTask -TaskName $NomeTarefa -ErrorAction SilentlyContinue }

function Parar-Patri {
  if (Tarefa) { Stop-ScheduledTask -TaskName $NomeTarefa -ErrorAction SilentlyContinue }
  # Garante que nao sobrou processo segurando a porta.
  & $Node $Parar | Out-Host
}

function Iniciar-Patri {
  if (-not (Tarefa)) { Falhar 'A tarefa PATRI ainda nao existe. Execute 2-ativar-inicio-automatico.cmd' }
  Start-ScheduledTask -TaskName $NomeTarefa
}

function Aguardar-Patri {
  Write-Host 'Aguardando o PATRI responder...'
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
      $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 -Uri "http://127.0.0.1:$Porta/api/health"
      if ($r.StatusCode -eq 200) { return $true }
    } catch { }
  }
  return $false
}

function Mostrar-Enderecos {
  Write-Host ''
  Write-Host 'Endereco para os outros aparelhos (mesmo Wi-Fi):' -ForegroundColor Cyan
  $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }
  if (-not $ips) { Write-Host '  (este computador nao esta conectado a nenhuma rede agora)' }
  foreach ($ip in $ips) { Write-Host "  http://$($ip.IPAddress):$Porta" }
}

# --- Acoes -------------------------------------------------------------------
switch ($Acao) {

  'instalar' {
    if (-not (Test-Path $ArquivoEnv)) { Falhar 'server\.env nao existe. Execute antes 1-instalar.cmd' }
    if (-not (Test-Path (Join-Path $Servidor 'dist\src\index.js'))) { Falhar 'Servidor nao compilado. Execute antes 1-instalar.cmd' }

    Write-Host '[1/5] Tarefa que inicia o PATRI junto com o Windows'
    Parar-Patri
    $acaoTarefa = New-ScheduledTaskAction -Execute $Node -Argument "`"$Servico`"" -WorkingDirectory $Servidor
    $gatilho = New-ScheduledTaskTrigger -AtStartup
    # Conta do sistema: roda mesmo sem ninguem fazer login no Windows.
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    # Sem limite de tempo, roda na bateria, e o Windows tenta de novo se a tarefa cair.
    $ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
      -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) `
      -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
    Register-ScheduledTask -TaskName $NomeTarefa -Action $acaoTarefa -Trigger $gatilho -Principal $principal `
      -Settings $ajustes -Description 'Servidor do PATRI (telas, API e fotos).' -Force | Out-Null

    Write-Host "[2/5] Firewall: porta $Porta, somente para a rede local"
    Get-NetFirewallRule -DisplayName $NomeRegra -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -DisplayName $NomeRegra -Direction Inbound -Action Allow -Protocol TCP `
      -LocalPort $Porta -RemoteAddress LocalSubnet -Profile Any `
      -Description 'Acesso ao PATRI pelos aparelhos da mesma rede. O PostgreSQL (5432) NAO e liberado.' | Out-Null

    Write-Host '[3/5] PostgreSQL: inicio automatico e reinicio se cair'
    $servicosPg = @(Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue)
    if ($servicosPg.Count -eq 0) {
      Write-Host '      Servico do PostgreSQL nao encontrado (usa Docker?). Confira o inicio automatico dele.' -ForegroundColor Yellow
    }
    foreach ($s in $servicosPg) {
      Set-Service -Name $s.Name -StartupType Automatic
      & sc.exe failure $s.Name reset= 86400 actions= restart/5000/restart/5000/restart/60000 | Out-Null
      if ($s.Status -ne 'Running') { Start-Service -Name $s.Name }
      Write-Host "      $($s.Name): automatico"
    }

    Write-Host '[4/5] Energia: na tomada, nao suspender nem hibernar; tampa fechada nao desliga'
    $ErrorActionPreference = 'Continue'
    & powercfg.exe /change standby-timeout-ac 0 2>$null | Out-Null
    & powercfg.exe /change hibernate-timeout-ac 0 2>$null | Out-Null
    & powercfg.exe /change disk-timeout-ac 0 2>$null | Out-Null
    # Fechar a tampa na tomada: nao fazer nada.
    & powercfg.exe /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0 2>$null | Out-Null
    # Wi-Fi sem economia de energia na tomada (desempenho maximo).
    & powercfg.exe /setacvalueindex SCHEME_CURRENT 19cbb8fa-5279-450e-9fac-8a3d5fedd0c1 12bbebe6-58d6-4636-95bb-3217ef867c1a 0 2>$null | Out-Null
    & powercfg.exe /setactive SCHEME_CURRENT 2>$null | Out-Null
    $ErrorActionPreference = 'Stop'

    Write-Host '[5/5] Iniciando o PATRI'
    Iniciar-Patri
    if (Aguardar-Patri) {
      Write-Host ''
      Write-Host 'PATRI no ar e configurado para iniciar junto com o Windows.' -ForegroundColor Green
      Mostrar-Enderecos
    } else {
      Write-Host ''
      Write-Host 'A tarefa foi criada, mas o PATRI nao respondeu em 60 segundos.' -ForegroundColor Yellow
      Write-Host 'Execute windows\status.cmd e veja o arquivo de log na pasta de dados (logs).'
      Fim 1
    }
  }

  'iniciar' {
    Iniciar-Patri
    if (Aguardar-Patri) { Write-Host 'PATRI no ar.' -ForegroundColor Green; Mostrar-Enderecos }
    else { Write-Host 'O PATRI nao respondeu em 60 segundos. Execute windows\status.cmd' -ForegroundColor Yellow; Fim 1 }
  }

  'parar' {
    Parar-Patri
  }

  'reiniciar' {
    Parar-Patri
    Iniciar-Patri
    if (Aguardar-Patri) { Write-Host 'PATRI reiniciado.' -ForegroundColor Green; Mostrar-Enderecos }
    else { Write-Host 'O PATRI nao respondeu em 60 segundos. Execute windows\status.cmd' -ForegroundColor Yellow; Fim 1 }
  }

  'remover' {
    Parar-Patri
    if (Tarefa) { Unregister-ScheduledTask -TaskName $NomeTarefa -Confirm:$false }
    Get-NetFirewallRule -DisplayName $NomeRegra -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    Write-Host 'Inicio automatico e regra do Firewall removidos. Banco, fotos e backups nao foram tocados.'
  }
}

Fim 0
