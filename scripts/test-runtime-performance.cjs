const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const context = { exports: {}, performance, setTimeout };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/runtimePerformance.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { queueThreadLog, applyThreadLogs, createCooperativeYield } = context.exports;

test('100,000 log entries stay bounded, preserve order and latest action, and leave other threads unchanged', () => {
  const buffer = new Map();
  for (let i = 0; i < 100000; i++) queueThreadLog(buffer, 1, { time: '', text: String(i), type: 'info' }, `Action ${i}`);
  assert.equal(buffer.get(1).logs.length, 500);
  const untouched = { id: 2, currentAction: '', logs: [] };
  const result = applyThreadLogs([{ id: 1, currentAction: '', logs: [] }, untouched], buffer);
  assert.equal(result[0].logs.length, 500);
  assert.equal(result[0].logs[0].text, '99500');
  assert.equal(result[0].logs.at(-1).text, '99999');
  assert.equal(result[0].currentAction, 'Action 99999');
  assert.equal(result[1], untouched);
  queueThreadLog(buffer, 1, { time: '', text: 'x'.repeat(1000000), type: 'info' });
  assert.equal(buffer.get(1).logs.at(-1).text.length, 4001);
});

test('tight workflow loops yield to timers so stop and UI events can run', async () => {
  const yieldToUI = createCooperativeYield(0);
  let timerRan = false;
  setTimeout(() => { timerRan = true; }, 0);
  for (let i = 0; i < 3; i++) await yieldToUI();
  assert.equal(timerRan, true);
});

test('concurrent Excel appends keep every row and do not block the calling event loop', async () => {
  // Compile Electron sources before this test: tsc -p tsconfig.electron.json
  const { runExcelAction, stopExcelWorker } = require('../dist-electron/excelWorkerClient');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'svb-excel-test-'));
  const file = path.join(dir, 'results.xlsx');
  let ticks = 0;
  const timer = setInterval(() => { ticks++; }, 5);
  try {
    const results = await Promise.all(Array.from({ length: 40 }, (_, i) =>
      runExcelAction('appendExcel', { path: file, col: 'A', value: `worker-${i}` })));
    assert.ok(results.every(result => result.success));
    assert.equal(new Set(results.map(result => result.row)).size, 40);
    const read = await runExcelAction('readExcelAllRows', { path: file });
    assert.equal(read.rows.length, 40);
    assert.deepEqual(read.rows.map(row => row[0]), Array.from({ length: 40 }, (_, i) => `worker-${i}`));
    assert.ok(ticks > 2, `Main loop should stay responsive (ticks=${ticks})`);
    assert.equal((await runExcelAction('writeExcel', { path: file, col: 'B', row: 3, value: 'OK' })).success, true);
    assert.equal((await runExcelAction('readExcel', { path: file, col: 'B', row: 3 })).value, 'OK');
    assert.equal((await runExcelAction('readExcel', { path: path.join(dir, 'missing.xlsx') })).success, false);
    console.log(`Excel worker: ${ticks} event-loop ticks during concurrent operations`);
  } finally {
    clearInterval(timer);
    await stopExcelWorker();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
