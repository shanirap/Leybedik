@echo off
setlocal

set "APP=C:\LeybedikLocal\App"
if not exist "%APP%\Leybedik.Api.dll" (
  echo Missing %APP%\Leybedik.Api.dll
  echo Run 01-Install-Local.cmd first.
  pause
  exit /b 1
)

cd /d "%APP%"
set ASPNETCORE_ENVIRONMENT=Local
set ASPNETCORE_URLS=http://localhost:5000

echo Starting Leybedik on http://localhost:5000
echo Login: admin@leybedik.local / ChangeMe123!
dotnet Leybedik.Api.dll
