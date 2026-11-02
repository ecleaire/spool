param([Parameter(Mandatory=$true)][string]$BambuStudioPath)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $BambuStudioPath -PathType Leaf) -or [IO.Path]::GetFileName($BambuStudioPath) -ine 'bambu-studio.exe') { throw 'Specify the installed bambu-studio.exe.' }
$target = Join-Path $env:LOCALAPPDATA 'SPOOL\BambuBridge'
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Open-SpoolFile.ps1') -Destination $target -Force
@{ executable = (Resolve-Path -LiteralPath $BambuStudioPath).Path } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $target 'config.json') -Encoding UTF8
$key = 'HKCU:\Software\Classes\spool-bambu'
New-Item -Path $key -Force | Out-Null
Set-Item -Path $key -Value 'URL:SPOOL Bambu Studio Bridge'
New-ItemProperty -Path $key -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
New-Item -Path "$key\shell\open\command" -Force | Out-Null
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
Set-Item -Path "$key\shell\open\command" -Value ('"' + $powershell + '" -NoProfile -File "' + (Join-Path $target 'Open-SpoolFile.ps1') + '" "%1"')
Write-Output 'Installed for the current Windows user. SPOOL file links will ask before opening Bambu Studio.'
