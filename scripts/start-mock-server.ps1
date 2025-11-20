$env:USE_MOCK_DB = 'true'
$env:PORT = '5002'
Start-Process -FilePath node -ArgumentList 'nodeserver.js' -NoNewWindow
Write-Host "Started mock server on port $env:PORT"
