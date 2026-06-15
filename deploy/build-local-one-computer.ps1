#Requires -Version 5.1
<#
.SYNOPSIS
  Builds a fully self-contained, single-PC Windows package of Leybedik.
  No Node, no .NET Runtime, no SQL Server required on the target machine.

.NOTES
  Config section names verified against source code:
    BootstrapUser  -- Options/BootstrapUserOptions.cs  SectionName = "BootstrapUser"
    Jwt.Key        -- Settings/JwtSettings.cs           Key / Issuer / Audience / ExpiresDays
    Database       -- Options/DatabaseOptions.cs
    Storage        -- not yet wired in app code; included as forward-compatible placeholder

.USAGE
  From the project root:
    powershell -ExecutionPolicy Bypass -File deploy\build-local-one-computer.ps1
#>

$ErrorActionPreference = "Stop"

# ── Resolve paths relative to this script's parent (project root) ────────────
$Root       = Split-Path $PSScriptRoot -Parent
$ClientDir  = Join-Path $Root "client"
$ServerDir  = Join-Path $Root "server"
$ApiProj    = Join-Path $Root "server\Leybedik.Api\Leybedik.Api.csproj"
$ApiSrcDir  = Join-Path $Root "server\Leybedik.Api"
$WwwRoot    = Join-Path $ApiSrcDir "wwwroot"
$ClientDist = Join-Path $ClientDir "dist"

$PublishRoot = Join-Path $Root "publish"
$PublishApi  = Join-Path $PublishRoot "Leybedik.Api"
$StageRoot   = Join-Path $PublishRoot "local-package\Leybedik-Local-One-Computer"
$StageApi    = Join-Path $StageRoot "Leybedik.Api"
$ZipPath     = Join-Path $PublishRoot "Leybedik-Local-One-Computer.zip"

$DeployDir   = $PSScriptRoot  # deploy/ folder — source for README

function Write-Step  { param($msg) Write-Host ""; Write-Host "==> $msg" }
function Write-OK    { param($msg) Write-Host "    [OK]  $msg" }
function Write-Check {
  param([string]$label, [string]$path)
  if (Test-Path $path) {
    Write-Host "  [OK]      $label"
  } else {
    Write-Host "  [MISSING] $label  ($path)"
    $script:CheckFailed = $true
  }
}

# ════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "============================================================"
Write-Host " Leybedik -- Build Local One-Computer Package"
Write-Host "============================================================"

# ── 1. Guard: required source directories ────────────────────────────────────
Write-Step "Checking project structure..."
$missing = @()
if (-not (Test-Path $ClientDir)) { $missing += "client/" }
if (-not (Test-Path $ServerDir)) { $missing += "server/" }
if (-not (Test-Path $PSScriptRoot)) { $missing += "deploy/" }
if (-not (Test-Path $ApiProj)) { $missing += "server/Leybedik.Api/Leybedik.Api.csproj" }
if ($missing.Count -gt 0) {
  Write-Error ("Missing required paths:`n  " + ($missing -join "`n  ") + "`nAborting.")
  exit 1
}
Write-OK "client/  server/  deploy/  Leybedik.Api.csproj"

# ── 2. Stop Leybedik.Api.exe — not dotnet.exe globally ──────────────────────
Write-Step "Stopping any running Leybedik.Api.exe..."
$running = Get-Process -Name "Leybedik.Api" -ErrorAction SilentlyContinue
if ($running) {
  $running | Stop-Process -Force
  Start-Sleep -Seconds 2
  Write-OK "Stopped $($running.Count) process(es)"
} else {
  Write-OK "None running"
}

# ── 3. Clean old publish outputs only (not source) ───────────────────────────
Write-Step "Cleaning old publish outputs..."
foreach ($p in @($PublishApi, "$PublishRoot\local-package", $ZipPath)) {
  if (Test-Path $p) {
    Remove-Item $p -Recurse -Force
    Write-Host "    Removed: $p"
  }
}
Write-OK "Done"

# ── 4. Build frontend ─────────────────────────────────────────────────────────
Write-Step "Client: npm ci..."
Push-Location $ClientDir
try {
  npm ci
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "npm ci failed (file-lock?); retrying with npm install"
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed (exit $LASTEXITCODE)" }
  }

  Write-Step "Client: npm run build..."
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed (exit $LASTEXITCODE)" }
} finally {
  Pop-Location
}

