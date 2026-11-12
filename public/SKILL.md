---
name: sv-browser-automate
description: Tra cứu tham chiếu action, cú pháp điều kiện và tạo cấu trúc JSON .gscript / .svbsln chuẩn xác cho SV Browser Automate Editor.
---

# SV Browser Automate Editor — Tra cứu & tạo node/file .gscript

Skill gộp: vừa là reference (action, biến, điều kiện, mô hình sản phẩm, Gen AI Workflow) vừa là bộ tạo JSON .gscript paste-ready. Kịch bản SV Browser Automate Editor là JSON serialize kiểu .NET Framework (Json.NET, khóa `$type`).

## Nguyên tắc cốt lõi:
- **Target:** Browser automation qua **SV Browser profiles** (Chromium remote debugging port: `53001`, `53002`...).
- **Định dạng Type:** Mọi node action và block đều mang `$type` là `"SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models"` hoặc `"SVBAutomateEditor.Models.NormalBlockNode, SVBAutomateEditor.Models"`.
- **Chỉ dùng ĐÚNG các action có trong danh mục:** Không tự bịa action mới, không đoán mã type int.
- **Kiểm tra element tồn tại:** BẮT BUỘC dùng `hasElement(XPATH)` hoặc `!hasElement(XPATH)`. TUYỆT ĐỐI không viết XPath trần trong condition, không dùng Count element > 0 chỉ để test tồn tại.
- **Execute JS code (type 68) cần TRẢ GIÁ TRỊ ra biến:** BẮT BUỘC tự viết `return ...;` (SV Browser không tự thêm return). Tuyệt đối không dùng IIFE `(function(){...})()` vì giá trị trả về sẽ bị rỗng.
- **Mã hóa raw_input:** Trường `raw_input` là một chuỗi JSON escaped biểu diễn mảng `[{"Key":"...","Value":"..."}]` (không có tham số thì để `"[]"`).
- **Delay:** Field `delay` có định dạng `"min,max"` tính bằng mili-giây (vd: `"1500,2500"` hoặc `"0,0"` hoặc `"$delay"`).
- **ID của node:** Mọi node đều phải có `id` là một GUID v4 ngẫu nhiên, duy nhất.

---

## Cấu trúc thư mục project (.svbsln):
Project SV Browser Automate lưu ra đĩa = 1 thư mục (tên = tên project).
- `info.svbsln` — [luôn có] Metadata project (JSON):
  `{"id":"<GUID>","type":"Browser","name":"<tên project>","description":null,"version":"3.1.96","password":null,"author_info":"SV Browser","logo":null,"use_license_system":false,"created_at":"<ISO8601 UTC>"}`
- `src.gscript` — [luôn có] Nội dung luồng kịch bản chính (`$type`: `"SVBAutomateEditor.Models.Editor, SVBAutomateEditor.Models"`, chứa `before_init`, `main_logic`, `after_quit`).
- `*.gscript` — [tùy chọn] Các file kịch bản nhánh phụ (Sub-workflows) được gọi qua Action `Call workflow` (type 120).
- `src.svbconfig` — Cấu hình chạy (Excel input + custom inputs) sinh ra khi chạy script.

---

## CƠ CHẾ TỰ ĐỘNG ĐIỀN VÀO EDITOR QUA API (:8775/create):
- SV Browser Automate Editor chạy một local API server tại `http://localhost:8775`.
- Sau khi tạo xong danh sách action nodes, **AI hãy gửi HTTP POST** đến `http://localhost:8775/create`:
  ```json
  {
    "target": "main_logic",
    "nodes": [ ...các action nodes... ]
  }
  ```
- **XEM TRƯỚC VÀ ÁP DỤNG VÀO KỊCH BẢN:** Ngay khi nhận được request, phần mềm SV Browser Automate Editor sẽ nạp các action nodes vào khung Xem trước trong phần mềm. Người dùng kiểm tra nếu thấy đúng thì nhấn nút **"Áp dụng vào Kịch bản ngay"** để chính thức điền vào kịch bản!
- **BỔ SUNG VÀO KỊCH BẢN ĐÃ CÓ:**
  Nếu người dùng yêu cầu "dựa vào kịch bản đã có rồi điền thêm", prompt sẽ cung cấp `[KỊCH BẢN HIỆN TẠI ĐÃ CÓ TRONG PHẦN MỀM]`. AI đọc hiểu các bước cũ, giữ nguyên logic cũ và viết bổ sung các action mới vào sau. Sau đó POST mảng nodes đến `http://localhost:8775/create`. Khi người dùng xem xong nhấn Áp dụng thì phần mềm sẽ điền đầy đủ vào kịch bản.

