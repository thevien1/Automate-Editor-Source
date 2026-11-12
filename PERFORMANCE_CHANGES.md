# Giảm khựng khi chạy nhiều luồng — 3.1.103

## Điều chỉnh updater — 3.1.104

Theo yêu cầu người dùng, bỏ hộp thoại hỏi xác nhận khởi động lại lần hai. Bấm **Cài đặt và khởi động lại** sẽ cài bản đã tải và tự mở lại ngay. Chặn bấm lặp gây cài trùng, hiển thị trạng thái đang cài. Giữ tải nền, kiểm tra checksum và các thay đổi hiệu năng của 3.1.103.

## Các điểm đã sửa

- `RuntimeModal.tsx` và `utils/runtimePerformance.ts`: gom log theo đợt 100 ms thay vì cập nhật toàn bộ bảng luồng trên từng dòng. Mỗi luồng giữ tối đa 500 dòng gần nhất, bảng log hiển thị 200 dòng gần nhất; mỗi dòng dài tối đa khoảng 4.000 ký tự. Copy log lấy lịch sử hiện đang giữ, không phải toàn bộ phiên chạy.
- Tái sử dụng bộ định dạng giờ; ghi nhớ kết quả lọc/sắp xếp profile và đối chiếu UID để tránh tính lại khi chỉ log hoặc thời gian chạy thay đổi.
- Vòng lặp workflow nhường xử lý cho giao diện sau mỗi khoảng 16 ms làm việc để thao tác dừng và các sự kiện khác có cơ hội chạy, kể cả vòng lặp rỗng.
- `electron/excelWorker.ts` và `excelWorkerClient.ts`: chuyển đọc, phân tích và ghi Excel khỏi Electron main process. Dùng lại một worker, xử lý lần lượt để các luồng không ghi đè dữ liệu của nhau. Không tạo thêm worker cho mỗi action và không giữ workbook trong cache.
- `electron/main.ts`: chuyển các action `readExcel`, `readExcelAllRows`, `writeExcel`, `appendExcel` sang worker và dọn worker khi thoát.
- Tên artifact Setup và Portable không có dấu cách, khớp metadata cập nhật khi upload.

## Kiểm tra

Chạy `tsc --noEmit`, `tsc -p tsconfig.electron.json`, rồi `node --test scripts/test-runtime-performance.cjs scripts/test-app-updater.cjs`.

Kiểm thử gồm 100.000 dòng log, nhường event loop trong vòng lặp, 40 lần append Excel đồng thời không mất dòng, đọc/ghi ô Excel, file không tồn tại và các kiểm thử updater trước đó.

Đây là các điểm nghẽn xác định từ mã nguồn; chưa đo một phiên chạy thực tế với profile và workflow của người dùng. Tải CPU/RAM từ nhiều Chrome, độ trễ proxy và website vẫn có thể làm chậm tác vụ. Giữ nguyên updater, preload API và hướng dẫn trong `AUTO_UPDATE.md` khi sửa tiếp.
