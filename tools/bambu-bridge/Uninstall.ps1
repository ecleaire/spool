$ErrorActionPreference = 'Stop'
Remove-Item -LiteralPath 'HKCU:\Software\Classes\spool-bambu' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $env:LOCALAPPDATA 'SPOOL\BambuBridge') -Recurse -Force -ErrorAction SilentlyContinue
Write-Output 'SPOOL Bambu Studio Bridge removed. Model files were not changed.'
