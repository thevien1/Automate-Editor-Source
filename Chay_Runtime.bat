@echo off
title SV Browser Automate Runtime v3.1.0-stable
cd /d "%~dp0"
chcp 65001 >nul
echo ======================================================================
echo    ĐANG KHỞI ĐỘNG GIAO DIỆN SV BROWSER AUTOMATE RUNTIME...
echo    (Chế độ bảng điều khiển chạy tự động hóa - Không hiển thị code)
echo ======================================================================
echo.

node ./node_modules/electron/cli.js . --runtime

if %errorlevel% neq 0 (
    echo [ERROR] Co loi khi khoi dong ung dung.
    pause
)
