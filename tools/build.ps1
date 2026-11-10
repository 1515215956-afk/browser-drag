[CmdletBinding()]
param([switch]$Plan)
$ErrorActionPreference='Stop'
$Commands=@(
    'pnpm install --frozen-lockfile',
    'cargo build -p bsk --release --locked',
    'BSK_DAEMON_WS_URL=ws://127.0.0.1:52841 pnpm --filter @browser-skill/extension build'
)
if ($Plan) { $Commands; exit 0 }
$OldUrl=$env:BSK_DAEMON_WS_URL
Push-Location (Join-Path (Split-Path -Parent $PSScriptRoot) 'source')
try {
    & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'pnpm install failed.' }
    & cargo build -p bsk --release --locked
    if ($LASTEXITCODE -ne 0) { throw 'CLI build failed.' }
    $env:BSK_DAEMON_WS_URL='ws://127.0.0.1:52841'
    & pnpm --filter '@browser-skill/extension' build
    if ($LASTEXITCODE -ne 0) { throw 'Extension build failed.' }
} finally {
    $env:BSK_DAEMON_WS_URL=$OldUrl
    Pop-Location
}