# ── 5. Validate dist ──────────────────────────────────────────────────────────
Write-Step "Validating client/dist..."
foreach ($p in @("$ClientDist\index.html", "$ClientDist\assets")) {
  if (-not (Test-Path $p)) {
    Write-Error "Expected after npm build but missing: $p`nAborting."
    exit 1
  }
}
Write-OK "client/dist/index.html + assets"

# ── 6-8. Replace wwwroot only after dist is confirmed ────────────────────────
Write-Step "Replacing server/Leybedik.Api/wwwroot from fresh dist..."
if (Test-Path $WwwRoot) { Remove-Item $WwwRoot -Recurse -Force }
New-Item -ItemType Directory -Path $WwwRoot | Out-Null
Copy-Item "$ClientDist\*" $WwwRoot -Recurse -Force

foreach ($p in @("$WwwRoot\index.html", "$WwwRoot\assets")) {
  if (-not (Test-Path $p)) {
    Write-Error "wwwroot copy incomplete, missing: $p`nAborting."
    exit 1
  }
}
Write-OK "wwwroot/index.html + assets"

# ── 9. dotnet publish: self-contained win-x64 ────────────────────────────────
Write-Step "dotnet publish (self-contained win-x64)..."
New-Item -ItemType Directory -Path $PublishApi | Out-Null
dotnet publish $ApiProj `
  -c Release `
  -r win-x64 `
  --self-contained true `
  -o $PublishApi `
  /p:PublishSingleFile=false
if ($LASTEXITCODE -ne 0) {
  Write-Error "dotnet publish failed (exit $LASTEXITCODE). Aborting."
  exit 1
}

# ── 10. Validate publish output ───────────────────────────────────────────────
Write-Step "Validating publish output..."
foreach ($p in @(
    "$PublishApi\Leybedik.Api.exe",
    "$PublishApi\Leybedik.Api.dll",
    "$PublishApi\wwwroot\index.html",
    "$PublishApi\wwwroot\assets"
  )) {
  if (-not (Test-Path $p)) {
    Write-Error "Missing after dotnet publish: $p`nAborting."
    exit 1
  }
}
Write-OK "exe  dll  wwwroot/index.html  wwwroot/assets"

# ── 11. Write appsettings.Local.json ─────────────────────────────────────────
#   Section names match source code:
#     BootstrapUser (not BootstrapAdmin)  -- BootstrapUserOptions.cs
#     Jwt.Key / ExpiresDays              -- JwtSettings.cs
Write-Step "Writing appsettings.Local.json..."

$settingsLines = @(
  '{',
  '  "AllowedHosts": "*",',
  '  "AllowedOrigins": [],',
  '  "Database": {',
  '    "Provider": "Sqlite",',
  '    "AutoMigrate": true',
  '  },',
  '  "ConnectionStrings": {',
  '    "DefaultConnection": "Data Source=C:\\\\LeybedikLocal\\\\Data\\\\leybedik.db"',
  '  },',
  '  "Registration": {',
  '    "Enabled": false',
  '  },',
  '  "BootstrapUser": {',
  '    "Enabled": true,',
  '    "Email": "admin@leybedik.local",',
  '    "Password": "ChangeMe123!",',
  '    "DisplayName": "\u05de\u05e0\u05d4\u05dc \u05de\u05e2\u05e8\u05db\u05ea"',
  '  },',
  '  "Jwt": {',
  '    "Key": "LOCAL_DEVELOPMENT_SECRET_CHANGE_ME_123456789_Leybedik_Local_2026",',
  '    "Issuer": "LeybedikLocal",',
  '    "Audience": "LeybedikLocal",',
  '    "ExpiresDays": 7',
  '  },',
  '  "ScanImport": {',
  '    "Enabled": false,',
  '    "Provider": "Mock"',
  '  },',
  '  "AiScanImport": {',
  '    "Provider": "Gemini",',
  '    "Model": "gemini-2.5-flash",',
  '    "Endpoint": "https://generativelanguage.googleapis.com"',
  '  },',
  '  "Storage": {',
  '    "Provider": "Local",',
  '    "LocalRoot": "C:\\\\LeybedikLocal\\\\Files"',
  '  }',
  '}'
)
$settingsJson = $settingsLines -join "`n"
[System.IO.File]::WriteAllText(
  (Join-Path $PublishApi "appsettings.Local.json"),
  $settingsJson,
  [System.Text.Encoding]::UTF8
)
Write-OK "appsettings.Local.json"

