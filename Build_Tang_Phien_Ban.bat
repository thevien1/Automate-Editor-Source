@echo off
title Build va Tu Dong Tang Phien Ban - SV Browser Automate Editor
cd /d "%~dp0"
chcp 65001 >nul

echo ======================================================================
echo    BẮT ĐẦU BUILD VÀ TỰ ĐỘNG TĂNG PHIÊN BẢN (3.1.10 -> 3.1.11 -> ...)
echo ======================================================================
echo.

call npm run dist:win

if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo    BUILD THÀNH CÔNG! FILE EXE MỚI ĐÃ SẴN SÀNG TRONG THƯ MỤC release/
    echo ======================================================================
    explorer "%~dp0release"
) else (
    echo.
    echo [ERROR] Quá trình build gặp lỗi! Vui lòng kiểm tra lỗi hiển thị ở trên.
)
pause
