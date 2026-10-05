const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');

test('Blok bundle ids do not collide with ERDOS', () => {
  const capacitor = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const project = fs.readFileSync(path.join(root, 'safari/Blok.xcodeproj/project.pbxproj'), 'utf8');
  const erdosBrowser = capacitor.appId;
  const erdosDesktop = pkg.build.appId;
  assert.equal(erdosBrowser, 'com.erdos.browser');
  assert.equal(erdosDesktop, 'com.erdos.desktop');
  for (const id of ['com.erdos.blok', 'com.erdos.blok.Extension', 'com.erdos.blok.ContentBlocker']) {
    assert.notEqual(id, erdosBrowser);
    assert.notEqual(id, erdosDesktop);
    assert.match(project, new RegExp(id.replace(/\./g, '\\.')));
  }
  assert.doesNotMatch(project, /PRODUCT_BUNDLE_IDENTIFIER = com\.erdos\.browser;/);
  assert.doesNotMatch(project, /PRODUCT_BUNDLE_IDENTIFIER = com\.erdos\.desktop;/);
  const group = fs.readFileSync(path.join(root, 'safari/App/Blok.entitlements'), 'utf8');
  assert.match(group, /group\.com\.erdos\.blok/);
  assert.match(fs.readFileSync(path.join(root, 'safari/Extension/Info.plist'), 'utf8'), /com\.apple\.Safari\.web-extension/);
  assert.match(fs.readFileSync(path.join(root, 'safari/ContentBlocker/Info.plist'), 'utf8'), /com\.apple\.Safari\.content-blocker/);
});
