const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { startSkillServer } = require('../dist-electron/skillServer.js');
const { validateWorkflow } = require('../dist-electron/mcpServer.js');
const skill = require('../public/skill.json');
const node = () => ({ $type: 'SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models', id: randomUUID(), type: 39, raw_input: JSON.stringify([{ Key: 'URL', Value: 'https://example.com' }]) });

test('MCP SDK client can discover docs/tools/prompts and preview only valid nodes', async () => {
  const previews = [];
  const server = startSkillServer(0, data => previews.push(data));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const clients = [];
  try {
    const a = new Client({ name: 'test-a', version: '1' }); clients.push(a);
    await a.connect(new StreamableHTTPClientTransport(new URL(base + '/mcp')));
    const names = (await a.listTools()).tools.map(t => t.name);
    assert.ok(names.includes('get_editor_guide') && names.includes('preview_workflow'));
    assert.equal((await a.listResources()).resources.length, 2);
    const docs = await a.readResource({ uri: 'svb://docs/schema' });
    assert.ok(JSON.parse(docs.contents[0].text).actions_catalog.length > 20);
    const actions = await a.callTool({ name: 'search_actions', arguments: { type: 55 } });
    assert.equal(JSON.parse(actions.content[0].text).actions[0].type, 55);
    const condition = await a.callTool({ name: 'get_editor_guide', arguments: { section: 'conditions' } });
    assert.ok(condition.content[0].text.includes('hasElement'));
    assert.equal((await a.listPrompts()).prompts[0].name, 'build_workflow');
    assert.ok((await a.getPrompt({ name: 'build_workflow', arguments: { request: 'Open example', port: '53001' } })).messages[0].content.text.includes('53001'));
    const nodes = [node()];
    const valid = await a.callTool({ name: 'validate_workflow', arguments: { nodes } });
    assert.equal(JSON.parse(valid.content[0].text).valid, true);
    assert.equal(previews.length, 0);
    const invalid = await a.callTool({ name: 'preview_workflow', arguments: { nodes: [{ ...node(), raw_input: [{ Key: 'URL', Value: 'bad' }] }] } });
    assert.equal(invalid.isError, true); assert.equal(previews.length, 0);
    const preview = await a.callTool({ name: 'preview_workflow', arguments: { nodes, target: 'main_logic' } });
    assert.equal(JSON.parse(preview.content[0].text).applied, false);
    assert.deepEqual(previews[0].nodes, nodes);
    const b = new Client({ name: 'test-b', version: '1' }); clients.push(b);
    await b.connect(new StreamableHTTPClientTransport(new URL(base + '/mcp')));
    assert.equal((await b.listTools()).tools.length, 4);
    assert.equal((await a.listTools()).tools.length, 4);
    assert.ok((await (await fetch(base + '/health')).json()).mcp_endpoint);
    assert.ok(Array.isArray(await (await fetch(base + '/actions')).json()));
    const denied = await fetch(base + '/mcp', { method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(denied.status, 403);
    const legacy = await fetch(base + '/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodes, target: 'main_logic' }) });
    assert.equal((await legacy.json()).in_preview, true);
  } finally {
    await Promise.all(clients.map(c => c.close()));
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('validator catches duplicate nested IDs, unknown action types, malformed raw_input', () => {
  const action = node();
  assert.ok(validateWorkflow([action, { ...action, type: -1, raw_input: '{}' }], skill).length >= 3);
  assert.ok(validateWorkflow([{ $type: 'SVBAutomateEditor.Models.IfBlockNode, SVBAutomateEditor.Models', id: randomUUID(), condition: '', nodes: [action, action] }], skill).length >= 2);
});
