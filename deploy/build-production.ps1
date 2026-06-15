#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = Split-Path $PSScriptRoot -Parent
$ClientDir = Join-Path $Root "client"
$ApiDir = Join-Path $Root "server\Leybedik.Api"
$TestsDir = Join-Path $Root "server\Leybedik.Api.Tests"
$WwwRoot = Join-Path $ApiDir "wwwroot"
$OutDir = Join-Path $PSScriptRoot "out\LeybedikLocal"
$ZipPath = Join-Path $PSScriptRoot "LeybedikLocal-win-x64.zip"

Write-Host "==> Client: install, test, build"
Push-Location $ClientDir
npm ci
if ($LASTEXITCODE -ne 0) {
  Write-Warning "npm ci failed; falling back to npm install"
  npm install
  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed"
  }
}
npm test
if ($LASTEXITCODE -ne 0) { throw "client tests failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "client build failed" }
Pop-Location

Write-Host "==> Copy client dist to wwwroot"
if (Test-Path $WwwRoot) {
  Remove-Item $WwwRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $WwwRoot | Out-Null
Copy-Item (Join-Path $ClientDir "dist\*") $WwwRoot -Recurse

Write-Host "==> Server: test"
Push-Location $TestsDir
dotnet test
if ($LASTEXITCODE -ne 0) { throw "server tests failed" }
Pop-Location

Write-Host "==> Server: publish win-x64"
if (Test-Path $OutDir) {
  Remove-Item $OutDir -Recurse -Force
}
dotnet publish $ApiDir\Leybedik.Api.csproj `
  -c Release `
  -r win-x64 `
  --self-contained false `
  -o $OutDir

$LocalSettingsExample = Join-Path $ApiDir "appsettings.Local.json.example"
$LocalSettingsTarget = Join-Path $OutDir "appsettings.Local.json.example"
if (Test-Path $LocalSettingsExample) {
  Copy-Item $LocalSettingsExample $LocalSettingsTarget -Force
}

foreach ($file in @("01-Install-Local.cmd", "02-Start-Local.cmd", "README-INSTALL.txt")) {
  Copy-Item (Join-Path $PSScriptRoot $file) (Join-Path $OutDir $file) -Force
}

Write-Host "==> Create ZIP"
if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}
Compress-Archive -Path (Join-Path $OutDir "*") -DestinationPath $ZipPath -Force

Write-Host "Done: $ZipPath"
