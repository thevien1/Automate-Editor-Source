// Run with electron scripts/smoke-excel-worker.cjs [path/to/app.asar].
// Exercises the worker under Electron, including ASAR module resolution.
const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
app.whenReady().then(async () => {
  const archive = process.argv[2];
  const root = archive ? path.resolve(archive) : path.resolve(__dirname, '..');
  const { runExcelAction, stopExcelWorker } = require(path.join(root, 'dist-electron', 'excelWorkerClient.js'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'svb-electron-worker-'));
  try {
    const file = path.join(dir, 'smoke.xlsx');
    const writes = await Promise.all(Array.from({ length: 5 }, (_, i) =>
      runExcelAction('appendExcel', { path: file, col: 'A', value: `row-${i}` })));
    assert.ok(writes.every(result => result.success), JSON.stringify(writes));
    const read = await runExcelAction('readExcelAllRows', { path: file });
    assert.equal(read.rows.length, 5);
    assert.equal(read.rows[4][0], 'row-4');
    console.log('PASS: Electron worker reads/writes Excel' + (archive ? ' from packaged ASAR' : ''));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await stopExcelWorker();
    fs.rmSync(dir, { recursive: true, force: true });
    app.exit(process.exitCode || 0);
  }
}).catch(error => { console.error(error); app.exit(1); });