# ── 12. Stage: copy publish → package tree ────────────────────────────────────
Write-Step "Staging package..."
New-Item -ItemType Directory -Path $StageApi -Force | Out-Null
Copy-Item "$PublishApi\*" $StageApi -Recurse -Force
Write-OK "Leybedik.Api copied to stage"

# ── 13. Write 01-Install-Local.cmd ────────────────────────────────────────────
Write-Step "Writing 01-Install-Local.cmd..."
$installLines = @(
  '@echo off',
  'setlocal',
  '',
  'echo ==========================================',
  'echo Leybedik Local - Install',
  'echo ==========================================',
  'echo.',
  '',
  'set "INSTALL_ROOT=C:\LeybedikLocal"',
  'set "APP_DIR=%INSTALL_ROOT%\App"',
  'set "DATA_DIR=%INSTALL_ROOT%\Data"',
  'set "FILES_DIR=%INSTALL_ROOT%\Files"',
  'set "SOURCE_APP=%~dp0Leybedik.Api"',
  '',
  'echo Stopping existing Leybedik process if running...',
  'taskkill /IM Leybedik.Api.exe /F >nul 2>nul',
  'timeout /t 2 /nobreak >nul',
  '',
  'if not exist "%SOURCE_APP%\Leybedik.Api.exe" (',
  '  echo ERROR: Leybedik.Api.exe was not found in the package.',
  '  echo Expected path:',
  '  echo %SOURCE_APP%\Leybedik.Api.exe',
  '  pause',
  '  exit /b 1',
  ')',
  '',
  'if not exist "%SOURCE_APP%\wwwroot\index.html" (',
  '  echo ERROR: Frontend index.html was not found in the package.',
  '  echo Expected path:',
  '  echo %SOURCE_APP%\wwwroot\index.html',
  '  pause',
  '  exit /b 1',
  ')',
  '',
  'if not exist "%INSTALL_ROOT%" mkdir "%INSTALL_ROOT%"',
  'if not exist "%DATA_DIR%"   mkdir "%DATA_DIR%"',
  'if not exist "%FILES_DIR%"  mkdir "%FILES_DIR%"',
  '',
  'echo.',
  'echo Removing old application files...',
  'if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"',
  '',
  'if exist "%APP_DIR%" (',
  '  echo ERROR: Could not remove the old application folder.',
  '  echo Please close all Leybedik windows and try again.',
  '  echo If the problem continues, run this installer as Administrator.',
  '  pause',
  '  exit /b 1',
  ')',
  '',
  'mkdir "%APP_DIR%"',
  '',
  'echo.',
  'echo Copying new application files...',
  'xcopy /E /I /Y "%SOURCE_APP%\*" "%APP_DIR%\"',
  '',
  'if errorlevel 1 (',
  '  echo ERROR: Copy failed.',
  '  pause',
  '  exit /b 1',
  ')',
  '',
  'if not exist "%APP_DIR%\Leybedik.Api.exe" (',
  '  echo ERROR: Leybedik.Api.exe was not copied.',
  '  pause',
  '  exit /b 1',
  ')',
  '',
  'if not exist "%APP_DIR%\wwwroot\index.html" (',
  '  echo ERROR: Frontend files were not copied.',
  '  pause',
  '  exit /b 1',
  ')',
  '',
  'if not exist "%APP_DIR%\appsettings.Local.json" (',
  '  echo ERROR: appsettings.Local.json was not copied.',
  '  pause',
  '  exit /b 1',
  ')',
  '',
  'echo.',
  'echo Installation completed successfully.',
  'echo.',
  'echo Next step:',
  'echo Run 02-Start-Local.cmd',
  'echo.',
  'pause'
)
$installContent = $installLines -join "`r`n"
[System.IO.File]::WriteAllText(
  (Join-Path $StageRoot "01-Install-Local.cmd"),
  $installContent,
  [System.Text.Encoding]::GetEncoding(1252)
)
Write-OK "01-Install-Local.cmd"

