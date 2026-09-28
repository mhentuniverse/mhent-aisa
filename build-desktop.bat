@echo off
title Build AISA Desktop .exe Installer
echo =========================================================
echo   AISA Sanctuary — Dong goi phan mem .exe cho Windows
echo =========================================================
echo Dang dong goi thanh ban Installer va ban Portable...
set "PATH=C:\Program Files\nodejs;%PATH%"
call npm run dist
echo.
echo =========================================================
echo  HOAN TAT! File cai dat da san sang trong thu muc dist/
echo =========================================================
pause
