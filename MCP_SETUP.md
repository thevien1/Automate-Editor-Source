# MCP cho AI Copilot

## Kết nối

Mở Editor rồi thêm MCP server loại **Streamable HTTP** trong công cụ AI:

```text
http://127.0.0.1:8775/mcp
```

Ví dụ cấu hình cho client nhận `mcpServers` với URL HTTP (như Cursor):

```json
{
  "mcpServers": {
    "sv-browser-editor": {
      "url": "http://127.0.0.1:8775/mcp"
    }
  }
}
```

Nếu client có form cấu hình, chọn Streamable HTTP và nhập URL; không chọn stdio hoặc SSE cũ. Trong AI Copilot có nút **Sao chép cấu hình MCP**. Client cần chạy cùng máy với Editor, hoặc có quyền truy cập loopback của máy đó. API/AI chạy trên cloud không tự truy cập được localhost trên máy bạn. Không cần đặt API key của nhà cung cấp AI trong server này.

## AI sử dụng như thế nào

1. `get_editor_guide`: đọc `overview`, `conditions`, `nodes`, `workflows` hoặc toàn bộ `skill`.
2. `search_actions`: tìm đúng `type`, tên action và `raw_keys`; hỗ trợ `query`, `type`, `offset`, `limit`.
3. Tạo mảng nodes đúng hướng dẫn; `raw_input` là chuỗi JSON của mảng `{Key, Value}`.
4. `validate_workflow`: kiểm tra cấu trúc, UUID và trùng ID, action types, block lồng nhau và raw_input. Đây không phải kiểm thử XPath hay thực thi workflow.
5. `preview_workflow`: gửi `nodes`, `target` và `include_existing` vào AI Copilot. Không tự áp dụng hoặc chạy trình duyệt. Người dùng bấm **Áp dụng vào Kịch bản ngay** trong Editor.

Tài nguyên MCP:

- `svb://docs/skill`: tài liệu Markdown.
- `svb://docs/schema`: action catalog, conditions, node/workflow templates.

Prompt MCP `build_workflow` nhận `request`, tùy chọn `port` và `target`. Port ở đây mô tả trình duyệt cho workflow, không phải port MCP 8775.

Ví dụ yêu cầu AI: “Dùng MCP sv-browser-editor, đọc hướng dẫn và action liên quan. Tạo workflow mở example.com, port=53001, kiểm tra JSON rồi gửi vào preview main_logic.”

## Chạy độc lập / kiểm thử

```sh
npm run skill:server
npm run test:mcp
```

Server độc lập chỉ cung cấp tài liệu/validation; `preview_workflow` báo Editor chưa kết nối. Khi cần preview, sử dụng server tích hợp trong ứng dụng. Không chạy hai server cùng port. Các REST endpoint cũ `/`, `/skill.md`, `/actions`, `/create` vẫn được giữ.

MCP chạy stateless bằng SDK chính thức, tạo server/transport riêng cho từng request. Chỉ lắng nghe loopback; endpoint MCP kiểm tra Host và Origin để ngăn trang web ngoài truy cập. Không có tool chạy lệnh máy tính, tự duyệt browser hoặc tự chạy workflow.

Khi sửa sau này, giữ nguyên luồng preview → người dùng áp dụng. Không gắn trực tiếp MCP vào hàm chạy workflow, không đưa token AI hoặc dữ liệu profile vào tài liệu.
