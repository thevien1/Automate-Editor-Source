// electron scripts/smoke-mcp-electron.cjs release/win-unpacked/resources/app.asar
const { app } = require('electron');
const path = require('node:path');
const assert = require('node:assert/strict');
const { once } = require('node:events');
app.whenReady().then(async () => {
  let httpServer, client;
  try {
    const root = path.resolve(process.argv[2]);
    const { startSkillServer } = require(path.join(root, 'dist-electron/skillServer.js'));
    const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
    httpServer = startSkillServer(0);
    await once(httpServer, 'listening');
    client = new Client({ name: 'packaged-smoke', version: '1' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${httpServer.address().port}/mcp`)));
    assert.equal((await client.listTools()).tools.length, 4);
    const resource = await client.readResource({ uri: 'svb://docs/schema' });
    assert.ok(JSON.parse(resource.contents[0].text).actions_catalog.length > 20);
    console.log('PASS: packaged Electron ASAR serves MCP tools and documentation');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally {
    await client?.close();
    if (httpServer) { httpServer.closeAllConnections(); await new Promise(resolve => httpServer.close(resolve)); }
    app.exit(process.exitCode || 0);
  }
}).catch(error => { console.error(error); app.exit(1); });