# ── 14. Write 02-Start-Local.cmd ──────────────────────────────────────────────
Write-Step "Writing 02-Start-Local.cmd..."
$startLines = @(
  '@echo off',
  'setlocal',
  '',
  'echo ==========================================',
  'echo Leybedik Local - Start',
  'echo ==========================================',
  'echo.',
  '',
  'set "APP_DIR=C:\LeybedikLocal\App"',
  'set "APP_EXE=%APP_DIR%\Leybedik.Api.exe"',
  '',
  'if not exist "%APP_EXE%" (',
  '  echo ERROR: Leybedik is not installed.',
  '  echo Please run 01-Install-Local.cmd first.',
  '  pause',
  '  exit /b 1',
  ')',
  '',
  'if not exist "%APP_DIR%\wwwroot\index.html" (',
  '  echo ERROR: Frontend files are missing.',
  '  echo Please run 01-Install-Local.cmd again.',
  '  pause',
  '  exit /b 1',
  ')',
  '',
  'cd /d "%APP_DIR%"',
  '',
  'set ASPNETCORE_ENVIRONMENT=Local',
  'set ASPNETCORE_URLS=http://localhost:5000',
  '',
  'echo Starting Leybedik...',
  'echo.',
  'echo When you see "Now listening on: http://localhost:5000",',
  'echo open this address in your browser:',
  'echo http://localhost:5000',
  'echo.',
  'echo Do not close this window while using the system.',
  'echo.',
  '',
  '"%APP_EXE%"',
  '',
  'echo.',
  'echo Leybedik has stopped.',
  'pause'
)
$startContent = $startLines -join "`r`n"
[System.IO.File]::WriteAllText(
  (Join-Path $StageRoot "02-Start-Local.cmd"),
  $startContent,
  [System.Text.Encoding]::GetEncoding(1252)
)
Write-OK "02-Start-Local.cmd"

# ── 15. Copy README-LOCAL-HE.txt from deploy/ ────────────────────────────────
Write-Step "Copying README-LOCAL-HE.txt..."
$readmeSrc = Join-Path $DeployDir "README-LOCAL-HE.txt"
if (-not (Test-Path $readmeSrc)) {
  Write-Error "deploy/README-LOCAL-HE.txt not found. Aborting."
  exit 1
}
$readmeBytes = [System.IO.File]::ReadAllBytes($readmeSrc)
# Ensure UTF-8 BOM so Windows Notepad displays Hebrew correctly
$utf8Bom = [System.Text.UTF8Encoding]::new($true)
$readmeText = [System.IO.File]::ReadAllText($readmeSrc, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText(
  (Join-Path $StageRoot "README-LOCAL-HE.txt"),
  $readmeText,
  $utf8Bom
)
Write-OK "README-LOCAL-HE.txt"

# ── 16. Create final ZIP ──────────────────────────────────────────────────────
Write-Step "Creating ZIP: $ZipPath"
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
New-Item -ItemType Directory -Path $PublishRoot -Force | Out-Null

# Give Windows Defender / file system a moment to release any recently-written DLLs
Start-Sleep -Seconds 3

# Use .NET ZipFile directly (more reliable than Compress-Archive for large trees)
Add-Type -AssemblyName System.IO.Compression.FileSystem
# Zip local-package/ (parent of StageRoot) so the ZIP root entry is Leybedik-Local-One-Computer/
$StageParent = Split-Path $StageRoot -Parent
[System.IO.Compression.ZipFile]::CreateFromDirectory($StageParent, $ZipPath)
$sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
Write-OK "Created (${sizeMB} MB)"

# ── 17. Final checks ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================"
Write-Host " Build complete -- Final checks"
Write-Host "============================================================"
Write-Host " ZIP: $ZipPath"
Write-Host " Size: ${sizeMB} MB"
Write-Host ""

$script:CheckFailed = $false

Write-Check "Leybedik.Api.exe"        "$StageApi\Leybedik.Api.exe"
Write-Check "Leybedik.Api.dll"        "$StageApi\Leybedik.Api.dll"
Write-Check "wwwroot/index.html"      "$StageApi\wwwroot\index.html"
Write-Check "wwwroot/assets"          "$StageApi\wwwroot\assets"
Write-Check "appsettings.Local.json"  "$StageApi\appsettings.Local.json"
Write-Check "01-Install-Local.cmd"    "$StageRoot\01-Install-Local.cmd"
Write-Check "02-Start-Local.cmd"      "$StageRoot\02-Start-Local.cmd"
Write-Check "README-LOCAL-HE.txt"     "$StageRoot\README-LOCAL-HE.txt"

Write-Host ""
if ($script:CheckFailed) {
  Write-Host "  *** One or more checks FAILED. See above. ***"
  Write-Host "============================================================"
  exit 1
}

Write-Host "  All checks passed."
Write-Host "============================================================"
Write-Host ""
