$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)
$ShortcutPath = Join-Path $DesktopPath "MemWault.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "c:\Users\mehul\D\Projects\MemWault\start.bat"
$Shortcut.WorkingDirectory = "c:\Users\mehul\D\Projects\MemWault"
$Shortcut.IconLocation = "c:\Users\mehul\D\Projects\MemWault\memwault.ico,0"
$Shortcut.Description = "MemWault Digital Vault"
$Shortcut.Save()
Write-Host "Created Desktop shortcut: $ShortcutPath"
