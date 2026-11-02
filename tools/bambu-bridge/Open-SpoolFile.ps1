param([Parameter(Mandatory=$true)][string]$Link)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
try {
    $uri = [Uri]$Link
    if ($uri.Scheme -ne 'spool-bambu' -or $uri.Host -ne 'open' -or $uri.AbsolutePath -ne '/' -or $uri.Fragment) { throw 'Invalid SPOOL link.' }
    if ($uri.Query -notmatch '^\?path=([^&]+)$') { throw 'Invalid file parameter.' }
    $file = [Uri]::UnescapeDataString($Matches[1])
    if ($file -match '[\x00-\x1f"<>|?*]' -or $file.Length -gt 2048 -or $file -notmatch '^(?:[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+[\\/])' -or $file -match '^(?:\\\\[?.]\\)' -or $file.Substring(2).Contains(':')) { throw 'Use a Windows absolute path or a shared-folder UNC path.' }
    if ($file -notmatch '(?i)\.(stl|obj|3mf|amf|step|stp|gcode)$') { throw 'Unsupported file type.' }
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw 'File not found. Check the folder and network connection.' }
    $config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json
    if (-not (Test-Path -LiteralPath $config.executable -PathType Leaf)) { throw 'Bambu Studio executable not found. Run Install.ps1 again.' }
    $answer = [System.Windows.Forms.MessageBox]::Show("Open this file in Bambu Studio?`n`n$file", 'SPOOL', 'YesNo', 'Question')
    if ($answer -ne 'Yes') { exit }
    Start-Process -FilePath $config.executable -ArgumentList ('"' + $file + '"')
} catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'SPOOL - Cannot open file', 'OK', 'Error') | Out-Null
    exit 1
}
