export function buildCopilotStep2Prompt(port: string, target: string, serverUrl: string): string {
  return `Chromium port='${port}'. Theo skill đã đọc tại ${serverUrl}/, tạo workflow rồi POST ${serverUrl}/create với {"target":${JSON.stringify(target)},"nodes":[...]} để xem trước, chưa chạy.\n\nKịch bản: `;
}
