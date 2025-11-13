<#
Server Control Script for Backend
Usage:
  ./scripts/serverctl.ps1 start main
  ./scripts/serverctl.ps1 start mock
  ./scripts/serverctl.ps1 stop main
  ./scripts/serverctl.ps1 stop mock
  ./scripts/serverctl.ps1 status
#>

param(
  [Parameter(Mandatory = $true)][ValidateSet("start","stop","status")][string]$Action,
  [Parameter(Mandatory = $false)][ValidateSet("main","mock")][string]$Target
)

function Get-PortProcessId($port) {
  $match = netstat -aon | Select-String ":$port\b" | Select-Object -First 1
  if (-not $match) { return $null }
  $parts = ($match -split "\s+") | Where-Object { $_ -ne "" }
  return [int]$parts[-1]
}

function Start-MainServer {
  Write-Host "🚀 Starting main server (port 5001)..."
  $process = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru
  Write-Host "✅ Main server started with PID $($process.Id)"
}

function Start-MockServer {
  Write-Host "🧪 Starting mock server (port 5002)..."
  $cmd = "$env:USE_MOCK_DB='true'; $env:PORT='5002'; node server.js"
  $process = Start-Process powershell -ArgumentList "-NoProfile","-WindowStyle","Hidden","-Command",$cmd -PassThru
  Write-Host "✅ Mock server started with PID $($process.Id)"
}

function Stop-ServerByPort($port) {
  $procId = Get-PortProcessId $port
  if (-not $procId) {
    Write-Host "ℹ️  No process found on port $port"
    return
  }
  try {
    Stop-Process -Id $procId -Force
    Write-Host "🛑 Stopped process $procId on port $port"
  } catch {
    Write-Host "❌ Failed to stop process $procId : $_"
  }
}

switch ($Action) {
  'start' {
    if (-not $Target) { Write-Host "Please specify target: main or mock"; break }
    if ($Target -eq 'main') { Start-MainServer }
    elseif ($Target -eq 'mock') { Start-MockServer }
  }

  'stop' {
    if (-not $Target) { Write-Host "Please specify target: main or mock"; break }
    if ($Target -eq 'main') { Stop-ServerByPort 5001 }
    elseif ($Target -eq 'mock') { Stop-ServerByPort 5002 }
  }

  'status' {
    $main = Get-PortProcessId 5001
    $mock = Get-PortProcessId 5002
    Write-Host "Port 5001 (main): $main"
    Write-Host "Port 5002 (mock): $mock"
  }
}
