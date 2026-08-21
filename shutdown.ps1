# MemWault Process Terminator & Power Down Engine
$targets = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -like "*uvicorn app.main:app*" -or
    $_.CommandLine -like "*vite*" -or
    $_.CommandLine -like "*techstack\backend*" -or
    $_.CommandLine -like "*techstack\frontend*" -or
    $_.CommandLine -like "*MemWault Backend API*" -or
    $_.CommandLine -like "*MemWault Frontend UI*"
}

$parentPids = @()
$childPids = @()

foreach ($p in $targets) {
    $childPids += $p.ProcessId
    if ($p.ParentProcessId -gt 0) {
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($p.ParentProcessId)"
        if ($parent -and ($parent.Name -in @('cmd.exe', 'powershell.exe', 'WindowsTerminal.exe', 'conhost.exe', 'wt.exe'))) {
            $parentPids += $p.ParentProcessId
        }
    }
}

# Kill parent windows first
foreach ($pid in ($parentPids | Select-Object -Unique)) {
    taskkill /F /T /PID $pid 2>$null
}

# Kill remaining target child processes
foreach ($pid in ($childPids | Select-Object -Unique)) {
    taskkill /F /T /PID $pid 2>$null
}

Write-Host "All MemWault services and terminal windows have been stopped."
