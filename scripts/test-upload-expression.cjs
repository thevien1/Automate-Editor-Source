const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function expression(xpath) {
  const source = fs.readFileSync('src/electron/main.ts', 'utf8');
  const start = source.indexOf('      const findScript = `', source.indexOf("if (action === 'uploadFile'"));
  const end = source.indexOf('\n\n      const evalRes', start);
  assert.ok(start >= 0 && end > start);
  return vm.runInNewContext(source.slice(start, end) + '\nfindScript;', { xpath });
}
test('upload expression is valid browser JavaScript and returns the XPath input', () => {
  const input = { type: 'file' };
  const result = vm.runInNewContext(expression('//div[@role="dialog"]//input[@type="file"]'), {
    document: { evaluate: () => ({ singleNodeValue: input }) },
    XPathResult: { FIRST_ORDERED_NODE_TYPE: 9 },
  });
  assert.equal(result, input);
});
test('attach fallback runs without TypeScript syntax in browser JavaScript', () => {
  const inputs = [];
  const input = { getAttribute: () => 'image/*', hasAttribute: () => true };
  let clicks = 0;
  const result = vm.runInNewContext(expression(''), {
    document: {
      querySelectorAll: () => inputs,
      querySelector: () => ({ click: () => { clicks++; inputs.push(input); } }),
    },
  });
  assert.equal(clicks, 1);
  assert.equal(result, input);
});
