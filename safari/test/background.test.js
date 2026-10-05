const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('background script forwards messages to native messaging and fills in the page URL', async () => {
  const received = [];
  let listener;
  const browser = {
    runtime: {
      lastError: null,
      sendNativeMessage(payload, callback) {
        received.push(payload);
        const promise = Promise.resolve({ ok: true, type: payload.type, href: payload.href });
        if (typeof callback === 'function') callback({ ok: true, via: 'callback', href: payload.href });
        return promise;
      },
      onMessage: {
        addListener(fn) { listener = fn; },
      },
    },
  };
  const context = { browser, chrome: browser, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../Extension/Resources/background.js'), 'utf8'), context);
  assert.equal(typeof listener, 'function');
  const response = await new Promise((resolve) => {
    const keep = listener({ type: 'detect-text', text: 'hello' }, { url: 'https://example.com/a' }, resolve);
    assert.equal(keep, true);
  });
  assert.equal(received[0].type, 'detect-text');
  assert.equal(received[0].href, 'https://example.com/a');
  assert.equal(response.ok, true);
  assert.equal(response.href, 'https://example.com/a');
});
