# 3.1.115

- Sửa action File upload (type 55) bị lỗi cú pháp JavaScript do chứa TypeScript cast trong biểu thức gửi sang Chromium.
- Hiển thị chi tiết lỗi thực thi biểu thức upload thay vì luôn báo không tìm thấy input file.
- Thêm kiểm tra hồi quy cho XPath input và nhánh tìm nút đính kèm.

Kiểm tra port 53001: file `10.jpg` tồn tại, XPath trong dialog khớp một input file. Không tải ảnh hoặc đăng bài trong quá trình chẩn đoán. Hai bài kiểm tra biểu thức upload và biên dịch Electron đã qua.