---

## CHẾ ĐỘ XUẤT CLIPBOARD = Paste-ready JSON:
Người dùng thường dựng flow trong Editor với 3 block cố định:
1. `before_init` (Before browser opened): Đọc dữ liệu Excel, gán biến khởi tạo, thiết lập proxy.
2. `main_logic` (Main logic): Thao tác trình duyệt, click, nhập liệu, cào dữ liệu, cuộn trang.
3. `after_quit` (After browser closed): Dọn dẹp, ghi file kết quả, xuất báo cáo.

Khi AI sinh workflow dán vào Editor:
- **Top-level luôn là MẢNG `[ ... ]`**.
- Copy 1 block → Mảng chứa 1 NormalBlockNode (có `nodes[]` con).
- Copy các action → Mảng chứa các ActionNode.

---

## Cú pháp điều kiện (If / Else if / While):
- Chuỗi bọc dấu nháy kép `""` (vd: `$name = "admin"`). Số ghi thẳng (vd: `$count > 5`).
- Toán tử so sánh: `>`, `<`, `>=`, `<=`, `=`, `!=`.
- Toán tử chuỗi: `contains`, `!contains` (vd: `$url contains "google.com"`).
- Kiểm tra element tồn tại: BẮT BUỘC dùng `hasElement(XPATH)` hoặc `!hasElement(XPATH)`. XPath không bọc `""`. Phủ định là `!hasElement(...)`, KHÔNG dùng `hasElement(...) = false`.
- Ghép logic: `&&` (AND), `||` (OR), ngoặc đơn `( )`.
- `ElseIfBlockNode` / `ElseBlockNode` phải là SIBLING cùng cấp nằm ngay sau `IfBlockNode` trong mảng nodes cha (KHÔNG lồng vào trong If).

---

## Bảng mã Action (type int) phổ biến trong SV Browser:
- **39 Go to URL:** URL, TIME_OUT
- **44 Wait element:** TIME_OUT (XPath ở element_xpath)
- **48 Mouse click:** CLICK_TYPE, XPATH, POS (`CLICK_TYPE`: `"Click by Xpath"`)
- **50 Mouse move:** MOVE_TYPE, XPATH, POS (`MOVE_TYPE`: `"Move by Xpath"`, dùng để hover mở popup reaction, menu)
- **54 Key press:** TYPE, KEY, DELAY_PRESS (`TYPE`: `"Text"` hoặc `"Key"`, KEY vd: `$email`, `Return`, `Control+A+Backspace`)
- **56 Sleep / Delay:** TIME (đơn vị ms, vd: `"2000,3000"`)
- **68 Execute JS code:** SCRIPT (bắt buộc có `return ...;` nếu muốn lưu vào `output_variable_name`)
- **76 Stop:** Dừng kịch bản ngay lập tức mà không báo lỗi
- **120 Call workflow:** REFERENCE_FILE (tên file nhánh phụ `.gscript`, vd: `sub_task.gscript`)
- **1 Set variable:** VALUE, ALLOW_USER_INPUT, USER_INPUT_TYPE, COMBOBOX_DATA, INPUT_REQUIRED
- **2 Increase variable:** CURRENT_VAL, INCREASE_BY
- **3 Decrease variable:** CURRENT_VAL, DESCREASE_BY
- **13 File exists:** FILE_PATH (trả về true/false chữ thường)
- **17 File read all text:** FILE_PATH
- **19 File write all text:** FILE_PATH, TEXT
- **21 Read excel file:** FILE_PATH, SHEET_ID, COL_NAME_OR_INDEX, ROW_INDEX
- **22 Write excel file:** FILE_PATH, SHEET_ID, COL_NAME_OR_INDEX, ROW_INDEX, DATA
- **81 2FA code:** SECRETE_KEY (chuẩn TOTP 6 số)
- **116 Screenshot:** OUTPUT_PATH, FILE_NAME, FULL_PAGE

---

## CÁC KỊCH BẢN MẪU HOÀN CHỈNH (PASTE-READY WORKFLOWS)

