@echo off
title AISA GPU Tunnel - Cloudflare Quick Tunnel (MHEnt Universe)
color 0b
echo ======================================================================
echo   AISA SANCTUARY - CLOUDFLARE GPU TUNNEL
echo   Miyazaki Haruto Entertainment Co., Ltd.
echo ======================================================================
echo.
echo   [*] Dang ket noi card do hoa RTX 4050 (Ollama: 11434) qua Cloudflare...
echo   [*] Vui long doi vai giay de Cloudflare cap duong link HTTPS...
echo.
cloudflared.exe tunnel --url http://localhost:11434 --http-host-header "localhost:11434"
pause
