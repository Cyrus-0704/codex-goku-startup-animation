param([switch]$Restore,[switch]$CheckOnly,[int]$AttachPort=0,[int]$AttachPid=0,[switch]$Console)
$ErrorActionPreference='Stop'
try {
 $package=Get-AppxPackage -Name OpenAI.Codex | Select-Object -First 1
 if(-not $package) { throw '未找到官方 Codex / ChatGPT 商店应用。' }
 $exe=Join-Path $package.InstallLocation 'app/ChatGPT.exe'
 $node=Join-Path $package.InstallLocation 'app/resources/cua_node/bin/node.exe'
 if(-not (Test-Path -LiteralPath $node)) { throw '当前版本缺少所需的内置 Node 运行时。' }
 $sessionPath=Join-Path $PSScriptRoot 'session.json'
 if($CheckOnly) { [pscustomobject]@{Package=$package.PackageFullName;Executable=$exe;Runtime=$node;PrerequisitesFound=$true;ColdLaunchVerified=$false} | ConvertTo-Json; exit 0 }
 if($AttachPort -gt 0 -and $AttachPid -gt 0) { $port=$AttachPort; $appProcess=$AttachPid }
 elseif($Restore) {
  if(-not (Test-Path -LiteralPath $sessionPath)) { throw '没有可恢复的启动会话。也可在应用里按 Ctrl+Alt+B。' }
  $state=Get-Content -LiteralPath $sessionPath -Raw | ConvertFrom-Json
  $port=[int]$state.port; $appProcess=[int]$state.pid
 } else {
  $existing=@(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object { $_.ExecutablePath -eq $exe -and $_.CommandLine -notlike '*--type=*' })
  if($existing.Count -eq 1 -and $existing[0].CommandLine -match '--remote-debugging-port=(\d+)') {
   $port=[int]$Matches[1]; $appProcess=[int]$existing[0].ProcessId
  } elseif($existing.Count) { throw '当前应用没有可用的本机调试入口。请保存输入并完全退出，再使用此入口启动。' }
  else {
  $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0);$listener.Start();$port=$listener.LocalEndpoint.Port;$listener.Stop()
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[ComImport,Guid("2E941141-7F97-4756-BA1D-9DECDE894A3D"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAppActivation { [PreserveSig] int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)] string id,[MarshalAs(UnmanagedType.LPWStr)] string args,uint options,out uint pid); }
public static class StoreLauncher {
 public static uint Open(string id,string args){var type=Type.GetTypeFromCLSID(new Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C"));var instance=Activator.CreateInstance(type);try{uint pid;int hr=((IAppActivation)instance).ActivateApplication(id,args,0,out pid);Marshal.ThrowExceptionForHR(hr);return pid;}finally{Marshal.ReleaseComObject(instance);}}
}
'@
  $appProcess=[StoreLauncher]::Open(($package.PackageFamilyName+'!App'),('--remote-debugging-address=127.0.0.1 --remote-debugging-port='+$port))
  }
 }
 $inject=Join-Path $PSScriptRoot 'controller.mjs'
 $arguments=@($inject,$port,$appProcess,$exe)
 if($Restore) { $arguments+='--restore' }
 $ErrorActionPreference='Continue'
 & $node @arguments 2>&1 | ForEach-Object { $line=$_.ToString(); $line | Add-Content -LiteralPath (Join-Path $PSScriptRoot 'launcher.log') -Encoding UTF8; if($Console){Write-Host $line} }
 $resultCode=$LASTEXITCODE
 $ErrorActionPreference='Stop'
 if($resultCode -ne 0) { throw '接入未完成，官方应用仍可使用。请完全退出后从原图标重新打开，结束本次调试启动。详细原因见 launcher.log。' }
} catch {
 $message=$_.Exception.Message
 $message | Add-Content -LiteralPath (Join-Path $PSScriptRoot 'launcher.log') -Encoding UTF8
 if($Console) { Write-Error $message }
 else { Add-Type -AssemblyName PresentationFramework; [void][Windows.MessageBox]::Show($message,'Chat GPT · 悟空开屏') }
 exit 1
}
