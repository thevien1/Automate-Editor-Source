/**
 * Thông tin chi tiết, mô tả, giá trị mẫu và hướng dẫn sử dụng cho từng biến hệ thống.
 * Dùng cho Tooltip hiển thị khi rê chuột và tài liệu hướng dẫn.
 */

export interface VariableMeta {
  name: string;
  label: string;
  source: string;
  example: string;
  description: string;
  usageGuide: string;
}

export const VARIABLES_METADATA: Record<string, VariableMeta> = {
  // === EXCEL DATA VARIABLES ===
  col_A: {
    name: '$col_A',
    label: 'Cột A (Cột 1)',
    source: 'File Excel đầu vào',
    example: 'user_admin@gmail.com',
    description: 'Dữ liệu tại Cột A của dòng hiện tại trong file Excel.',
    usageGuide: 'Thường dùng làm Email, Username hoặc URL mục tiêu.',
  },
  col_B: {
    name: '$col_B',
    label: 'Cột B (Cột 2)',
    source: 'File Excel đầu vào',
    example: 'Pass@123456',
    description: 'Dữ liệu tại Cột B của dòng hiện tại trong file Excel.',
    usageGuide: 'Thường dùng làm Mật khẩu đăng nhập tài khoản.',
  },
  col_C: {
    name: '$col_C',
    label: 'Cột C (Cột 3)',
    source: 'File Excel đầu vào',
    example: 'JBSWY3DPEHPK3PXP',
    description: 'Dữ liệu tại Cột C của dòng hiện tại trong file Excel.',
    usageGuide: 'Thường dùng làm Khóa bí mật 2FA (Secret Key) để sinh mã 6 số.',
  },
  col_D: {
    name: '$col_D',
    label: 'Cột D (Cột 4)',
    source: 'File Excel đầu vào',
    example: 'recovery_mail@outlook.com',
    description: 'Dữ liệu tại Cột D của dòng hiện tại trong file Excel.',
    usageGuide: 'Thường dùng làm Email khôi phục hoặc Proxy tài khoản.',
  },
  col_E: {
    name: '$col_E',
    label: 'Cột E (Cột 5)',
    source: 'File Excel đầu vào',
    example: '192.168.1.1:8080:user:pass',
    description: 'Dữ liệu tại Cột E của dòng hiện tại trong file Excel.',
    usageGuide: 'Thường dùng làm Proxy riêng cho tài khoản.',
  },
  col_F: {
    name: '$col_F',
    label: 'Cột F (Cột 6)',
    source: 'File Excel đầu vào',
    example: 'Cookie_datr=xxxx;c_user=xxxx',
    description: 'Dữ liệu tại Cột F của dòng hiện tại trong file Excel.',
    usageGuide: 'Thường dùng làm Cookie đăng nhập hoặc Token.',
  },
  excel_row: {
    name: '$excel_row',
    label: 'Số dòng Excel hiện tại',
    source: 'Hệ thống Excel',
    example: '2',
    description: 'Chỉ số thứ tự dòng Excel đang chạy (dòng dữ liệu bắt đầu từ 1 hoặc 2).',
    usageGuide: 'Dùng để kiểm tra vị trí dòng, ghi log hoặc tính toán điều kiện dừng.',
  },
  inputExcel: {
    name: '$inputExcel',
    label: 'Toàn bộ dữ liệu dòng Excel',
    source: 'File Excel đầu vào',
    example: '{"A":"user1","B":"pass1"}',
    description: 'Toàn bộ đối tượng dữ liệu của dòng Excel hiện tại dưới dạng chuỗi/object.',
    usageGuide: 'Dùng khi muốn truyền cả dòng dữ liệu vào hàm xử lý tùy biến.',
  },
  inputExcelFileLocation: {
    name: '$inputExcelFileLocation',
    label: 'Đường dẫn file Excel',
    source: 'Cấu hình dự án',
    example: 'D:\\data\\accounts.xlsx',
    description: 'Đường dẫn tuyệt đối đến tệp Excel đầu vào đang được nạp.',
    usageGuide: 'Dùng trong các action đọc/ghi thêm file Excel.',
  },
  inputExcelTotalRows: {
    name: '$inputExcelTotalRows',
    label: 'Tổng số dòng Excel',
    source: 'File Excel',
    example: '100',
    description: 'Tổng số dòng dữ liệu hợp lệ được tìm thấy trong file Excel.',
    usageGuide: 'Dùng để hiển thị tiến độ (ví dụ: $inputExcelCurrentRow / $inputExcelTotalRows).',
  },
  inputExcelCurrentRow: {
    name: '$inputExcelCurrentRow',
    label: 'Vị trí dòng hiện tại',
    source: 'File Excel',
    example: '15',
    description: 'Số thứ tự dòng dữ liệu hiện tại đang được thực thi.',
    usageGuide: 'Dùng trong điều kiện dừng hoặc ghi log tiến trình.',
  },

  // === TXT FILE LINE VARIABLES ===
  txt_line: {
    name: '$txt_line',
    label: 'Dòng TXT hiện tại',
    source: 'File Text (.txt)',
    example: 'admin@gmail.com|pass123|JBSWY3DPEHPK3PXP',
    description: 'Nguyên văn toàn bộ chuỗi ký tự của 1 dòng đang đọc từ file TXT.',
    usageGuide: 'Dùng kết hợp với action "Split text" (phân tách theo dấu |) để lấy từng trường.',
  },
  line: {
    name: '$line',
    label: 'Dòng dữ liệu (Alias)',
    source: 'File Text (.txt)',
    example: 'user1|pass123|key2fa',
    description: 'Tên viết tắt của dòng text hiện tại.',
    usageGuide: 'Nhập vào ô Input của action Split text để cắt thành $email, $password, $code_2fa.',
  },
  line_1: {
    name: '$line_1',
    label: 'Phần tử 1 sau Split',
    source: 'Action Split Text',
    example: 'user_admin@gmail.com',
    description: 'Phần tử thứ nhất sau khi cắt chuỗi dòng text.',
    usageGuide: 'Dùng cho Email / Tài khoản sau khi Split.',
  },
  line_2: {
    name: '$line_2',
    label: 'Phần tử 2 sau Split',
    source: 'Action Split Text',
    example: 'Password@123',
    description: 'Phần tử thứ hai sau khi cắt chuỗi dòng text.',
    usageGuide: 'Dùng cho Mật khẩu sau khi Split.',
  },
  line_3: {
    name: '$line_3',
    label: 'Phần tử 3 sau Split',
    source: 'Action Split Text',
    example: 'JBSWY3DPEHPK3PXP',
    description: 'Phần tử thứ ba sau khi cắt chuỗi dòng text.',
    usageGuide: 'Dùng cho Khóa 2FA secret key.',
  },
  line_4: {
    name: '$line_4',
    label: 'Phần tử 4 sau Split',
    source: 'Action Split Text',
    example: 'recovery_mail@outlook.com',
    description: 'Phần tử thứ tư sau khi cắt chuỗi dòng text.',
    usageGuide: 'Dùng cho Mail khôi phục hoặc Proxy.',
  },
  line_5: {
    name: '$line_5',
    label: 'Phần tử 5 sau Split',
    source: 'Action Split Text',
    example: '192.168.1.1:8080',
    description: 'Phần tử thứ năm sau khi cắt chuỗi dòng text.',
    usageGuide: 'Dùng cho dữ liệu bổ sung như Proxy, Cookie...',
  },

  // === ACCOUNT & CREDENTIALS VARIABLES ===
  email: {
    name: '$email',
    label: 'Email tài khoản',
    source: 'Dữ liệu người dùng / Split',
    example: 'alex.smith@gmail.com',
    description: 'Địa chỉ Email dùng để đăng nhập hoặc xác thực.',
    usageGuide: 'Dán vào trường Value của action Mouse click & Key press trên ô Email.',
  },
  password: {
    name: '$password',
    label: 'Mật khẩu tài khoản',
    source: 'Dữ liệu người dùng / Split',
    example: 'SecretPassword#2026',
    description: 'Mật khẩu đăng nhập của tài khoản.',
    usageGuide: 'Dán vào ô nhập liệu password của trang web.',
  },
  code_2fa: {
    name: '$code_2fa',
    label: 'Mã 2FA (6 chữ số)',
    source: 'Action 2FA Code',
    example: '482910',
    description: 'Mã OTP 6 chữ số sinh từ secret key bằng thuật toán TOTP.',
    usageGuide: 'Điền vào ô nhập mã xác nhận 2 bước trên website (Google, Facebook, TikTok...).',
  },
  two_factor_code: {
    name: '$two_factor_code',
    label: 'Mã xác thực hai yếu tố',
    source: 'Action 2FA Code',
    example: '938102',
    description: 'Mã 2FA 6 số được sinh tự động.',
    usageGuide: 'Tương đương với $code_2fa.',
  },
  url: {
    name: '$url',
    label: 'Đường dẫn liên kết (URL)',
    source: 'Dữ liệu kịch bản',
    example: 'https://www.google.com',
    description: 'Đường dẫn website cần điều hướng hoặc kiểm tra.',
    usageGuide: 'Dùng trong action "Go to URL" hoặc "Wait URL changed".',
  },
  username: {
    name: '$username',
    label: 'Tên người dùng',
    source: 'Dữ liệu kịch bản',
    example: 'admin_automation',
    description: 'Tên tài khoản (username) khi không dùng email.',
    usageGuide: 'Dùng nhập vào trường đăng nhập username.',
  },
  otp: {
    name: '$otp',
    label: 'Mã OTP tạm thời',
    source: 'Action Read Mail / SMS',
    example: '749214',
    description: 'Mã xác minh một lần nhận từ email hoặc dịch vụ thuê sim.',
    usageGuide: 'Dùng điền vào các form xác minh bảo mật.',
  },
  phone: {
    name: '$phone',
    label: 'Số điện thoại',
    source: 'Dữ liệu kịch bản',
    example: '+84988776655',
    description: 'Số điện thoại đăng ký tài khoản.',
    usageGuide: 'Dùng điền vào form đăng ký hoặc xác minh SĐT.',
  },
  cookie: {
    name: '$cookie',
    label: 'Chuỗi Cookie trình duyệt',
    source: 'Action Get Cookie',
    example: 'sb=xxx; c_user=1000xxx; xs=xxx;',
    description: 'Chuỗi cookie phiên đăng nhập của trình duyệt.',
    usageGuide: 'Dùng cho action Import Cookie hoặc HTTP Request headers.',
  },
  token: {
    name: '$token',
    label: 'Mã Token / Bearer Token',
    source: 'HTTP Request / API',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI...',
    description: 'Token xác thực API hoặc OAuth.',
    usageGuide: 'Dùng trong header Authorization của Action HTTP Request.',
  },

  // === BROWSER & SYSTEM RUNTIME ===
  profileName: {
    name: '$profileName',
    label: 'Tên Profile trình duyệt',
    source: 'Hệ thống SV Browser / GPMLogin',
    example: 'Profile_Chrome_01',
    description: 'Tên hiển thị của Profile trình duyệt hiện tại.',
    usageGuide: 'Dùng để phân biệt profile khi lưu log hoặc đặt tên file tải về.',
  },
  profileId: {
    name: '$profileId',
    label: 'Mã UUID của Profile',
    source: 'Hệ thống SV Browser / GPMLogin',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Mã ID duy nhất quản lý profile trong hệ thống.',
    usageGuide: 'Dùng khi gọi API điều khiển profile qua port.',
  },
  profileProxy: {
    name: '$profileProxy',
    label: 'Proxy của Profile',
    source: 'Cấu hình Profile',
    example: '127.0.0.1:1080',
    description: 'Địa chỉ Proxy đang được gắn vào Profile chạy hiện tại.',
    usageGuide: 'Dùng để kiểm tra IP hoặc ghi log thông tin mạng.',
  },
  loopIndex: {
    name: '$loopIndex',
    label: 'Chỉ số vòng lặp',
    source: 'Khối For / While',
    example: '0, 1, 2...',
    description: 'Số thứ tự vòng lặp đang chạy trong khối For hoặc While.',
    usageGuide: 'Dùng làm biến đếm hoặc tạo tên/số thứ tự ngẫu nhiên duy nhất.',
  },
  threadId: {
    name: '$threadId',
    label: 'Mã luồng thực thi',
    source: 'Bộ chạy đa luồng',
    example: 'Thread_1',
    description: 'Số thứ tự luồng xử lý đồng thời trong chế độ Multi-threading.',
    usageGuide: 'Dùng để phân chia dữ liệu hoặc tránh trùng lặp giữa các luồng.',
  },
  port: {
    name: '$port',
    label: 'Cổng Remote Port Debugger',
    source: 'Trình duyệt Chrome',
    example: '21687',
    description: 'Cổng giao tiếp tự động hóa Puppeteer/Selenium của Chrome.',
    usageGuide: 'Dùng khi tích hợp các công cụ điều khiển bên ngoài.',
  },
};

