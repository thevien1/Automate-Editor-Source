# Phát hành cập nhật Windows

Ứng dụng cài bằng NSIS Setup kiểm tra GitHub Releases sau khi mở khoảng 2 giây hoặc khi người dùng kiểm tra thủ công. Bản mới được tải trong nền, kiểm tra checksum bởi electron-updater và hiển thị tiến độ. Khi người dùng bấm **Cài đặt và khởi động lại**, app cài và tự mở lại ngay, không hỏi xác nhận lần hai. Không tự đóng chỉ vì tải xong. Người dùng cần lưu dự án trước khi bấm nút cài.

Từ 3.1.110: tự kiểm tra lại sau lần đầu 30 giây, sau đó mỗi 5 phút. Khi quay lại cửa sổ (kết quả cũ ít nhất 30 giây) hoặc có mạng trở lại cũng kiểm tra lại. Các yêu cầu dùng chung một lần kiểm tra đang chạy. Trạng thái tải được đồng bộ lên màn hình chính; thông báo tự mở một lần cho mỗi phiên bản, không liên tục mở lại khi người dùng đã đóng. Cờ có cập nhật dựa trên so sánh phiên bản trả về, không dựa vào thời điểm phát sự kiện. Request gửi no-cache để giảm nguy cơ đọc kết quả cache cũ.

## Build và phát hành

### Thư mục phát hành theo phiên bản

Sau mỗi lần build thành công, script tự gom file vào `release/<version>/`:

```text
release/3.1.114/
  windows/          # Upload toàn bộ 3 file trong đây vào GitHub Release
  portable/         # Bản portable tùy chọn, không thay thế Windows Setup
  mac/              # Xuất hiện sau khi build trên Mac/GitHub Actions
  RELEASE_NOTES.md  # Nội dung để dán vào phần mô tả Release
```

Các thư mục phiên bản cũ được giữ lại khi build bản mới. Không upload `win-unpacked`, `builder-debug.yml` hay cả thư mục mã nguồn làm bộ cài. Thư mục `release/` vẫn được gitignore: tải các file trong `windows/` và `mac/` lên **Releases → Attach binaries**, không commit bộ cài vào repository nguồn.

Nếu đã build xong, chạy `npm run release:collect` để gom lại bản Windows hiện tại mà không build hay tăng version. Mac dùng `node scripts/collect-release.cjs --mac`. Script kiểm tra version, dung lượng và SHA512 của các file trong manifest trước khi copy.

### Bản 3.1.114 và hai repository

Code nguồn hiện trỏ tới `thevien1/Automate-Editor-Source`. App kiểm tra cập nhật từ **GitHub Releases của `thevien1/Automate-Editor`**. Chỉ commit/push code lên repository nguồn sẽ không làm app báo cập nhật.

Windows: tạo release tag `3.1.114` ở repository phát hành, tải đủ ba file sau từ `release/`, rồi Publish release ổn định (không Draft, không Prerelease, đặt làm Latest):

- `SV-Browser-Automate-Editor-Setup-3.1.114.exe`
- `SV-Browser-Automate-Editor-Setup-3.1.114.exe.blockmap`
- `latest.yml`

Máy đang cài bản thấp hơn mới nhận được thông báo. Máy đã cài 3.1.114 sẽ không báo cập nhật lên chính 3.1.114. Sau khi publish, mở app cũ: lần đầu kiểm tra sau khoảng 2 giây, có retry sau 30 giây và kiểm tra định kỳ 5 phút. Khi gói tải xong, bấm cập nhật để cài và tự khởi động lại.

macOS: push code (bao gồm `.github/workflows/build-mac.yml`, `build/entitlements.mac.plist` và package-lock) lên repository nguồn. Vào Actions → Build macOS → Run workflow trên nhánh vừa push. Workflow build trên máy Mac của GitHub, giữ nguyên version trong package.json, rồi cung cấp artifact `macOS-universal`. Tải artifact, giải nén và đưa DMG, ZIP, các blockmap cùng `latest-mac.yml` vào **cùng release 3.1.114** ở `Automate-Editor`. Giữ cả `latest.yml` Windows. Workflow không tự upload/publish release.

Muốn cập nhật trực tiếp trên Mac, ứng dụng phải được ký bằng Developer ID Application (cùng Apple Team cho các bản tiếp theo). Cấu hình secrets trong repository nguồn theo `MACOS_SUPPORT.md` trước khi chạy build phát hành. Nếu chưa có chứng chỉ thì bản Mac chỉ là bản thử nghiệm chưa ký; chưa sử dụng được luồng tự cập nhật đầy đủ. Cần cài bản Mac đầu tiên trước, sau đó mới cập nhật lên các phiên bản cao hơn.

1. Chạy `npm run dist:win` để tăng phiên bản và đóng gói.
2. Tạo GitHub Release công khai tại `thevien1/Automate-Editor`, tag trùng phiên bản, ví dụ `v3.1.102`.
3. Đính kèm **Setup .exe**, file **Setup .exe.blockmap** và **latest.yml** từ cùng một lần build trong `release/`. Giữ nguyên tên file; không sửa checksum trong latest.yml. Portable có thể đính kèm thêm nhưng không được dùng thay Setup.
4. Publish release sau khi tải đủ các file. Updater chỉ dùng release ổn định, không dùng draft/prerelease.

Không cần đặt GitHub token trong ứng dụng. Nếu dùng chứng chỉ ký mã cho bản phát hành, giữ cùng publisher cho các phiên bản kế tiếp.

## Chuyển từ phiên bản cũ

Các bản đã phát hành trước khi tích hợp updater vẫn chỉ mở link. Người dùng cần cài Setup có updater một lần; những lần sau tải và cài trực tiếp trong app. Portable và chế độ phát triển chưa hỗ trợ tự cập nhật.

## Kiểm thử trước khi phát hành rộng

Cài Setup phiên bản A trên máy Windows thử nghiệm. Phát hành phiên bản B cao hơn với đủ ba file trên. Mở A, kiểm tra tải nền và tiến độ; đóng/mở bảng cập nhật trong lúc tải, kiểm tra lại nhiều lần để chắc chắn không tải trùng. Thử mất mạng và thử lại. Khi tải xong, lưu dự án rồi bấm cài một lần; kiểm tra không có hộp xác nhận thứ hai và app tự mở ở phiên bản B, dữ liệu dự án vẫn đọc được. Không thể xác minh quá trình thay file chỉ bằng dev server.
