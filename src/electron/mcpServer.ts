import { IncomingMessage, ServerResponse } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

export type PreviewWorkflow = (data: { nodes: any[]; target?: string; includeExisting?: boolean }) => void;
const targets = ['before_init', 'main_logic', 'after_quit'] as const;
const nodeArray = z.array(z.record(z.any())).min(1).max(1000);
const readonly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

export function validateWorkflow(nodes: any[], skill: any): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const types = new Set((skill.actions_catalog || []).map((a: any) => a.type));
  const blocks = new Set(['NormalBlockNode', 'ForBlockNode', 'WhileBlockNode', 'IfBlockNode', 'ElseIfBlockNode', 'ElseBlockNode']);
  let count = 0;
  function walk(list: any[], depth: number, location: string) {
    if (depth > 32) { errors.push(`${location}: vượt quá 32 cấp block`); return; }
    for (let i = 0; i < list.length; i++) {
      if (++count > 1000) { errors.push('Workflow vượt quá 1000 nodes'); return; }
      const node = list[i], at = `${location}[${i}]`;
      if (!node || typeof node !== 'object' || Array.isArray(node)) { errors.push(`${at}: node phải là object`); continue; }
      if (typeof node.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(node.id)) errors.push(`${at}: id phải là UUID`);
      else if (ids.has(node.id)) errors.push(`${at}: id trùng lặp`);
      else ids.add(node.id);
      const kind = typeof node.$type === 'string' ? node.$type.split(',')[0].split('.').pop() : '';
      if (kind === 'ActionNode') {
        if (!types.has(node.type)) errors.push(`${at}: type ${node.type} không có trong danh mục action`);
      } else if (blocks.has(kind || '')) {
        if (!Array.isArray(node.nodes)) errors.push(`${at}: block cần mảng nodes`);
        else walk(node.nodes, depth + 1, `${at}.nodes`);
        if (['IfBlockNode', 'ElseIfBlockNode', 'WhileBlockNode'].includes(kind!) && (typeof node.condition !== 'string' || !node.condition.trim())) errors.push(`${at}: thiếu condition`);
      } else errors.push(`${at}: $type không được hỗ trợ`);
      if (node.raw_input != null) {
        try {
          if (typeof node.raw_input !== 'string') throw Error();
          const pairs = JSON.parse(node.raw_input);
          if (!Array.isArray(pairs) || pairs.some(p => !p || typeof p.Key !== 'string' || typeof p.Value !== 'string')) throw Error();
        } catch { errors.push(`${at}: raw_input phải là chuỗi JSON của mảng {Key, Value} dạng string`); }
      }
    }
  }
  if (!Array.isArray(nodes) || !nodes.length) return ['nodes phải là mảng không rỗng'];
  walk(nodes, 0, 'nodes');
  return errors.slice(0, 50);
}