/**
 * Lấy siêu dữ liệu cho bất kỳ biến nào, tự sinh mô tả nếu là cột col_X hoặc biến tùy biến
 */
export const getVariableMeta = (vName: string): VariableMeta => {
  const clean = vName.startsWith('$') ? vName.substring(1) : vName;

  if (VARIABLES_METADATA[clean]) {
    return VARIABLES_METADATA[clean];
  }

  // Tự sinh cho col_A -> col_Z nếu chưa định nghĩa sẵn
  if (clean.startsWith('col_')) {
    const colLetter = clean.replace('col_', '').toUpperCase();
    return {
      name: `$${clean}`,
      label: `Cột ${colLetter} trong Excel`,
      source: 'File Excel đầu vào',
      example: `Dữ liệu cột ${colLetter}`,
      description: `Giá trị tương ứng tại Cột ${colLetter} của dòng dữ liệu hiện tại trong file Excel.`,
      usageGuide: `Nhấp để copy, gõ $${clean} vào ô nhập liệu cần dùng.`,
    };
  }

  // Cho các chữ cái đơn A, B, C, D...
  if (clean.length === 1 && clean >= 'A' && clean <= 'Z') {
    return {
      name: `$${clean}`,
      label: `Cột ${clean} (viết tắt)`,
      source: 'File Excel đầu vào',
      example: `Giá trị cột ${clean}`,
      description: `Viết tắt của $col_${clean}. Lấy dữ liệu tại cột ${clean} của file Excel.`,
      usageGuide: `Nhấp để copy, sử dụng tương tự như $col_${clean}.`,
    };
  }

  // Biến do người dùng tự tạo ra từ Output Variable Name của các Action
  return {
    name: `$${clean}`,
    label: `Biến đầu ra: ${clean}`,
    source: 'Workflow Output Variable',
    example: `Giá trị sinh từ action`,
    description: `Biến được tạo ra bởi một Action trong kịch bản hiện tại và lưu vào bộ nhớ.`,
    usageGuide: `Nhấp để copy, gõ $${clean} vào bất kỳ ô nhập liệu nào ở các bước tiếp theo.`,
  };
};
