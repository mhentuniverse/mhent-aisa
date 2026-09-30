@echo off
title AISA GPU Tunnel - MHEnt Universe (RTX 4050 Dedicated)
color 0b
echo ======================================================================
echo   AISA SANCTUARY - NAMED CLOUDFLARE GPU TUNNEL (aisa-tunnel)
echo   Miyazaki Haruto Entertainment Co., Ltd.
echo ======================================================================
echo.
echo   [*] Dang ket noi card do hoa RTX 4050 (Ollama: 11434) toi Cloudflare Edge...
echo   [*] Domain co dinh: https://gpu.mhentuniverse.com
echo   [*] Vui long giu nguyen cua so nay khi can dung AISA tu xa!
echo.
cloudflared.exe tunnel run --token eyJhIjoiN2U5N2YxNzQ0YzY1ZTVmYTRiYTZlOWU1ZDY5NzY4OTMiLCJ0IjoiYmVjMDdmYWItM2Q4My00MWFkLThmZTctOGRmYzQ0N2FkMTU2IiwicyI6IllUWTBZVEkwTldZdE1ETXpOeTAwWWpaa0xXRmpNamN0WVRFMk1HSmxNMkV4TkRBMCJ9
pause
