import http from 'http';
import fs from 'fs';
import path from 'path';

export interface CreateWorkflowRequest {
  port?: string | number;
  prompt?: string;
  include_existing?: boolean;
  existing_workflow?: any;
  target?: string;
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function escapeRawInput(pairs: Array<{ Key: string; Value: string }>): string {
  return JSON.stringify(pairs);
}

// Intelligent rule-based workflow generator when POST /create is called
function generateNodesFromPrompt(promptText: string, portStr: string = '53002'): any[] {
  const p = (promptText || '').toLowerCase();
  const nodes: any[] = [];

  // 1. Detect URLs in prompt (e.g. https://accounts.google.com/ or https://facebook.com/...)
  const urlMatch = promptText.match(/https?:\/\/[^\s"',]+/i);
  const targetUrl = urlMatch ? urlMatch[0] : 'https://google.com';

  // Action: Go to URL (type 39)
  nodes.push({
    $type: 'SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models',
    type: 39,
    element_xpath: null,
    output_variable_name: null,
    delay: '2000,3000',
    continue_on_error: false,
    id: generateUuid(),
    display_text: 'Go to URL',
    raw_input: escapeRawInput([
      { Key: 'URL', Value: targetUrl },
      { Key: 'TIME_OUT', Value: '60' },
    ]),
    comment: `Truy cập ${targetUrl}`,
  });

  // 2. Detect Google Login / accounts.google.com
  if (targetUrl.includes('accounts.google.com') || p.includes('google') || p.includes('mail') || p.includes('email')) {
    // Wait element: email input (type 44)
    nodes.push({
      $type: 'SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models',
      type: 44,
      element_xpath: "//input[@type='email' or @id='identifierId']",
      output_variable_name: null,
      delay: '1000,2000',
      continue_on_error: false,
      id: generateUuid(),
      display_text: 'Wait element',
      raw_input: escapeRawInput([{ Key: 'TIME_OUT', Value: '20' }]),
      comment: 'Chờ ô nhập email xuất hiện',
    });

    // Mouse click: email input (type 48)
    nodes.push({
      $type: 'SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models',
      type: 48,
      element_xpath: "//input[@type='email' or @id='identifierId']",
      output_variable_name: null,
      delay: '500,1000',
      continue_on_error: false,
      id: generateUuid(),
      display_text: 'Mouse click',
      raw_input: escapeRawInput([
        { Key: 'CLICK_TYPE', Value: 'Click by Xpath' },
        { Key: 'XPATH', Value: '' },
        { Key: 'POS', Value: '' },
      ]),
      comment: 'Click vào ô email',
    });

    // Key press: input email (type 54)
    nodes.push({
      $type: 'SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models',
      type: 54,
      element_xpath: "//input[@type='email' or @id='identifierId']",
      output_variable_name: null,
      delay: '1000,2000',
      continue_on_error: false,
      id: generateUuid(),
      display_text: 'Key press',
      raw_input: escapeRawInput([
        { Key: 'XPATH', Value: '' },
        { Key: 'TYPE', Value: 'Text' },
        { Key: 'KEY', Value: '$email' },
        { Key: 'DELAY_PRESS', Value: '50,150' },
      ]),
      comment: 'Nhập email',
    });
  }

  // 3. Detect Facebook Like / Love / Comment / Post
  if (p.includes('like') || p.includes('thích') || p.includes('love') || p.includes('yêu thích') || p.includes('facebook') || p.includes('fb') || p.includes('comment')) {
    const isLove = p.includes('love') || p.includes('yêu thích') || p.includes('tim');
    const isComment = p.includes('comment') || p.includes('bình luận') || p.includes('postcomment');

    const hoverXpath = isComment
      ? "//div[@role='article']//div[@role='button'][.//span[text()='Thích' or text()='Like' or text()='Me gusta' or text()='Curtir']] | //div[contains(@aria-label, 'Bình luận') or contains(@aria-label, 'Comment')]//div[@role='button' and (text()='Thích' or text()='Like')]"
      : "//div[@role='button'][.//div[@data-ad-rendering-role='like_button']] | //div[@role='article']//div[@role='button'][contains(., 'Thích') or contains(., 'Like')]";

    nodes.push({
      $type: 'SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models',
      type: 50,
      element_xpath: hoverXpath,
      output_variable_name: null,
      delay: '1500,2500',
      continue_on_error: true,
      id: generateUuid(),
      display_text: 'Mouse move',
      raw_input: escapeRawInput([
        { Key: 'MOVE_TYPE', Value: 'Move by Xpath' },
        { Key: 'XPATH', Value: '' },
        { Key: 'POS', Value: '' },
      ]),
      comment: isComment ? 'Rê chuột đến nút Thích của bình luận (postComment)' : 'Rê chuột đến nút Like bài viết',
    });

    const reactionXpath = isLove
      ? "(//div[@role='toolbar']//div[@role='button'])[2] | //div[@role='toolbar']//div[@aria-label='Yêu thích' or @aria-label='Love' or @aria-label='Me encanta' or @aria-label='Amei' or @aria-label='J’adore' or @aria-label='Gefällt mir' or @aria-label='Mi piace' or @aria-label='Супер' or @aria-label='Super' or @aria-label='รักเลย' or @aria-label='أحببته' or @aria-label='超いいね！' or @aria-label='최고예요' or @aria-label='超赞' or @aria-label='超讚' or @aria-label='Muhteşem']"
      : "(//div[@role='toolbar']//div[@role='button'])[1] | //div[@role='toolbar']//div[@aria-label='Thích' or @aria-label='Like' or @aria-label='Me gusta' or @aria-label='Curtir' or @aria-label='J’aime' or @aria-label='Gefällt mir' or @aria-label='Mi piace' or @aria-label='Нравится' or @aria-label='Suka' or @aria-label='ถูกใจ' or @aria-label='أعجبني' or @aria-label='いいね！' or @aria-label='좋아요' or @aria-label='赞' or @aria-label='讚' or @aria-label='Beğen']";

    nodes.push({
      $type: 'SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models',
      type: 48,
      element_xpath: reactionXpath,
      output_variable_name: null,
      delay: '1000,2000',
      continue_on_error: true,
      id: generateUuid(),
      display_text: 'Mouse click',
      raw_input: escapeRawInput([
        { Key: 'CLICK_TYPE', Value: 'Click by Xpath' },
        { Key: 'XPATH', Value: '' },
        { Key: 'POS', Value: '' },
      ]),
      comment: isLove ? 'Click nút Yêu thích (Love - Toàn bộ quốc gia)' : 'Click nút Thích (Like - Toàn bộ quốc gia)',
    });
  }

  // 4. Detect Stop / Close Profile
  if (p.includes('dừng') || p.includes('stop') || p.includes('đóng') || p.includes('close')) {
    nodes.push({
      $type: 'SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models',
      type: 76,
      element_xpath: null,
      output_variable_name: null,
      delay: '0,0',
      continue_on_error: false,
      id: generateUuid(),
      display_text: 'Stop',
      raw_input: '[]',
      comment: 'Dừng và hoàn tất workflow',
    });
  }

  return nodes;
}

export function startSkillServer(
  port: number = 8775,
  onNodesCreated?: (data: { nodes: any[]; target?: string; includeExisting?: boolean }) => void
): http.Server {
  // Locate SKILL.md
  const candidateMdPaths = [
    path.join(__dirname, '../dist/SKILL.md'),
    path.join(__dirname, '../public/SKILL.md'),
    path.join(__dirname, 'SKILL.md'),
    path.join(process.cwd(), 'SKILL.md'),
    path.join(process.cwd(), 'public/SKILL.md'),
    path.join(process.cwd(), 'resources/app.asar/dist/SKILL.md'),
    path.join(__dirname, '../../SKILL.md'),
  ];
  let skillMdContent = '';
  for (const p of candidateMdPaths) {
    if (fs.existsSync(p)) {
      try {
        skillMdContent = fs.readFileSync(p, 'utf-8');
        if (skillMdContent) break;
      } catch (e) {}
    }
  }

  // Load static skill.json (full rich action catalog & schemas)
  const candidateJsonPaths = [
    path.join(__dirname, '../dist/skill.json'),
    path.join(__dirname, '../public/skill.json'),
    path.join(__dirname, 'skill.json'),
    path.join(process.cwd(), 'dist/skill.json'),
    path.join(process.cwd(), 'public/skill.json'),
    path.join(process.cwd(), 'resources/app.asar/dist/skill.json'),
    path.join(__dirname, '../../public/skill.json'),
  ];
  let skillData: any = null;
  for (const p of candidateJsonPaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.actions_catalog || parsed.name)) {
          skillData = parsed;
          break;
        }
      } catch (e) {}
    }
  }

  if (!skillData) {
    skillData = {
      name: 'SV Browser Automate Editor',
      version: '3.1.95',
      protocol: 'Chromium DevTools Protocol (CDP) & .gscript workflow JSON',
      endpoint: `http://localhost:${port}`,
      create_endpoint: `http://localhost:${port}/create`,
      description: 'Tài liệu kỹ thuật, danh mục Action, cú pháp điều kiện và cấu trúc JSON .gscript cho SV Browser Automate Editor. Dùng để AI đọc hiểu và sinh workflow tự động hóa chính xác.',
      remote_debugging: {
        type: 'Chromium CDP',
        description: 'Điều khiển trình duyệt Chromium qua remote debugging port (ví dụ: port=53000, 53002).',
        usage: 'Trình duyệt được mở với cờ --remote-debugging-port={port}. Có thể điều khiển trực tiếp qua WebSocket CDP hoặc thông qua các node action trong workflow.',
      },
      workflow_architecture: {
        file_format: '.gscript (JSON chuẩn Json.NET .NET Framework)',
        root_keys: ['$type', 'before_init', 'main_logic', 'after_quit', 'name'],
        root_type: 'SVBAutomateEditor.Models.Editor, SVBAutomateEditor.Models',
        blocks: {
          before_init: 'Khối chạy trước khi mở trình duyệt (đọc dữ liệu cấu hình, gán biến khởi tạo, đọc Excel/File)',
          main_logic: 'Khối chạy chính sau khi trình duyệt đã mở (thao tác web, click, gõ text, cuộn trang, cào dữ liệu)',
          after_quit: 'Khối dọn dẹp sau khi trình duyệt đóng (ghi file kết quả, xuất báo cáo, thông báo)',
        },
      },
      core_rules: [
        '1. CHỈ sử dụng đúng các action có trong danh mục. Không tự bịa action mới hoặc đoán mã type.',
        '2. KIỂM TRA PHẦN TỬ TỒN TẠI: BẮT BUỘC dùng cú pháp hasElement(XPATH) hoặc !hasElement(XPATH). TUYỆT ĐỐI không viết XPath trần và không dùng Count element > 0.',
        '3. EXECUTE JS CODE (type 68): Khi cần gán giá trị trả về vào output_variable_name, BẮT BUỘC phải viết "return ...;". SV Browser KHÔNG tự thêm return. Tuyệt đối không dùng IIFE (function(){...})() để lấy giá trị.',
        '4. FORMAT CLIPBOARD PASTE-READY: Khi AI sinh đoạn workflow dán vào Editor, luôn trả về một MẢNG JSON [ ... ] chứa ActionNode hoặc NormalBlockNode.',
        '5. ID CỦA NODE: Mọi node đều phải có "id" là một GUID v4 ngẫu nhiên.',
        '6. RAW_INPUT ESCAPE: Field raw_input là một chuỗi JSON escaped biểu diễn mảng [{"Key":"...","Value":"..."}].',
        '7. DELAY SAU ACTION: Field "delay" có định dạng "min,max" tính bằng mili-giây (vd: "2000,3000" hoặc "0,0" hoặc "$delay").',
      ],
      sub_workflows_guide: {
        description: 'Quản lý và gọi nhánh phụ (Sub-workflows) trong SV Browser Automate Editor',
        action_call_workflow: {
          type: 120,
          name: 'Call workflow',
          description: 'Gọi và thực thi một nhánh phụ (file .gscript) trong dự án',
          raw_input_format: '[{"Key":"REFERENCE_FILE","Value":"ten_nhanh_phu.gscript"}]',
        },
        rules: [
          '1. Nhánh phụ được lưu thành file .gscript riêng trong thư mục dự án và quản lý qua các tab trong Editor.',
          '2. Để gọi nhánh phụ từ nhánh chính (Main logic), sử dụng Action Call workflow (type 120) với REFERENCE_FILE.',
          '3. Để tạo rẽ nhánh điều kiện: dùng IfBlockNode, ElseIfBlockNode, ElseBlockNode cùng cấp.',
          '4. Khi bổ sung vào kịch bản đã có, AI phải đọc mảng các node cũ trong existing_workflow để không làm mất logic hiện tại và nối tiếp các bước mới.',
        ],
      },
    };
  }

  const server = http.createServer((req, res) => {
    // Enable CORS for all clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ? req.url.split('?')[0] : '/';

    // 1. Health / Status check
    if (url === '/health' || url === '/ping' || url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          port,
          app: 'SV Browser Automate Editor',
          version: (skillData && skillData.version) || '3.1.96',
          endpoint: `http://localhost:${port}`,
          create_endpoint: `http://localhost:${port}/create`,
        })
      );
      return;
    }

    // 2. Raw Markdown Skill
    if (url === '/skill.md' || url === '/SKILL.md') {
      res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
      res.end(skillMdContent || '# SV Browser Automate Editor Skill\n\nNo SKILL.md file found.');
      return;
    }

    // 3. Actions catalog
    if (url === '/actions') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(skillData.actions_catalog || [], null, 2));
      return;
    }

    // 4. API POST /create (Create or extend workflow & AUTO-APPLY into Editor)
    if (url === '/create' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const payload: any = body ? JSON.parse(body) : {};
          let finalNodes: any[] = [];
          let target = 'main_logic';
          let includeExisting = false;
          let existing: any = null;

          if (Array.isArray(payload)) {
            finalNodes = payload;
          } else {
            target = payload.target || 'main_logic';
            includeExisting = Boolean(payload.include_existing);
            existing = payload.existing_workflow;
            const promptText = payload.prompt || '';
            const portVal = String(payload.port || '53001');

            if (Array.isArray(payload.nodes) && payload.nodes.length > 0) {
              finalNodes = payload.nodes;
            } else if (payload.main_logic && Array.isArray(payload.main_logic.nodes)) {
              finalNodes = payload.main_logic.nodes;
            } else if (promptText) {
              finalNodes = generateNodesFromPrompt(promptText, portVal);
            }
          }

          // If include_existing is true and existing workflow has nodes, combine them if not already merged!
          if (includeExisting && existing) {
            let existingNodes: any[] = [];
            if (Array.isArray(existing)) {
              existingNodes = existing;
            } else if (existing.main_logic && Array.isArray(existing.main_logic)) {
              existingNodes = existing.main_logic;
            } else if (existing.main_logic && existing.main_logic.nodes && Array.isArray(existing.main_logic.nodes)) {
              existingNodes = existing.main_logic.nodes;
            }
            // Only prepend if existing nodes aren't already the prefix of finalNodes
            if (existingNodes.length > 0 && finalNodes.length > 0 && finalNodes[0]?.id !== existingNodes[0]?.id) {
              finalNodes = [...existingNodes, ...finalNodes];
            }
          }

          // TỰ ĐỘNG ĐIỀN VÀO KỊCH BẢN: Gọi callback để bắn IPC sang giao diện Editor
          if (typeof onNodesCreated === 'function') {
            try {
              onNodesCreated({ nodes: finalNodes, target, includeExisting });
            } catch (err) {
              console.warn('[SkillServer] Failed to auto-apply nodes to editor:', err);
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify(
              {
                success: true,
                in_preview: true,
                count: finalNodes.length,
                target: target,
                nodes: finalNodes,
                message: `Đã nạp ${finalNodes.length} action nodes vào khung Xem trước. Nhấn "Áp dụng vào Kịch bản ngay" trong phần mềm để hoàn tất!`,
              },
              null,
              2
            )
          );
        } catch (e: any) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              success: false,
              error: `Lỗi xử lý request: ${e.message}`,
            })
          );
        }
      });
      return;
    }

    // Default route GET / or GET /skill.json: Return rich JSON specification directly (for AI and software)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(skillData, null, 2));
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[SkillServer] Port ${port} is already in use by another process.`);
    } else {
      console.error(`[SkillServer] Error on port ${port}:`, err);
    }
  });

  try {
    server.listen(port, '0.0.0.0', () => {
      console.log(`[SkillServer] SV Browser Skill & MCP server listening at http://localhost:${port}`);
    });
  } catch (e) {
    console.warn(`[SkillServer] Failed to bind to port ${port}:`, e);
  }

  return server;
}
