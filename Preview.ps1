$ErrorActionPreference='Stop'
try {
 $package=Get-AppxPackage -Name OpenAI.Codex | Select-Object -First 1
 $runtime=if($package){Join-Path $package.InstallLocation 'app/resources/cua_node/bin/node.exe'}else{''}
 if(-not $runtime -or -not(Test-Path -LiteralPath $runtime)) { $runtime=(Get-Command node -ErrorAction Stop).Source }
 & $runtime (Join-Path $PSScriptRoot 'preview-server.mjs')
} catch { Write-Host $_.Exception.Message; Read-Host 'Press Enter to close'; exit 1 }
