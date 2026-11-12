const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {}, setTimeout, clearTimeout };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/runtimeProfileStopper.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const { RuntimeProfileStopper } = context.exports;

test('329 queued profiles cause stop requests only for the two browsers actually launched', async () => {
  const requests = [];
  const stopper = new RuntimeProfileStopper(async url => { requests.push(url); return true; });
  const queue = Array.from({ length: 329 }, (_, i) => ({ threadId: i + 1, profileId: String(i + 1), name: `Profile ${i + 1}` }));
  stopper.track(queue[0]);
  stopper.track(queue[2]);
  const notified = [];
  const failed = await stopper.stopAll(profile => notified.push(profile.profileId));
  assert.equal(failed.length, 0);
  assert.equal(requests.length, 2);
  assert.deepEqual(notified, ['1', '3']);
  assert.equal(stopper.openProfiles.size, 0);
});

test('concurrent stop calls for the same browser share a request', async () => {
  let requests = 0;
  const stopper = new RuntimeProfileStopper(async () => {
    requests++; await new Promise(resolve => setTimeout(resolve, 10)); return true;
  });
  stopper.track({ threadId: 1, profileId: 'one', name: 'One' });
  await Promise.all([stopper.stop('one'), stopper.stop('one')]);
  assert.equal(requests, 1);
});

test('stops run concurrently with a limit of four', async () => {
  let active = 0, peak = 0;
  const stopper = new RuntimeProfileStopper(async () => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 10));
    active--; return true;
  });
  for (let i = 0; i < 20; i++) stopper.track({ threadId: i, profileId: String(i), name: '' });
  await stopper.stopAll(() => {});
  assert.equal(peak, 4);
  assert.equal(stopper.openProfiles.size, 0);
});

test('an unresponsive stop API finishes within its budget and retains the browser for a retry', async () => {
  const stopper = new RuntimeProfileStopper(() => new Promise(() => {}));
  stopper.track({ threadId: 1, profileId: 'offline', name: '' });
  const started = Date.now();
  assert.equal(await stopper.stop('offline'), false);
  assert.ok(Date.now() - started < 8000);
  assert.equal(stopper.openProfiles.size, 1);
});

test('failed close requests are returned for an explicit error message', async () => {
  const stopper = new RuntimeProfileStopper(async () => false);
  stopper.track({ threadId: 1, profileId: 'failed', name: 'Failed' });
  const failed = await stopper.stopAll(() => {});
  assert.equal(failed.length, 1);
  assert.equal(failed[0].profileId, 'failed');
});
