[CmdletBinding()]
param(
    [switch]$StartDaemon,
    [switch]$StopDaemon,
    [string[]]$BskArgs = @('--version')
)
$ErrorActionPreference = 'Stop'
if ($StartDaemon -and $StopDaemon) { throw 'Choose only one daemon lifecycle action.' }
$Root = Split-Path -Parent $PSScriptRoot
$Exe = Join-Path $Root 'runtime\windows-x64\bsk-drag.exe'
if (-not (Test-Path -LiteralPath $Exe -PathType Leaf)) { throw 'Extract the paired Windows runtime ZIP into this project first.' }
if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA is required for the isolated runtime home.' }
if ($BskArgs -contains 'daemon' -and -not ($StartDaemon -or $StopDaemon)) { throw 'Use -StartDaemon or -StopDaemon for isolated service lifecycle.' }
$OldHome=$env:BSK_HOME
$OldAuto=$env:BSK_AUTO_START
try {
    $env:BSK_HOME=Join-Path $env:LOCALAPPDATA 'BrowserSkillDragStandalone\bsk-home'
    $env:BSK_AUTO_START='0'
    if ($StartDaemon) { & $Exe daemon start --port 52841 --foreground }
    elseif ($StopDaemon) { & $Exe daemon stop }
    else { & $Exe @BskArgs }
    $Code=$LASTEXITCODE
} finally {
    $env:BSK_HOME=$OldHome
    $env:BSK_AUTO_START=$OldAuto
}
exit $Code
