# 3.1.114

- Bổ sung mã nguồn hỗ trợ macOS Intel và Apple Silicon: tìm Chrome/Chromium/Edge, xử lý đường dẫn và mở gói kịch bản từ Finder.
- Thêm cấu hình DMG/ZIP universal và workflow GitHub Actions Build macOS. Bộ cài Mac được build riêng trên macOS; không nằm trong bộ cài Windows.
- macOS xuất kịch bản thành gói `.svblaunch` và trình mở `.command`, dùng Editor đã cài để chạy Runtime.
- Bổ sung backend thao tác chuột macOS qua Quartz (cần Python và quyền Accessibility); hộp thoại native cài extension trên Mac hiện cần xác nhận thủ công.
- Hỗ trợ updater macOS khi ứng dụng được ký đúng chứng chỉ và release có đầy đủ ZIP/manifest Mac.
- Đưa Python helpers ra thư mục resources để chạy được trong ứng dụng đóng gói.
- Đồng bộ phiên bản package-lock khi build và giữ riêng artifact Windows/macOS.

Đã qua 18 bài kiểm tra hồi quy và biên dịch. Chưa kiểm thử trực tiếp bộ cài, workflow và cập nhật trên máy Mac. Driver Chromium Windows không dùng được trên macOS; cần browser/driver dành cho Mac.
