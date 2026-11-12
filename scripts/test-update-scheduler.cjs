const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/updateScheduler.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);

function clock() {
  let time = 0, id = 0;
  const timers = new Map(), listeners = new Map();
  const host = {
    setTimeout: (callback, delay) => { const key = ++id; timers.set(key, { callback, due: time + delay }); return key; },
    clearTimeout: key => timers.delete(key),
    addEventListener: (event, callback) => listeners.set(event, callback),
    removeEventListener: event => listeners.delete(event),
  };
  return { host, now: () => time, timers, listeners,
    event: name => listeners.get(name)?.(),
    advance: async delay => {
      time += delay;
      for (const [key, timer] of [...timers]) if (timer.due <= time) { timers.delete(key); timer.callback(); }
      await new Promise(setImmediate);
    },
  };
}

test('startup checks, retries stale results after 30s, then refreshes every 5 minutes', async () => {
  const c = clock(); let checks = 0;
  const stop = context.exports.startUpdateScheduler(async () => { checks++; }, c.host, c.now);
  await c.advance(1999); assert.equal(checks, 0);
  await c.advance(1); assert.equal(checks, 1);
  await c.advance(30000); assert.equal(checks, 2);
  await c.advance(300000); assert.equal(checks, 3);
  stop();
  assert.equal(c.timers.size, 0);
  assert.equal(c.listeners.size, 0);
});

test('network recovery retries, focus is throttled, and overlapping checks are skipped', async () => {
  const c = clock(); let checks = 0, finish;
  const stop = context.exports.startUpdateScheduler(() => {
    checks++; return new Promise(resolve => { finish = resolve; });
  }, c.host, c.now);
  await c.advance(2000);
  c.event('online'); c.event('focus'); assert.equal(checks, 1);
  finish(); await c.advance(0);
  c.event('focus'); assert.equal(checks, 1);
  c.event('online'); assert.equal(checks, 2);
  finish(); await c.advance(30000);
  c.event('focus'); assert.equal(checks, 3);
  stop(); finish(); await c.advance(0);
  assert.equal(c.timers.size, 0);
});

test('a failed startup check does not disable the automatic retry', async () => {
  const c = clock(); let checks = 0;
  const stop = context.exports.startUpdateScheduler(async () => { checks++; throw Error('offline'); }, c.host, c.now);
  await c.advance(2000); await c.advance(30000);
  assert.equal(checks, 2);
  stop();
});
