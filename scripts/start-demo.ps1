$ErrorActionPreference = 'Stop'
$demoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $demoRoot
if (!$env:TYPESAFE_API_KEY) { $env:TYPESAFE_API_KEY = [Environment]::GetEnvironmentVariable('TYPESAFE_API_KEY', 'User') }
if (!$env:TYPESAFE_API_KEY) { $env:TYPESAFE_API_KEY = [Environment]::GetEnvironmentVariable('TYPESAFE_API_KEY', 'Machine') }
$nodePath = (Get-Command node -ErrorAction Stop).Source
& $nodePath --env-file-if-exists=.env src/server.cjs
