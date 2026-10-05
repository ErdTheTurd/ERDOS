const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Logic = require('../blok-logic');

const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '../rules.json'), 'utf8'));
const bundledList = JSON.parse(fs.readFileSync(path.join(__dirname, '../../safari/ContentBlocker/blockerList.json'), 'utf8'));

test('compiled blocker list is our own rules and matches the bundled default', () => {
  const list = Logic.compileBlockerList(rules, {});
  assert.ok(list.length > rules.ads.length);
  assert.deepEqual(list, bundledList);
  list.forEach((rule) => {
    assert.equal(rule.trigger['unless-domain'], undefined);
  });
  const paused = Logic.compileBlockerList(rules, { pausedSites: ['News.Example.com'] });
  assert.deepEqual(paused[0].trigger['unless-domain'], ['news.example.com', '*.news.example.com']);
  assert.equal(rules.ads[0].trigger['unless-domain'], undefined);
  const adsOff = Logic.compileBlockerList(rules, { ads: false });
  assert.equal(adsOff.some((rule) => /doubleclick/.test(rule.trigger['url-filter'])), false);
  assert.equal(adsOff.some((rule) => /chatbase/.test(rule.trigger['url-filter'])), true);
  const aiOff = Logic.compileBlockerList(rules, { ai: false, disabledAds: ['ads.example'] });
  assert.equal(aiOff.some((rule) => /chatbase/.test(rule.trigger['url-filter'])), false);
  assert.deepEqual(aiOff[0].trigger['unless-domain'], ['ads.example', '*.ads.example']);
});

test('host keeps feedback on device until sharing is chosen', () => {
  const host = Logic.createHost({ rules, now: '2026-10-05T12:00:00Z' });
  const detected = host.handle({
    type: 'detect-text',
    id: 't1',
    text: 'As an AI language model, it is important to note that in today\'s rapidly shifting pages a writer may delve into more than anyone asked.',
  });
  assert.equal(detected.response.placeholder, true);
  assert.equal(detected.response.beta, true);
  assert.equal(detected.response.model, null);
  assert.equal(detected.response.label, 'placeholder');
  assert.ok(detected.response.confidence >= 0.8);
  assert.equal(detected.reloadBlocker, false);

  const saved = host.handle({
    type: 'feedback',
    kind: 'text',
    verdict: 'human',
    text: 'Write ada@example.com or 415-555-0134',
    score: detected.response.confidence,
    href: 'https://www.example.com/story',
    source: 'buttons',
  });
  assert.equal(saved.response.askShare, true);
  assert.equal(saved.state.records[0].sharing.state, 'on-device');
  assert.match(saved.state.records[0].excerpt, /\[email\]/);
  assert.match(saved.state.records[0].excerpt, /\[phone\]/);
  assert.equal(saved.state.settings.shareFeedback, false);

  host.handle({ type: 'share-choice', choice: 'local' });
  const again = host.handle({
    type: 'feedback',
    kind: 'text',
    verdict: 'ai',
    text: 'still local',
    href: 'https://example.com/a',
  });
  assert.equal(again.response.askShare, false);
  assert.equal(again.state.settings.shareChoice, 'local');
});

test('opt-in sharing queues a review and skips sensitive sites', () => {
  const host = Logic.createHost({
    rules,
    settings: { shareFeedback: true, shareChoice: 'share', reviewBeforeSending: true },
  });
  const queued = host.handle({
    type: 'feedback',
    kind: 'image',
    verdict: 'ai',
    mediaKey: 'photo-1',
    href: 'https://photos.example/a',
    source: 'triple-tap',
    manual: true,
  });
  assert.equal(queued.state.records[0].sharing.state, 'needs-review');
  assert.equal(queued.response.askShare, false);
  const reviewed = host.handle({ type: 'review-share', id: queued.response.id, approve: true });
  assert.equal(reviewed.state.records[0].sharing.state, 'queued');

  const mail = host.handle({
    type: 'feedback',
    kind: 'text',
    verdict: 'ai',
    text: 'inbox text that is long enough to store',
    href: 'https://mail.google.com/mail/u/0/',
    score: 0.9,
  });
  const mailRecord = mail.state.records.find((record) => record.domain === 'mail.google.com');
  assert.equal(mailRecord.sharing.state, 'on-device');
  assert.equal(mailRecord.sharing.reason, 'sensitive-page');

  const cleared = host.handle({ type: 'clear-learning', scope: 'shared' });
  const kept = cleared.state.records.find((record) => record.id === queued.response.id);
  assert.equal(kept.excerpt, '');
  assert.equal(kept.sharing.state, 'on-device');
  assert.equal(cleared.state.queue.length, 0);
});

test('per-site pause rewrites the blocker list and counts hides', () => {
  const host = Logic.createHost({ rules, now: '2026-10-05T15:00:00Z' });
  const paused = host.handle({ type: 'pause-site', host: 'News.Example.com', paused: true });
  assert.equal(paused.reloadBlocker, true);
  assert.ok(paused.blockerList[0].trigger['unless-domain'].includes('news.example.com'));
  const config = host.handle({ type: 'get-popup', href: 'https://www.news.example.com/a' }).response;
  assert.equal(config.host, 'news.example.com');
  assert.equal(config.adsOn, false);
  assert.equal(config.aiOn, false);
  assert.equal(config.shareFeedback, false);

  host.handle({ type: 'hid', kind: 'ads' });
  host.handle({ type: 'hid', kind: 'text' });
  host.handle({ type: 'hid', kind: 'widget' });
  const stats = host.handle({ type: 'get-popup', href: 'https://example.com' }).response.stats;
  assert.equal(stats.ads, 1);
  assert.equal(stats.text, 1);
  assert.equal(stats.widget, 1);
  assert.equal(stats.day, '2026-10-05');

  const resumed = host.handle({ type: 'set-site', host: 'news.example.com', ads: true, ai: true });
  assert.deepEqual(resumed.state.knownSites, []);
  const home = host.handle({ type: 'get-config', href: 'https://news.example.com' }).response.config;
  assert.equal(home.ads, true);
  assert.equal(home.ai, true);
});

test('image detector stub stays labeled and text hide rule is unchanged', () => {
  const host = Logic.createHost({ rules });
  const image = host.handle({ type: 'detect', kind: 'image' }).response;
  assert.equal(image.status, 'no-model');
  assert.equal(image.placeholder, true);
  assert.equal(image.proprietary, true);
  assert.equal(image.model, null);
  const text = host.handle({ type: 'detect', kind: 'text' }).response;
  assert.equal(text.beta, true);
  assert.match(text.message, /placeholder/i);
});
