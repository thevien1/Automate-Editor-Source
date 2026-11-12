# macOS support — ghi nhớ khi sửa code

## Những phần đã bổ sung

- `npm run dist:mac`: build DMG + ZIP universal (Intel x64 và Apple Silicon arm64), giữ nguyên version để dùng chung một release với Windows. Chạy trên macOS.
- `platformSupport.ts`: tìm binary Chrome/Chromium/Edge trong `/Applications` và `~/Applications`. Không gọi file Windows `.exe` trên Mac.
- macOS xuất workflow thành `.svblaunch` và `.command`, sử dụng Editor đã cài để chạy Runtime. Không dùng trình biên dịch C# Windows trên Mac.
- Finder mở `.svblaunch`/`.gpmlaunch` qua `open-file`, kể cả lúc app chưa ready. Dock mở lại cửa sổ khi app vẫn đang chạy.
- Python helpers được copy ra `Contents/Resources/scripts`, vì Python không đọc script bên trong `app.asar`. Mac gọi `python3`.
- Native mouse click trên Mac dùng Quartz. Hộp thoại JavaScript dùng CDP; hộp thoại native cài extension hiện cần xác nhận thủ công trên Mac.
- Đường dẫn thư mục build dùng dấu `/`, tên project đọc được cả hai loại dấu phân cách. Mac giữ nguyên đường dẫn upload do người dùng nhập.
- Fallback dữ liệu SV Browser lấy `appData/sv-browser/SVBrowserData/profiles.json` ở main process. Ưu tiên API profile; không dùng `process.env.APPDATA` trong renderer.
- Updater hỗ trợ macOS. Giữ DMG, ZIP, blockmaps và `latest-mac.yml` đúng cùng một build/version. Không thay thế `latest.yml` của Windows bằng manifest Mac.
- Prepare build Mac không chạy PowerShell/taskkill và không xóa artifact Windows; build Windows giữ artifact Mac. Đồng bộ version trong package-lock.

## Build trên Mac

```sh
npm ci
npm run dist:mac
```

Kết quả trong `release/`: `SV-Browser-Automate-Editor-<version>-mac-universal.dmg`, ZIP và manifest Mac. Mở DMG, kéo ứng dụng vào Applications, chạy từ Applications. Cài Chrome bản macOS để dùng chế độ Chrome/CDP.

Đã thêm workflow GitHub Actions **Build macOS** (chạy thủ công, không tự publish). Sau khi push code, mở Actions → Build macOS → Run workflow, tải artifact macOS-universal.

Để ký và notarize, cấu hình repository secrets: `MAC_CSC_LINK` (Developer ID Application .p12 dạng base64 hoặc URL), `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Không commit chứng chỉ/mật khẩu. Bản phát hành cho người dùng nên được ký + notarize; tự cập nhật trên Mac cần code signing. Không có chứng chỉ thì chỉ tạo bản thử nghiệm chưa ký; không xem đó là bản phát hành auto-update hoàn chỉnh.

## Các phụ thuộc và giới hạn cần kiểm thử thật

- SV Browser/GPM bên ngoài và Chromium drivers phải có bản macOS phù hợp kiến trúc. Editor không chuyển được driver `.exe` Windows thành bản Mac. Các API localhost phải có dịch vụ đang chạy trên Mac.
- Không sửa hay di chuyển driver của GPMLoginGlobal trong đợt thay đổi này.
- Image matching cần Python 3 cùng `opencv-python`, `numpy`, `Pillow` (và quyền Screen Recording khi chụp màn hình desktop).
- OS click cần Python 3 + `pyobjc-framework-Quartz`, và quyền Accessibility cho ứng dụng/helper. CDP click trên trang web không cần helper này.
- Workflow chuyển từ Windows cần đổi đường dẫn ổ C:/D: thành đường dẫn file thật trên Mac.
- Chưa có máy Mac trong phiên làm việc này. Chưa xác nhận thực tế: mở DMG trên cả Intel/Apple Silicon, launch Chrome và chạy workflow, Finder mở gói, quyền Screen Recording/Accessibility, cập nhật giữa hai bản đã ký. CI tạo artifact cũng chưa được chạy/push.

## Kiểm tra trước khi phát hành

```sh
node --test scripts/test-platform-support.cjs scripts/test-app-updater.cjs scripts/test-runtime-stop.cjs scripts/test-update-scheduler.cjs
npm run build
npx tsc -p tsconfig.electron.json
```

Không xóa các nhánh Windows khi sửa Mac; không bật lại lời nhắc cài đặt lần hai. Chạy thử thực tế trên Mac trước khi thông báo hỗ trợ đầy đủ.
