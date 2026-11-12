const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture({ packaged = true, emitAvailable = true, latestVersion = '9.0.0', platform = 'win32', env = {} } = {}) {
  const handlers = {};
  const updater = new EventEmitter();
  let checks = 0, downloads = 0, installs = 0;
  updater.currentVersion = { compare: version => require('semver').compare('1.0.0', version) };
  updater.checkForUpdates = async () => {
    checks++;
    if (emitAvailable) updater.emit('update-available', { version: latestVersion });
    return { updateInfo: { version: latestVersion } };
  };
  updater.downloadUpdate = () => { downloads++; return new Promise(() => {}); };
  updater.quitAndInstall = (silent, restart) => { assert.equal(silent, true); assert.equal(restart, true); installs++; };
  const electron = {
    app: { isPackaged: packaged, getVersion: () => '1.0.0' },
    BrowserWindow: { getAllWindows: () => [], fromWebContents: () => null },
    dialog: { showMessageBox: () => { throw Error('Must not show a second confirmation'); } },
    ipcMain: { handle: (name, callback) => { handlers[name] = callback; } },
  };
  const context = { exports: {}, setImmediate, process: { platform, env },
    require: (name) => name === 'electron' ? electron : { autoUpdater: updater } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/electron/appUpdater.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  context.exports.registerAppUpdater();
  return { handlers, updater, counts: () => ({ checks, downloads, installs }) };
}

test('concurrent checks and checks during download do not start duplicate downloads', async () => {
  const f = fixture();
  await Promise.all([f.handlers['updater:check'](), f.handlers['updater:check']()]);
  await f.handlers['updater:check']();
  assert.deepEqual(f.counts(), { checks: 1, downloads: 1, installs: 0 });
  f.updater.emit('download-progress', { percent: 42 });
  assert.equal(f.handlers['updater:state']().percent, 42);
  f.updater.emit('error', new Error('offline'));
  assert.equal(f.handlers['updater:state']().status, 'error');
  await f.handlers['updater:check']();
  assert.equal(f.counts().checks, 2);
});

test('one click installs a downloaded update and restarts without a confirmation or duplicate install', async () => {
  const f = fixture();
  assert.equal(await f.handlers['updater:install'](), false);
  f.updater.emit('update-downloaded', { version: '9.0.0' });
  assert.equal(await f.handlers['updater:install'](), true);
  assert.equal(await f.handlers['updater:install'](), false);
  await new Promise(setImmediate);
  assert.equal(f.counts().installs, 1);
});

test('development builds never download updates', async () => {
  const f = fixture({ packaged: false });
  assert.equal((await f.handlers['updater:check']()).unsupported, true);
  assert.equal(f.counts().downloads, 0);
});

test('macOS uses the updater while Windows portable and Linux remain unsupported', async () => {
  const mac = fixture({ platform: 'darwin' });
  assert.equal(mac.handlers['updater:state']().supported, true);
  assert.equal((await mac.handlers['updater:check']()).hasUpdate, true);
  for (const options of [{ platform: 'win32', env: { PORTABLE_EXECUTABLE_FILE: 'app.exe' } }, { platform: 'linux' }]) {
    const f = fixture(options);
    assert.equal((await f.handlers['updater:check']()).unsupported, true);
    assert.equal(f.counts().downloads, 0);
  }
});

test('availability comes from returned version even without an available event', async () => {
  const f = fixture({ emitAvailable: false });
  const result = await f.handlers['updater:check']();
  assert.equal(result.hasUpdate, true);
  assert.equal(result.version, '9.0.0');
  assert.equal(f.counts().downloads, 1);
});

test('an equal installed version is not downloaded', async () => {
  const f = fixture({ emitAvailable: false, latestVersion: '1.0.0' });
  assert.equal((await f.handlers['updater:check']()).hasUpdate, false);
  assert.equal(f.counts().downloads, 0);
});
