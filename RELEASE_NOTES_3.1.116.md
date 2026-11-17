# 3.1.116 — MCP cho AI Copilot

- Thêm MCP Streamable HTTP tại `http://127.0.0.1:8775/mcp` dùng SDK chính thức.
- Cung cấp tài nguyên hướng dẫn/schema và tools đọc tài liệu, tìm action, kiểm tra workflow và gửi preview.
- Thêm prompt `build_workflow` và nút sao chép cấu hình MCP trong AI Copilot.
- Giữ luồng người dùng xem trước rồi bấm áp dụng; MCP không tự chạy hoặc áp dụng workflow.
- Giữ REST API cũ; server chạy độc lập dùng chung mã nguồn với Editor để tránh lệch hành vi.
- Giới hạn server ở loopback và kiểm tra Host/Origin cho MCP.

Hướng dẫn kết nối: MCP_SETUP.md. Client/API chạy trên cloud không thể tự truy cập localhost trên máy người dùng.
