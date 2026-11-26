# 3.1.119 — macOS test

Bao gồm Record action đếm ngược 3 giây, tìm kiếm workflow và log theo dòng/nhánh của 3.1.118 (xem RELEASE_NOTES_3.1.118.md).

- Sửa quy trình phát hành Mac: tự tạo Release thử nghiệm khi chưa có, kiểm tra tag trỏ đúng commit và không ghi đè bộ file đã phát hành khi chạy lại.
- Build universal cho Intel/Apple Silicon trên GitHub Actions.
- Thêm kiểm tra MCP từ app.asar và ghi chuột/phím trên trang localhost riêng bằng Electron ngay trên macOS trước khi upload.

Đây là bản thử nghiệm chưa ký Developer ID / chưa notarize. Tự cập nhật trên Mac cần chữ ký Apple phù hợp. Không thay đổi các tag/bộ cài 3.1.117 và 3.1.118 đã có.