### 1. Kịch bản Đăng nhập Google (Google Login):
```json
[
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 39,
    "element_xpath": null,
    "output_variable_name": null,
    "delay": "2000,3000",
    "continue_on_error": false,
    "id": "11111111-1111-4111-8111-111111111111",
    "display_text": "Go to URL",
    "raw_input": "[{\"Key\":\"URL\",\"Value\":\"https://accounts.google.com/\"},{\"Key\":\"TIME_OUT\",\"Value\":\"60\"}]",
    "comment": "Truy cập Google Login"
  },
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 44,
    "element_xpath": "//input[@type='email' or @id='identifierId']",
    "output_variable_name": null,
    "delay": "1000,2000",
    "continue_on_error": false,
    "id": "22222222-2222-4222-8222-222222222222",
    "display_text": "Wait element",
    "raw_input": "[{\"Key\":\"TIME_OUT\",\"Value\":\"30\"}]",
    "comment": "Chờ ô nhập email"
  },
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 48,
    "element_xpath": "//input[@type='email' or @id='identifierId']",
    "output_variable_name": null,
    "delay": "500,1000",
    "continue_on_error": false,
    "id": "33333333-3333-4333-8333-333333333333",
    "display_text": "Mouse click",
    "raw_input": "[{\"Key\":\"CLICK_TYPE\",\"Value\":\"Click by Xpath\"},{\"Key\":\"XPATH\",\"Value\":\"\"},{\"Key\":\"POS\",\"Value\":\"\"}]",
    "comment": "Click ô email"
  },
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 54,
    "element_xpath": "//input[@type='email' or @id='identifierId']",
    "output_variable_name": null,
    "delay": "1000,2000",
    "continue_on_error": false,
    "id": "44444444-4444-4444-8444-444444444444",
    "display_text": "Key press",
    "raw_input": "[{\"Key\":\"XPATH\",\"Value\":\"\"},{\"Key\":\"TYPE\",\"Value\":\"Text\"},{\"Key\":\"KEY\",\"Value\":\"$email\"},{\"Key\":\"DELAY_PRESS\",\"Value\":\"50,150\"}]",
    "comment": "Nhập email"
  },
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 48,
    "element_xpath": "//div[@id='identifierNext'] | //button[.//span[text()='Tiếp theo' or text()='Next']]",
    "output_variable_name": null,
    "delay": "2000,3000",
    "continue_on_error": false,
    "id": "55555555-5555-4555-8555-555555555555",
    "display_text": "Mouse click",
    "raw_input": "[{\"Key\":\"CLICK_TYPE\",\"Value\":\"Click by Xpath\"},{\"Key\":\"XPATH\",\"Value\":\"\"},{\"Key\":\"POS\",\"Value\":\"\"}]",
    "comment": "Bấm Tiếp theo"
  },
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 76,
    "element_xpath": null,
    "output_variable_name": null,
    "delay": "0,0",
    "continue_on_error": false,
    "id": "66666666-6666-4666-8666-666666666666",
    "display_text": "Stop",
    "raw_input": "[]",
    "comment": "Dừng và đóng profile"
  }
]
```

### 2. Kịch bản Facebook Like & Yêu thích (Love) Đa quốc gia:
Áp dụng cho 100% quốc gia bằng vị trí index trên thanh toolbar:
- Thích (Like): `(//div[@role='toolbar']//div[@role='button'])[1]`
- Yêu thích (Love): `(//div[@role='toolbar']//div[@role='button'])[2]`
```json
[
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 50,
    "element_xpath": "//div[@role='button'][.//div[@data-ad-rendering-role='like_button']] | //div[@role='article']//div[@role='button'][contains(., 'Thích') or contains(., 'Like')]",
    "output_variable_name": null,
    "delay": "1500,2500",
    "continue_on_error": true,
    "id": "77777777-7777-4777-8777-777777777777",
    "display_text": "Mouse move",
    "raw_input": "[{\"Key\":\"MOVE_TYPE\",\"Value\":\"Move by Xpath\"},{\"Key\":\"XPATH\",\"Value\":\"\"},{\"Key\":\"POS\",\"Value\":\"\"}]",
    "comment": "Rê chuột vào nút Like bài viết hoặc comment"
  },
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 48,
    "element_xpath": "(//div[@role='toolbar']//div[@role='button'])[2] | //div[@role='toolbar']//div[@aria-label='Yêu thích' or @aria-label='Love']",
    "output_variable_name": null,
    "delay": "1000,2000",
    "continue_on_error": true,
    "id": "88888888-8888-4888-8888-888888888888",
    "display_text": "Mouse click",
    "raw_input": "[{\"Key\":\"CLICK_TYPE\",\"Value\":\"Click by Xpath\"},{\"Key\":\"XPATH\",\"Value\":\"\"},{\"Key\":\"POS\",\"Value\":\"\"}]",
    "comment": "Click nút Yêu thích (Love - Toàn bộ quốc gia)"
  }
]
```

