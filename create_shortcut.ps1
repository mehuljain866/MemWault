$WshShell = New-Object -ComObject WScript.Shell
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }
$ShortcutPath = Join-Path $ScriptDir "MemWault.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = Join-Path $ScriptDir "start.bat"
$Shortcut.WorkingDirectory = $ScriptDir
$Shortcut.IconLocation = (Join-Path $ScriptDir "memwault.ico") + ",0"
$Shortcut.Description = "MemWault Digital Vault"
$Shortcut.Save()
Write-Host "Created shortcut: $ShortcutPath"
