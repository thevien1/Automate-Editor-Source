const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function load(platform) {
  const context = { exports: {}, require: name => name === 'path' ? (platform === 'win32' ? path.win32 : path.posix) : require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/electron/platformSupport.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, context);
  return context.exports;
}
test('Mac discovers application binaries in system and user Applications folders', () => {
  const paths = load('darwin').chromeCandidates('darwin', '/Users/test user', {});
  assert.ok(paths.includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));
  assert.ok(paths.includes('/Users/test user/Applications/Chromium.app/Contents/MacOS/Chromium'));
  assert.ok(paths.every(p => !p.includes('.exe')));
});
test('Windows discovery retains Program Files and per-user Chrome installs', () => {
  const paths = load('win32').chromeCandidates('win32', 'C:\\Users\\test', { ProgramFiles: 'D:\\Apps', LOCALAPPDATA: 'C:\\Local' });
  assert.ok(paths.includes('D:\\Apps\\Google\\Chrome\\Application\\chrome.exe'));
  assert.ok(paths.includes('C:\\Local\\Google\\Chrome\\Application\\chrome.exe'));
});
test('Mac launcher quotes package names including shell metacharacters', () => {
  const script = load('darwin').macLauncher("test ' $(touch bad) `bad`.svblaunch");
  assert.ok(script.includes("'test '\\'' $(touch bad) `bad`.svblaunch'"));
  assert.ok(script.includes('"$SCRIPT_DIR"/'));
  assert.ok(script.includes('open -b com.svbrowser.automateeditor "$SCRIPT_DIR"/'));
  assert.ok(!script.includes('--args')); // Send open-file even when the app is already running.
});
test('Mac packaging includes both installer and updater payload with universal arch', () => {
  const pkg = require('../package.json');
  assert.deepEqual(pkg.build.mac.target.map(t => t.target), ['dmg', 'zip']);
  assert.ok(pkg.build.mac.target.every(t => t.arch.includes('universal')));
  assert.ok(pkg.build.extraResources.some(r => r.to === 'scripts' && r.filter.includes('*.py')));
});

test('Mac icon meets electron-builder minimum dimensions', () => {
  const png = fs.readFileSync(require('../package.json').build.mac.icon);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.ok(png.readUInt32BE(16) >= 512 && png.readUInt32BE(20) >= 512);
});
