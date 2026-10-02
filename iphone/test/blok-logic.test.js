const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Logic = require('../js/blok-logic');

const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '../blok/rules.json'), 'utf8'));

test('text hides at 80 percent only when the block is long enough', () => {
  assert.equal(Logic.shouldHideText({ confidence: 0.8, words: 50 }), true);
  assert.equal(Logic.shouldHideText({ confidence: 0.79, words: 80 }), false);
  assert.equal(Logic.shouldHideText({ confidence: 0.99, words: 49 }), false);
  assert.equal(Logic.shouldHideText({ confidence: 0.99, words: 80, remembered: 'human' }), false);
  assert.equal(Logic.shouldHideText({ confidence: 0.1, words: 3, manual: true }), true);
});

test('placeholder needs three canned phrases to cross 80 percent', () => {
  const two = Logic.mockDetectText('As an AI language model, it is important to note that this paragraph keeps going so the word count is not the reason it stays visible. People still have to read past the opening before the thought is finished and the extra words are here on purpose.');
  const three = Logic.mockDetectText(two && 'As an AI language model, it is important to note that in today\'s rapidly shifting pages a writer may delve into more sources than a reader asked for, and this sentence is long enough for the beta rule.');
  assert.ok(two.confidence < 0.8);
  assert.equal(two.placeholder, true);
  assert.equal(two.model, null);
  assert.ok(three.confidence >= 0.8);
  assert.equal(Logic.detectorStub('image').status, 'no-model');
  assert.equal(Logic.detectorStub('text').beta, true);
  assert.equal(Logic.DETECTORS.video.proprietary, true);
  assert.equal(Logic.DETECTORS.audio.learns, 'on-device-continual');
});

test('google web results add udm=14 and leave other searches alone', () => {
  assert.equal(
    Logic.googleWebResultsUrl('https://www.google.com/search?q=cats'),
    'https://www.google.com/search?q=cats&udm=14'
  );
  assert.equal(
    Logic.googleWebResultsUrl('https://www.google.com/search?q=cats&udm=14'),
    'https://www.google.com/search?q=cats&udm=14'
  );
  assert.equal(Logic.googleWebResultsUrl('https://www.google.com/search?q=cats&tbm=isch'), null);
  assert.equal(Logic.googleWebResultsUrl('https://example.com/search?q=cats'), null);
});

test('starter rules are original and can take per-site exceptions', () => {
  assert.match(rules.notice, /not EasyList/i);
  ['ads', 'trackers', 'ai', 'cosmetic'].forEach((name) => {
    assert.ok(rules[name].length > 0);
    rules[name].forEach((rule) => {
      assert.equal(typeof rule.trigger['url-filter'], 'string');
      assert.ok(rule.action.type === 'block' || rule.action.type === 'css-display-none');
      if (rule.action.type === 'css-display-none') assert.ok(rule.action.selector);
    });
  });
  const original = rules.ads[0].trigger['url-filter'];
  const next = Logic.applySiteExceptions(rules.ads, ['News.Example.com']);
  assert.deepEqual(next[0].trigger['unless-domain'], ['news.example.com', '*.news.example.com']);
  assert.equal(rules.ads[0].trigger['unless-domain'], undefined);
  assert.equal(rules.ads[0].trigger['url-filter'], original);
});

test('triple tap flags selected text and media, and ignores form fields', () => {
  assert.deepEqual(Logic.resolveTripleTap({ selectionText: '  hello world  ' }), {
    kind: 'text', manual: true, source: 'triple-tap', text: 'hello world',
  });
  assert.equal(Logic.resolveTripleTap({ selectionText: '' }), null);
  assert.equal(Logic.resolveTripleTap({ mediaKind: 'image', selectionText: 'caption' }).kind, 'image');
  assert.equal(Logic.resolveTripleTap({ mediaKind: 'video' }).kind, 'video');
  assert.equal(Logic.resolveTripleTap({ mediaKind: 'audio' }).kind, 'audio');
  assert.equal(Logic.resolveTripleTap({ editable: true, selectionText: 'secret', mediaKind: 'image' }), null);
});

test('feedback stays on device until sharing is opted in, and undo drops it', () => {
  const local = Logic.buildFeedbackRecord({
    kind: 'text', verdict: 'ai', source: 'triple-tap', text: 'Write me at ada@example.com or 415-555-0134', manual: true,
  }, { shareFeedback: false, reviewBeforeSending: true });
  assert.equal(local.learning.personal, true);
  assert.equal(local.learning.appliedToModel, false);
  assert.equal(local.sharing.state, 'on-device');
  assert.match(local.excerpt, /\[email\]/);
  assert.match(local.excerpt, /\[phone\]/);
  assert.equal(local.confidenceSource, 'manual');
  assert.equal(local.score, null);

  const queued = Logic.buildFeedbackRecord({
    kind: 'image', verdict: 'ai', source: 'triple-tap', mediaKey: 'photo-1', manual: true,
  }, { shareFeedback: true, reviewBeforeSending: true });
  assert.equal(queued.sharing.state, 'needs-review');

  const sensitive = Logic.buildFeedbackRecord({
    kind: 'text', verdict: 'human', source: 'buttons', text: 'password page', sensitive: true, score: 0.9,
  }, { shareFeedback: true, reviewBeforeSending: false });
  assert.equal(sensitive.sharing.state, 'on-device');
  assert.equal(sensitive.sharing.reason, 'sensitive-page');

  let records = Logic.upsertRecord([], local);
  assert.equal(Logic.verdictFor(records, local.hash), 'ai');
  records = Logic.undoRecord(records, local.id);
  assert.equal(Logic.verdictFor(records, local.hash), null);
  const summary = Logic.adapterSummary(records.concat([queued]));
  assert.equal(summary.image.examples, 1);
  assert.equal(summary.text.examples, 0);
  assert.equal(summary.text.placeholder, true);
  assert.equal(Logic.shareQueue(records.concat([queued])).length, 1);
});

test('hash is stable for the native placeholder', () => {
  assert.equal(Logic.hashText('blok'), '7c7050af');
});
