const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

app.whenReady().then(async () => {
  const archive = path.resolve(process.argv[2]);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svb-packaged-update-'));
  try {
    const { createAppUpdater } = require(path.join(archive, 'appUpdater.js'));
    const { preserveDrivers } = require(path.join(archive, 'driverStorage.js'));
    assert.equal(typeof createAppUpdater(async () => {}).check, 'function');
    const source = path.join(root, 'old', 'drivers');
    const file = path.join(source, 'ChromiumCore_v153', 'Chrome-bin', 'chrome.exe');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'core retained');
    const destination = await preserveDrivers(path.join(root, 'data'), [source]);
    fs.rmSync(path.join(root, 'old'), { recursive: true });
    assert.equal(fs.readFileSync(path.join(destination, 'ChromiumCore_v153', 'Chrome-bin', 'chrome.exe'), 'utf8'), 'core retained');
    console.log('PASS: packaged updater loads production dependencies and preserves Chromium outside the old installation');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    app.exit(process.exitCode || 0);
  }
}).catch(error => { console.error(error); app.exit(1); });
