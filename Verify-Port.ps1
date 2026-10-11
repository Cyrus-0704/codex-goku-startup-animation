param([int]$Port,[int]$AppPid,[string]$ExpectedPath)
$ErrorActionPreference='Stop'
$connections=@(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop)
if(-not $connections.Count -or @($connections | Where-Object { $_.LocalAddress -ne '127.0.0.1' -or $_.OwningProcess -ne $AppPid }).Count) { throw 'Listener ownership/address mismatch' }
$proc=Get-CimInstance Win32_Process -Filter "ProcessId = $AppPid"
if(-not $proc -or [IO.Path]::GetFullPath($proc.ExecutablePath) -ne [IO.Path]::GetFullPath($ExpectedPath)) { throw 'Unexpected executable' }
if($proc.CommandLine -notmatch ('--remote-debugging-port='+$Port+'(?:\s|$)')) { throw 'Unexpected command line' }
$owner=Invoke-CimMethod -InputObject $proc -MethodName GetOwner
if($owner.User -ne [Environment]::UserName) { throw 'Process owner mismatch' }
