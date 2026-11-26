const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/workflowLocation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const { indexWorkflow, formatWorkflowLocation } = context.exports;
const action = id => ({ id, display_text: 'Click', type: 48 });
const root = (id, nodes) => ({ id, display_text: id, nodes, expanded: false });
const script = { before_init: root('before', [action('setup')]), main_logic: root('logic', [root('if', [action('nested')]), action('after-if')]), after_quit: root('after', []) };
test('source lines match Canvas depth-first numbering even for collapsed blocks', () => {
  const entries = indexWorkflow(script);
  const nested = entries.find(item => item.nodeId === 'nested');
  assert.equal(nested.line, 5);
  assert.deepEqual(Array.from(nested.parentIds), ['logic', 'if']);
  assert.ok(formatWorkflowLocation(nested).includes('Nhánh chính | Main logic | Dòng 5'));
});
test('sub-workflow has its own row numbers and branch name', () => {
  const entry = indexWorkflow(script, 'Login').find(item => item.nodeId === 'nested');
  assert.equal(entry.line, 3);
  assert.ok(formatWorkflowLocation(entry).includes('Nhánh phụ: Login'));
});
