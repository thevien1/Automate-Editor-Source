# SV Browser Automate Editor (Desktop Application)

Phần mềm thiết kế kịch bản tự động hóa trực quan (Visual Workflow Editor) cho **SV Browser Automate Editor v3.0.8-stable**.

---

## 📸 Giao diện & Tính năng

1. **Màn hình Chào mừng (Home Launcher)**:
   - Sidebar trái: Logo sấm sét SV Browser, `Recent Project`, `App Store`, các liên kết mạng xã hội (YouTube, TikTok, Facebook) và nút `Settings`.
   - 3 nút thẻ lớn: `+ New Project`, `📁 Open Project`, `⚙ Settings`.
   - Danh sách `Recent Project` hiển thị đường dẫn ổ đĩa và số lượng project, bấm vào để mở ngay.
2. **Màn hình Biên tập (Editor View)**:
   - Menu Bar: `File`, `Edit`, `Build`, `Support`, Dark/Light mode toggle, Language selector `EN`.
   - Tool Bar: `Run`, `Test`, `Save`, `Undo`, `Redo`, `Search`, `Clear All`, `Record action`, `Generate with AI`, breadcrumb `Browser > Main logic > [Project Name]`.
   - 3 Cột làm việc:
     - **Cột trái (Actions library)**: Đủ 19 nhóm theo chuẩn Automate kèm số đếm badge (`Block (6)`, `Variables (4)`, `Workflow (5)`, `Text & Number (7)`, `File & Folder (18)`, `Browser - Navigation (9)`,...).
     - **Cột giữa (Canvas quy trình)**: Tabs quy trình (`Main workflow` + `+`), 3 khối mặc định (`Before browser opened`, `Main logic`, `After browser closed`) và thẻ phím tắt nổi **Shortcuts** góc dưới phải.
     - **Cột phải (Inspector)**: 2 Tab `Property` & `Variables (0)`, hiển thị trạng thái `No data to display` khi chưa chọn node, và form chi tiết khi chọn node (XPath, Delay, Output Var, Raw Parameters, Note, Continue on error).
   - Thanh trạng thái đáy: Màu xanh biển, trạng thái `Ready`, đường dẫn thư mục hiện tại, `0 Error List`.

---

## 🚀 Hướng dẫn Chạy & Sử dụng

### 1. Khởi chạy ở chế độ Web Dev
```bash
npm run dev
```
Mở trình duyệt tại `http://localhost:5173` để trải nghiệm giao diện ngay lập tức.

### 2. Khởi chạy ở chế độ Desktop App (Electron)
```bash
npm run electron:dev
```
Chạy ứng dụng cửa sổ phần mềm máy tính không viền với thanh tiêu đề tùy chỉnh chuẩn desktop.

### 3. Đóng gói thành file cài đặt máy tính (`.exe` Installer)
```bash
npm run dist:win
```
Lệnh này sẽ tạo ra bộ cài đặt Windows chuyên nghiệp trong thư mục `release/` (file dạng `SV Browser Automate Editor Setup 3.0.8.exe`), có thể gửi cho người khác cài đặt vào máy tính như bất kỳ phần mềm nào khác.

---

## 🐍 Tích hợp Python (Theo chuẩn SKILL.md)

Để sinh nhanh dự án hoặc hàng loạt node kịch bản bằng Python theo đúng tài liệu `SKILL.md`:
```bash
python scripts/gpm_generator.py "Tên_Project" "đường_dẫn_thư_mục"
```
File tạo ra gồm 2 file lõi chuẩn của GPM Automate:
- `info.gpmsln`: Metadata dự án (GUID, type Browser, version, author info...)
- `src.gscript`: Cấu trúc kịch bản đầy đủ 3 khối `before_init`, `main_logic`, `after_quit`.
