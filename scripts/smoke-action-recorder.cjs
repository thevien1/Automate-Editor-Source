// Runs only on an isolated localhost fixture, never a user's browser/profile.
const { app, BrowserWindow } = require('electron');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { once } = require('node:events');
app.commandLine.appendSwitch('remote-debugging-port', process.env.SVB_RECORDER_TEST_PORT || '57985');
app.whenReady().then(async () => {
  let scene, win;
  try {
    const { registerActionRecorder } = require('../dist-electron/actionRecorder.js');
    registerActionRecorder();
    scene = http.createServer((_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><style>input,button{display:block;width:200px;height:40px;margin:10px}</style><input id="name"><input id="secret" type="password"><button id="done">Done</button>'); });
    scene.listen(0, '127.0.0.1'); await once(scene, 'listening');
    win = new BrowserWindow({ show: true, width: 800, height: 600, webPreferences: { preload: path.resolve('dist-electron/preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
    await win.loadURL(`http://127.0.0.1:${scene.address().port}`);
    await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true });
    const start = await win.webContents.executeJavaScript(`window.electronAPI.startRecorder({port:${Number(process.env.SVB_RECORDER_TEST_PORT || 57985)}})`);
    assert.equal(start.success, true, start.error);
    const command = (name, params) => win.webContents.debugger.sendCommand(name, params);
    const click = async (x, y) => { await command('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
    await click(50, 30); await command('Input.insertText', { text: 'Xin chào' });
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 8 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await click(50, 90); await command('Input.insertText', { text: 'DO_NOT_RECORD_PASSWORD' });
    await click(50, 140);
    // Pending typing must be flushed even without Enter or blur before Stop.
    await click(50, 30); await command('Input.insertText', { text: ' FINAL_PENDING' });
    const stop = await win.webContents.executeJavaScript('window.electronAPI.stopRecorder()');
    assert.ok(stop.nodes.some(n => n.type === 48), JSON.stringify(stop));
    assert.ok(stop.nodes.some(n => n.type === 54 && n.raw_input.includes('Xin chào')));
    assert.ok(stop.nodes.some(n => n.type === 54 && n.raw_input.includes('Enter')));
    assert.equal(stop.nodes.filter(n => n.type === 54 && n.raw_input.includes('Enter')).length, 1);
    assert.ok(!JSON.stringify(stop.nodes).includes('DO_NOT_RECORD_PASSWORD'));
    assert.ok(JSON.stringify(stop.nodes).includes('FINAL_PENDING'));
    assert.equal(await win.webContents.executeJavaScript('Object.keys(window).filter(k => k.startsWith("__svb_record_") && k.endsWith("_cleanup")).length'), 0);
    const restart = await win.webContents.executeJavaScript(`window.electronAPI.startRecorder({port:${Number(process.env.SVB_RECORDER_TEST_PORT || 57985)}})`);
    assert.equal(restart.success, true);
    const second = await win.webContents.executeJavaScript('window.electronAPI.stopRecorder()');
    assert.equal(second.nodes.length, 1); // Initial URL only, no actions from the previous session.
    console.log(`PASS: recorder captured ${stop.nodes.length} fixture actions, skipped password, removed listeners on stop`);
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { win?.destroy(); scene?.closeAllConnections(); if (scene) await new Promise(resolve => scene.close(resolve)); app.exit(process.exitCode || 0); }
}).catch(error => { console.error(error); app.exit(1); });