export function createEditorMcp(skill: any, markdown: string, preview?: PreviewWorkflow): McpServer {
  const server = new McpServer({ name: 'sv-browser-automate-editor', version: skill.version || '1.0.0' }, {
    instructions: 'Read get_editor_guide and search_actions before creating workflow JSON. Do not invent action type numbers. Validate nodes, then use preview_workflow. This server never runs a browser or applies a workflow; the user must click Apply in the Editor.',
  });
  const result = (data: any, isError = false) => ({ content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }], isError });
  // Keep SDK/Zod compatibility types at this boundary; the SDK validates every
  // tool argument against the supplied Zod schemas at runtime.
  const registerTool = server.registerTool.bind(server) as (name: string, config: any, handler: (args: any) => Promise<any>) => void;
  server.registerResource('editor-skill', 'svb://docs/skill', { description: 'Hướng dẫn đầy đủ tạo workflow', mimeType: 'text/markdown' }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: markdown }] }));
  server.registerResource('editor-schema', 'svb://docs/schema', { description: 'Action catalog, node templates, conditions and workflow schema', mimeType: 'application/json' }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(skill, null, 2) }] }));
  registerTool('get_editor_guide', {
    description: 'Đọc hướng dẫn Editor, cú pháp điều kiện, cấu trúc nodes và workflow mẫu. Đọc trước khi viết kịch bản.',
    inputSchema: { section: z.enum(['overview', 'conditions', 'nodes', 'workflows', 'skill']).default('overview') }, annotations: readonly,
  }, async ({ section }) => {
    const sections: Record<string, any> = { overview: { name: skill.name, version: skill.version, rules: skill.core_rules, architecture: skill.workflow_architecture, sub_workflows: skill.sub_workflows_guide }, conditions: skill.condition_syntax, nodes: skill.node_templates, workflows: skill.workflow_templates, skill: markdown };
    return result(sections[section] ?? 'Không có tài liệu cho mục này');
  });
  registerTool('search_actions', {
    description: 'Tìm action theo tên, mô tả, category hoặc type. Trả đúng type và raw_keys; có phân trang.',
    inputSchema: { query: z.string().max(200).default(''), type: z.number().int().optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(50).default(20) }, annotations: readonly,
  }, async ({ query, type, offset, limit }) => {
    const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const actions = (skill.actions_catalog || []).filter((a: any) => (type === undefined || a.type === type) && terms.every((term: string) => JSON.stringify(a).toLocaleLowerCase().includes(term)));
    return result({ total: actions.length, offset, actions: actions.slice(offset, offset + limit) });
  });
  registerTool('validate_workflow', {
    description: 'Kiểm tra UUID, action type, block lồng nhau và raw_input. Chỉ kiểm tra cấu trúc; không kiểm tra XPath trên trang, không chạy workflow.',
    inputSchema: { nodes: nodeArray }, annotations: readonly,
  }, async ({ nodes }) => { const errors = validateWorkflow(nodes, skill); return result({ valid: !errors.length, errors }); });
  registerTool('preview_workflow', {
    description: 'Gửi nodes hợp lệ vào khung xem trước AI Copilot. Không áp dụng và không chạy. Người dùng bấm Áp dụng vào Kịch bản ngay sau khi xem.',
    inputSchema: { nodes: nodeArray, target: z.string().min(1).max(200).default('main_logic'), include_existing: z.boolean().default(false) },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ nodes, target, include_existing }) => {
    const errors = validateWorkflow(nodes, skill);
    if (errors.length) return result({ valid: false, errors }, true);
    if (!preview) return result('Editor chưa kết nối. Mở ứng dụng Editor để nhận khung xem trước.', true);
    preview({ nodes, target, includeExisting: include_existing });
    return result({ success: true, in_preview: true, applied: false, executed: false, count: nodes.length, target, message: 'Nhấn Áp dụng vào Kịch bản ngay trong Editor để áp dụng.' });
  });
  const registerPrompt = (server as any).registerPrompt.bind(server) as (name: string, config: any, handler: (args: any) => Promise<any>) => void;
  registerPrompt('build_workflow', {
    description: 'Hướng dẫn AI tạo workflow đúng định dạng của Editor.',
    argsSchema: { request: z.string(), port: z.string().optional(), target: z.string().optional() },
  }, async ({ request, port, target }) => ({ messages: [{ role: 'user', content: { type: 'text', text: `Đọc get_editor_guide (overview, conditions, nodes), dùng search_actions để lấy đúng type/raw_keys. Chromium port=${port || 'chưa chọn'}, target=${target || targets[1]}. Tạo workflow theo yêu cầu: ${request}\nSau đó gọi validate_workflow và preview_workflow. Chỉ xem trước, không chạy hoặc tự áp dụng.` } }] }));
  return server;
}

export async function handleMcpRequest(req: IncomingMessage, res: ServerResponse, skill: any, markdown: string, preview?: PreviewWorkflow) {
  // Restrict local clients and prevent browser DNS-rebinding requests.
  const host = (req.headers.host || '').toLowerCase();
  const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
  let validOrigin = !req.headers.origin;
  try { if (req.headers.origin) validOrigin = localHost.test(new URL(req.headers.origin).host); } catch {}
  if (!localHost.test(host) || !validOrigin) { res.writeHead(403); res.end('MCP chỉ cho phép kết nối localhost'); return; }
  const server = createEditorMcp(skill, markdown, preview);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { void server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'MCP request failed' })); }
    else if (!res.writableEnded) res.end();
    await server.close();
  }
}
