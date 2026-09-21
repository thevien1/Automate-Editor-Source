# 📘 Hướng Dẫn Toàn Diện: Sử Dụng Biến, Ánh Xạ Excel & TXT, Tách Chuỗi Tài Khoản trong GPM Automate

Tài liệu này được thiết kế để bạn có thể đọc tham khảo trực tiếp, hoặc **copy xuất bản lên website hướng dẫn, blog công nghệ, tài liệu hướng dẫn sử dụng (Docs/GitBook) cho phần mềm GPM Automate**.

---

## 📌 Tóm Tắt Nhanh Các Biến Chuẩn

| Trường Hợp | Biến Gọi Tương Ứng | Ví Dụ Giá Trị |
| :--- | :--- | :--- |
| **Excel Cột A** | `$col_A` hoặc `$A` | `user01@gmail.com` |
| **Excel Cột B** | `$col_B` hoặc `$B` | `MatKhau@2026` |
| **Excel Cột C** | `$col_C` hoặc `$C` | `JBSWY3DPEHPK3PXP` |
| **Excel Cột D** | `$col_D` hoặc `$D` | `https://site.com` |
| **File Text Nguyên Dòng** | `$txt_line` hoặc `$line` | `user01\|pass123\|JBSWY3DPEHPK3PXP` |
| **Sau Khi Tách Chuỗi (Split)** | `$email`, `$password`, `$code_2fa` | Tự động gán theo từng phần tử |
| **Mã Xác Thực 2FA TOTP** | `$two_factor_code` hoặc `$otp` | `492018` (Mã 6 chữ số đổi mỗi 30s) |
| **Tên Profile Đang Chạy** | `$profileName` | `Profile_001` |

---

## 1. Cơ Chế Hoạt Động Của Biến Trong GPM Automate

### 1.1. Cách Gọi Biến
Trong bất kỳ trường dữ liệu nào của GPM Automate:
- Bạn chỉ cần gõ ký tự `$` (ví dụ `$col_A`, `$email`), hệ thống sẽ bật khung danh sách gợi ý kèm nhãn danh mục rõ ràng:
  - 🟢 **[Excel]**: Biến ánh xạ từ file Excel (`$col_A`, `$col_B`...).
  - 🔵 **[TXT]**: Biến đọc từ file Text (`$txt_line`, `$line_1`...).
  - 🟣 **[Data]**: Biến dữ liệu tài khoản (`$email`, `$password`, `$code_2fa`...).
  - ⚪ **[System]**: Biến trạng thái luồng & profile (`$profileName`, `$threadId`...).
  - 🟡 **[Custom]**: Biến do bạn tự định nghĩa trong workflow.

### 1.2. Tab "Variables" Bên Cạnh "Actions"
- Nhấp vào tab **Variables** ở thanh công cụ bên trái giao diện chính để xem danh mục tất cả biến.
- Nhấp chuột vào bất kỳ biến nào để **copy ngay lập tức** (ví dụ `$col_A`) để dán vào ô nhập liệu cần thiết.

---

## 2. Làm Việc Với File Excel: Tự Động Ánh Xạ Cột `$col_A`, `$col_B`...

### 2.1. Cấu hình tại Bước 2 (Configure)
1. Tích chọn **`[x] Use input Excel`**.
2. Bấm **`Browse...`** và chọn file Excel của bạn (`.xlsx`, `.xls` hoặc `.csv`).
3. Nhập **Sheet Id** (mặc định `0` là trang tính đầu tiên).
4. Chọn chế độ đọc:
   - `Each profile reads one row`: Mỗi profile xử lý 1 dòng tương ứng.
   - `Each profile reads all rows`: Profile lặp qua tất cả các dòng.
5. Tích chọn **`[x] Write 'OK' status upon completion`** và đặt cột ghi (ví dụ `Z`).
6. Tính năng tự động bỏ qua:
   - Hệ thống tự động bỏ qua dòng nếu cột `Z` đã có chữ hoặc chứa từ khóa `done, trạng thái:, error`.

### 2.2. Sử dụng trong kịch bản:
- Gõ phím Email: Key = `$col_A`
- Gõ phím Password: Key = `$col_B`
- Gõ phím Khóa 2FA: Key = `$col_C`

---

## 3. Làm Việc Với File TXT: Tách Chuỗi Bằng Action `Split text`

Nếu bạn có danh sách tài khoản lưu trong file `.txt`, mỗi dòng có định dạng:
```text
user1@gmail.com|Password123|JBSWY3DPEHPK3PXP|https://target.com
user2@gmail.com|Password456|HXDMVJECJJWSRB3H|https://target.com
```

### Bước 1: Khai báo file TXT
- Tại Bước 2 (Configure), tích chọn **`[x] Use input Text file (.txt)`** và chọn file của bạn.
- Khi chạy, toàn bộ dòng sẽ được nạp tự động vào biến **`$txt_line`**.

### Bước 2: Dùng Action `Split text` (Type 9)
Thêm action **Split text** vào workflow với thông số:
- **Input Text:** `$txt_line`
- **Separator Character:** `|`
- **Output Variable Name:** Điền danh sách biến cách nhau bởi dấu phẩy:
  ```text
  email, password, code_2fa, url
  ```

### Kết quả sau khi Split text chạy:
- `$email` ➡️ `user1@gmail.com`
- `$password` ➡️ `Password123`
- `$code_2fa` ➡️ `JBSWY3DPEHPK3PXP`
- `$url` ➡️ `https://target.com`

---

## 4. Tự Động Sinh Mã 2FA Với Action `2FA code` (Type 81)

Sau khi đã có mã khóa bí mật ở biến `$code_2fa`:
1. Thêm action **`2FA code`** (danh mục *Text & Number*).
2. **Secrete Key:** Nhập `$code_2fa`.
3. **Output Variable Name:** Nhập `otp` (hoặc `two_factor_code`).
4. Khi chạy, hệ thống sẽ tự sinh ra mã 6 số chuẩn TOTP (ví dụ `829104`).

---

## 5. Điền Biến Vào Ô Nhập Liệu Bằng Action `Key press` (Type 54)

1. **Wait element (Type 45):** Chờ ô input xuất hiện trên trang.
2. **Mouse click (Type 46):** Click vào ô input để kích hoạt con trỏ chuột.
3. **Key press (Type 54):**
   - **Type:** `Combo key`
   - **Key:** `$email` (hoặc `$password`, `$otp`)
   - **XPath:** XPath của ô input.

---

## 6. Sơ Đồ Quy Trình Tự Động Hóa Mẫu

```
File TXT / Excel
       │
       ▼
[ $txt_line hoặc $col_A, $col_B ]
       │
       ▼
[ Split text (dấu |) ]
       ├── $email
       ├── $password
       └── $code_2fa ──► [ Action 2FA code ] ──► $otp
                                                    │
                                                    ▼
[ Key press: $email ] ──► [ Key press: $password ] ──► [ Key press: $otp ] ──► Đăng Nhập Thành Công!
```

---
*Bản quyền tài liệu thuộc GPM Automate System.*