### 3. Kịch bản Facebook Comment bài viết:
```json
[
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 48,
    "element_xpath": "//div[@role='textbox'][contains(@aria-label, 'bình luận') or contains(@aria-label, 'Comment') or contains(@aria-label, 'Viết bình luận')]",
    "output_variable_name": null,
    "delay": "1000,2000",
    "continue_on_error": true,
    "id": "99999999-9999-4999-8999-999999999999",
    "display_text": "Mouse click",
    "raw_input": "[{\"Key\":\"CLICK_TYPE\",\"Value\":\"Click by Xpath\"},{\"Key\":\"XPATH\",\"Value\":\"\"},{\"Key\":\"POS\",\"Value\":\"\"}]",
    "comment": "Click vào ô bình luận"
  },
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 54,
    "element_xpath": "//div[@role='textbox']",
    "output_variable_name": null,
    "delay": "1000,2000",
    "continue_on_error": false,
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "display_text": "Key press",
    "raw_input": "[{\"Key\":\"XPATH\",\"Value\":\"\"},{\"Key\":\"TYPE\",\"Value\":\"Text\"},{\"Key\":\"KEY\",\"Value\":\"$commentText\"},{\"Key\":\"DELAY_PRESS\",\"Value\":\"60,150\"}]",
    "comment": "Nhập nội dung comment"
  },
  {
    "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
    "type": 54,
    "element_xpath": "//div[@role='textbox']",
    "output_variable_name": null,
    "delay": "2000,3000",
    "continue_on_error": false,
    "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "display_text": "Key press",
    "raw_input": "[{\"Key\":\"XPATH\",\"Value\":\"\"},{\"Key\":\"TYPE\",\"Value\":\"Key\"},{\"Key\":\"KEY\",\"Value\":\"Return\"},{\"Key\":\"DELAY_PRESS\",\"Value\":\"100,200\"}]",
    "comment": "Gõ phím Enter để đăng comment"
  }
]
```

### 4. Kịch bản Gọi Nhánh phụ (Sub-workflow) & Rẽ nhánh điều kiện:
```json
[
  {
    "$type": "SVBAutomateEditor.Models.IfBlockNode, SVBAutomateEditor.Models",
    "condition": "hasElement(//input[@name='totpPin'])",
    "nodes": [
      {
        "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
        "type": 120,
        "element_xpath": null,
        "output_variable_name": null,
        "delay": "1000,2000",
        "continue_on_error": false,
        "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "display_text": "Call workflow",
        "raw_input": "[{\"Key\":\"REFERENCE_FILE\",\"Value\":\"xu_ly_2fa.gscript\"}]",
        "comment": "Gọi nhánh phụ xu_ly_2fa.gscript"
      }
    ],
    "expanded": true,
    "continue_on_error": false,
    "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    "display_text": "If",
    "raw_input": "[{\"Key\":\"CONDITION\",\"Value\":\"hasElement(//input[@name='totpPin'])\"}]",
    "comment": "Nếu có yêu cầu 2FA thì gọi nhánh phụ"
  },
  {
    "$type": "SVBAutomateEditor.Models.ElseBlockNode, SVBAutomateEditor.Models",
    "nodes": [
      {
        "$type": "SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models",
        "type": 56,
        "element_xpath": null,
        "output_variable_name": null,
        "delay": "0,0",
        "continue_on_error": false,
        "id": "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        "display_text": "Sleep",
        "raw_input": "[{\"Key\":\"TIME\",\"Value\":\"2000,3000\"}]",
        "comment": "Chờ 2-3 giây"
      }
    ],
    "expanded": true,
    "continue_on_error": false,
    "id": "ffffffff-ffff-4fff-8fff-ffffffffffff",
    "display_text": "Else",
    "raw_input": null,
    "comment": null
  }
]
```
