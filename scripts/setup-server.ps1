$ErrorActionPreference = 'Stop'
$demoRoot = Split-Path $PSScriptRoot -Parent
$serverDir = Join-Path $demoRoot 'runtime/server'
New-Item -ItemType Directory -Force -Path $serverDir | Out-Null
$manifest = Invoke-RestMethod 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
$entry = $manifest.versions | Where-Object id -eq '1.21.4'
$version = Invoke-RestMethod $entry.url
$download = $version.downloads.server
$jar = Join-Path $serverDir 'server.jar'
if (!(Test-Path $jar)) { Invoke-WebRequest $download.url -OutFile $jar }
if ((Get-FileHash $jar -Algorithm SHA1).Hash.ToLower() -ne $download.sha1) { throw 'Minecraft server checksum mismatch' }
$properties = @'
server-ip=127.0.0.1
server-port=25575
online-mode=false
enforce-secure-profile=false
level-name=typesafe-demo
level-seed=8675309
gamemode=survival
difficulty=peaceful
max-players=3
view-distance=6
simulation-distance=4
spawn-protection=0
enable-rcon=false
enable-query=false
motd=TypeSafe local movement demo
'@
$config = Join-Path $serverDir 'server.properties'
if (!(Test-Path $config)) { [IO.File]::WriteAllText($config, $properties) }
$eula = Join-Path $serverDir 'eula.txt'
if (!(Test-Path $eula)) { [IO.File]::WriteAllText($eula, "# Review https://www.minecraft.net/eula before accepting.`neula=false`n") }
Write-Output 'Java 1.21.4 server downloaded and checksum verified. EULA acceptance is required before first launch.'
