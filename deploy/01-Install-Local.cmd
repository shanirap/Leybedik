@echo off
setlocal

set "SOURCE=%~dp0"
set "TARGET=C:\LeybedikLocal\App"
set "DATA=C:\LeybedikLocal\Data"

echo Installing Leybedik Local to %TARGET% ...

if not exist "%TARGET%" mkdir "%TARGET%"
if not exist "%DATA%" mkdir "%DATA%"

xcopy "%SOURCE%*.*" "%TARGET%\" /E /Y /I /Q

if not exist "%TARGET%\appsettings.Local.json" (
  if exist "%TARGET%\appsettings.Local.json.example" (
    copy /Y "%TARGET%\appsettings.Local.json.example" "%TARGET%\appsettings.Local.json" >nul
    echo Created appsettings.Local.json from example. Review JWT key and bootstrap password.
  )
)

echo.
echo Install complete.
echo Next: run 02-Start-Local.cmd
pause
