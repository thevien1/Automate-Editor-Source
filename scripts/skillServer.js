const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8775;

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function escapeRawInput(pairs) {
  return JSON.stringify(pairs);
}

function generateNodesFromPrompt(promptText, portStr = '53002') {
  const p = (promptText || '').toLowerCase();
  const nodes = [];

  const urlMatch = promptText.match(/https?:\/\/[^\s"',]+/i);
  const targetUrl = urlMatch ? urlMatch[0] : 'https://google.com';

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

  if (targetUrl.includes('accounts.google.com') || p.includes('google') || p.includes('mail') || p.includes('email')) {
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

const candidateJsonPaths = [
  path.join(__dirname, '../public/skill.json'),
  path.join(process.cwd(), 'public/skill.json'),
  path.join(__dirname, '../dist/skill.json'),
  path.join(process.cwd(), 'dist/skill.json'),
];
let skillData = null;
for (const p of candidateJsonPaths) {
  if (fs.existsSync(p)) {
    try {
      skillData = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (skillData && skillData.actions_catalog) break;
    } catch (e) {}
  }
}

const candidatePaths = [
  path.join(__dirname, '../public/SKILL.md'),
  path.join(__dirname, '../SKILL.md'),
  path.join(process.cwd(), 'SKILL.md'),
  path.join(process.cwd(), 'public/SKILL.md'),
];
let skillMdContent = '';
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    try {
      skillMdContent = fs.readFileSync(p, 'utf-8');
      if (skillMdContent) break;
    } catch (e) {}
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ? req.url.split('?')[0] : '/';

    if (url === '/health' || url === '/ping' || url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          port: PORT,
          app: 'SV Browser Automate Editor',
          version: (skillData && skillData.version) || '3.1.96',
          endpoint: `http://localhost:${PORT}`,
          create_endpoint: `http://localhost:${PORT}/create`,
        })
      );
      return;
    }

  if (url === '/skill.md' || url === '/SKILL.md') {
    res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
    res.end(skillMdContent || '# SV Browser Automate Editor Skill\n\nNo SKILL.md file found.');
    return;
  }

  if (url === '/actions') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(skillData ? skillData.actions_catalog || [] : [], null, 2));
    return;
  }

  if (url === '/create' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const promptText = payload.prompt || '';
        const portVal = String(payload.port || '53002');
        const includeExisting = Boolean(payload.include_existing);
        const existing = payload.existing_workflow;

        const newNodes = generateNodesFromPrompt(promptText, portVal);
        let finalNodes = newNodes;

        if (includeExisting && existing) {
          let existingNodes = [];
          if (Array.isArray(existing)) {
            existingNodes = existing;
          } else if (existing.main_logic && Array.isArray(existing.main_logic)) {
            existingNodes = existing.main_logic;
          } else if (existing.main_logic && existing.main_logic.nodes && Array.isArray(existing.main_logic.nodes)) {
            existingNodes = existing.main_logic.nodes;
          }
          if (existingNodes.length > 0) {
            finalNodes = [...existingNodes, ...newNodes];
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify(
            {
              success: true,
              count: finalNodes.length,
              nodes: finalNodes,
              message: `Đã tạo thành công ${finalNodes.length} action nodes cho workflow!`,
            },
            null,
            2
          )
        );
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Default route GET / or GET /skill.json: Return rich JSON specification directly (for AI and software)
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(skillData || { name: 'SV Browser Automate Editor', version: '3.1.96' }, null, 2));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[SkillServer] Port ${PORT} already active.`);
  } else {
    console.error(`[SkillServer] Error:`, err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SkillServer] Ready at http://localhost:${PORT}`);
});
