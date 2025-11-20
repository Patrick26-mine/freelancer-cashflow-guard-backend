<#
Simple server control script for Windows PowerShell.

Usage:
  ./scripts/serverctl.ps1 start main    # start main server on PORT (default or from .env)
  ./scripts/serverctl.ps1 start mock    # start mock server on port 5002 (USE_MOCK_DB=true)
  ./scripts/serverctl.ps1 stop main     # stop server listening on port 5001
  ./scripts/serverctl.ps1 stop mock     # stop server listening on port 5002
  ./scripts/serverctl.ps1 status        # show status of ports 5001/5002

Notes:
- This script finds the PID listening on the port and stops it. It starts processes using
  node and PowerShell so they run in the background on Windows.
#>

param(
  [Parameter(Mandatory=$true)][ValidateSet('start','stop','status')][string]$Action,
  [Parameter(Mandatory=$false)][ValidateSet('main','mock')][string]$Target
)

function Get-PidByPort($port) {
  $match = netstat -aon | Select-String ":$port\b" | Select-Object -First 1
  if (-not $match) { return $null }
  $parts = ($match -split '\s+') | Where-Object { $_ -ne '' }
  return [int]$parts[-1]
}

function Start-Main() {
  Write-Host "Starting main server (nodeserver.js)..."
  $p = Start-Process -FilePath node -ArgumentList 'nodeserver.js' -PassThru
  Write-Host "Started main server with PID $($p.Id)"
}

function Start-Mock() {
  Write-Host "Starting mock server on port 5002 (USE_MOCK_DB=true)..."
  # Start a new PowerShell process which sets env vars and launches node
  $cmd = "`$env:USE_MOCK_DB='true'; `$env:PORT='5002'; node nodeserver.js"
  $p = Start-Process -FilePath powershell -ArgumentList '-NoProfile','-WindowStyle','Hidden','-Command',$cmd -PassThru
  Write-Host "Started mock server PowerShell launcher with PID $($p.Id)"
}

function Stop-ByPort($port) {
  $processId = Get-PidByPort $port
  if (-not $processId) { Write-Host "No process listening on port $port"; return }
  try {
    Stop-Process -Id $processId -Force -ErrorAction Stop
    Write-Host "Stopped process $processId listening on port $port"
  } catch {
    # Use explicit formatting to avoid interpolation parsing issues
    Write-Host ("Failed to stop process {0}: {1}" -f $processId, $_)
  }
}

switch ($Action) {
  'start' {
    if (-not $Target) { Write-Host "Specify target: main or mock"; break }
    if ($Target -eq 'main') { Start-Main } elseif ($Target -eq 'mock') { Start-Mock }
  }
  'stop' {
    if (-not $Target) { Write-Host "Specify target: main or mock"; break }
    if ($Target -eq 'main') { Stop-ByPort 5001 } elseif ($Target -eq 'mock') { Stop-ByPort 5002 }
  }
  'status' {
    $p1 = Get-PidByPort 5001
    $p2 = Get-PidByPort 5002
    Write-Host "Port 5001 PID: $p1"
    Write-Host "Port 5002 PID: $p2"
  }
}
