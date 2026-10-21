@echo off
title Lamina - Connect local Ollama
echo.
echo Lamina Anatomy Studio - local tutor connection
echo.
echo This helper adds https://rorrimaesu.github.io to your user
echo OLLAMA_ORIGINS setting, preserving existing entries.
echo It allows websites under that origin to call your local Ollama.
echo It does not change the local bind address or stop running chats.
echo No model or software is installed by this helper.
echo.
choice /C YN /N /M "Apply this connection setting? [Y/N] "
if errorlevel 2 exit /b 0
powershell.exe -NoProfile -Command "$origin='https://rorrimaesu.github.io'; $existing=[Environment]::GetEnvironmentVariable('OLLAMA_ORIGINS','User'); $parts=@($existing -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }); if ($parts -notcontains $origin) { $parts += $origin }; [Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS',($parts -join ','),'User'); Write-Output 'Connection setting saved.'"
if errorlevel 1 (
  echo The setting could not be saved. Use the manual steps in the app.
  pause
  exit /b 1
)
echo.
echo Quit Ollama from its system-tray icon and reopen it from Start.
echo Then return to Lamina, choose Connect, and select a downloaded model.
echo If your browser asks, allow local-network access for this site.
echo.
pause
