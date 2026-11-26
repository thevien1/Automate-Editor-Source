# 3.1.118

- Record action: chọn port Chromium, bấm để đếm ngược 3 giây, ghi thao tác trong tab web đang mở; bấm Dừng để thêm action vào khối đã chọn. Có thể hủy lúc đếm ngược.
- Ghi click trái, nhập chữ/IME/dán, Enter/Tab/Escape/phím điều hướng, dropdown và cuộn dọc. Lưu cả phần chữ đang gõ khi dừng. Giới hạn 2000 action/phiên và dọn listener khi dừng hoặc đóng cửa sổ.
- Không ghi nội dung ô mật khẩu/OTP; không ghi thao tác ngoài trang web, trong iframe, hộp thoại chọn file, thanh địa chỉ, kéo thả, click chuột phải và tổ hợp phím đặc biệt. Chữ nhập bằng Shift/IME/dán vẫn được lưu qua sự kiện input. Cuộn được chuyển thành action Mouse scroll, không tái hiện chính xác từng pixel. Nếu đổi dự án/nhánh/khối trong lúc ghi, giữ các action để người dùng chọn chèn vào vị trí hiện tại.
- Search mở ngay dưới tab workflow, có số kết quả, nút trước/sau, Enter/Shift+Enter và Escape. Tìm tên action, nội dung, XPath, tham số, điều kiện, ID và số dòng trong cả nhánh chính/nhánh phụ; mở block thu gọn, chọn và cuộn tới kết quả.
- Log action có tên nhánh, khối và số dòng theo Canvas; lỗi/cảnh báo có thêm đường dẫn block, ID node và vị trí gọi nhánh phụ. Lỗi hệ thống ngoài workflow được ghi rõ. Với khối before/after cũ không hiển thị trong tab nhánh phụ, log dùng nhãn “Dòng nội bộ”.
- Bắt ngoại lệ thực thi tại đúng node và tách vị trí log theo từng profile để tránh lẫn nguồn khi chạy nhiều luồng.

Kiểm tra: TypeScript, kiểm thử số dòng/nhánh, hồi quy hiệu năng log và worker Excel, updater/upload. Smoke test Electron trên trang localhost riêng xác nhận sự kiện chuột/phím tin cậy, phần chữ chờ lưu, bỏ qua mật khẩu, dừng và ghi lại không lặp dữ liệu. Chưa kiểm thử trực tiếp trên macOS hoặc các trang web thực tế; XPath có thể cần chỉnh khi website thay đổi DOM.
