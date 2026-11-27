# Quy ước build do người dùng yêu cầu

- Khi người dùng nói “build”, build cả Windows và macOS, trừ khi họ chỉ định nền tảng khác.
- Đẩy mã nguồn lên `thevien1/Automate-Editor-Source`, tạo tag phiên bản đúng commit và chạy GitHub Actions build macOS; theo dõi đến khi có bộ cài trong Release.
- Không ghi đè hoặc di chuyển tag đã tồn tại. Nếu phiên bản đã được dùng cho commit khác, chọn số phiên bản mới và thông báo.
- Gom bộ cài theo `release/<version>/windows`, `portable`, `mac`. Kiểm tra checksum trước khi giao file.
- Nút Search trước/sau cần gọn, cân đối với ô nhập (32 × 32 px, icon 20 px), tránh phóng lớn quá mức.
