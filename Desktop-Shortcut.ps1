param([switch]$Restore)
$ErrorActionPreference='Stop'
$desktop=[Environment]::GetFolderPath('Desktop')
$link=Join-Path $desktop 'ChatGPT.lnk'
$stateDir=Join-Path $PSScriptRoot 'local-state'
$backup=Join-Path $stateDir 'ChatGPT.original.lnk'
$record=Join-Path $stateDir 'shortcut.json'
if($Restore){
 if(!(Test-Path -LiteralPath $record)){throw 'No installed shortcut record found.'}
 $saved=Get-Content -LiteralPath $record -Raw|ConvertFrom-Json
 if((Test-Path -LiteralPath $link) -and (Get-FileHash -LiteralPath $link).Hash -ne $saved.hash){throw 'Desktop shortcut changed since installation; original backup retained.'}
 if(Test-Path -LiteralPath $backup){Copy-Item -LiteralPath $backup -Destination $link -Force}else{Remove-Item -LiteralPath $link -ErrorAction SilentlyContinue}
 Remove-Item -LiteralPath $record
 Write-Output 'Original desktop shortcut restored.'
 exit
}
if(Test-Path -LiteralPath $record){Write-Output 'Desktop shortcut already installed.';exit}
New-Item -ItemType Directory -Path $stateDir -Force|Out-Null
if(Test-Path -LiteralPath $link){Copy-Item -LiteralPath $link -Destination $backup -Force}
$package=Get-AppxPackage OpenAI.Codex|Select-Object -First 1
if(!$package){throw 'Official app not installed.'}
$exe=Join-Path $package.InstallLocation 'app/ChatGPT.exe'
$icon=Join-Path $PSScriptRoot 'assets/codex.ico'
Add-Type -AssemblyName System.Drawing
$ico=[Drawing.Icon]::ExtractAssociatedIcon($exe)
$stream=[IO.File]::Create($icon)
try{$ico.Save($stream)}finally{$stream.Dispose();$ico.Dispose()}
$shell=New-Object -ComObject WScript.Shell
$shortcut=$shell.CreateShortcut($link)
$shortcut.TargetPath=Join-Path $env:WINDIR 'System32/wscript.exe'
$shortcut.Arguments='"'+(Join-Path $PSScriptRoot 'Start-ChatGPT.vbs')+'"'
$shortcut.WorkingDirectory=$PSScriptRoot
$shortcut.IconLocation=$icon+',0'
$shortcut.Description='Chat GPT - Goku startup animation'
$shortcut.Save()
@{path=$link;hash=(Get-FileHash -LiteralPath $link).Hash}|ConvertTo-Json|Set-Content -LiteralPath $record -Encoding UTF8
Write-Output 'Desktop ChatGPT icon now starts the animation launcher.'
