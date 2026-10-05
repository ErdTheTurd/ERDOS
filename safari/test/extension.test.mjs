import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const root = path.resolve(import.meta.dirname, '../..');
const outDir = '/opt/cursor/artifacts/screenshots';

function startServer() {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function launch() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch (_) {
    return chromium.launch({ headless: true });
  }
}

const server = await startServer();
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const browser = await launch();
await mkdir(outDir, { recursive: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
});
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));

try {
  await page.goto(base + '/iphone/demo/search.html', { waitUntil: 'domcontentloaded' });
  await page.getByText('Blok hid an ad').waitFor();
  await page.getByText('Blok hid an AI Overview').waitFor();
  const extensionSheet = await page.locator('.blok-share-scrim').count();
  if (extensionSheet !== 0) throw new Error('ERDOS sample page showed the extension share sheet');

  await page.goto(base + '/safari/preview/fixture.html', { waitUntil: 'networkidle' });
  await page.getByText(/Blok thinks this is AI-written \(\d+% sure\)/).waitFor();
  await page.getByText('Text detection is Beta').waitFor();
  await page.getByText('Blok hid an ad').waitFor();
  await page.getByText('Blok hid an AI Overview').waitFor();
  await page.getByText('Blok hid an AI chat widget').waitFor();
  await page.getByRole('button', { name: "No, that's human" }).waitFor();
  await page.getByRole('button', { name: "Yep, that's AI" }).waitFor();
  const shortHidden = await page.locator('#short-note').evaluate((node) => node.dataset.blokCovered === '1' || getComputedStyle(node).display === 'none');
  if (shortHidden) throw new Error('Short text was judged');
  const humanHidden = await page.locator('#human-note').evaluate((node) => node.dataset.blokCovered === '1');
  if (humanHidden) throw new Error('Ordinary paragraph was hidden');
  await page.screenshot({ path: path.join(outDir, 'blok-extension-overlay.png') });

  await page.getByRole('button', { name: "No, that's human" }).click();
  await page.getByRole('dialog', { name: 'Keep corrections on this phone?' }).waitFor();
  await page.getByRole('button', { name: 'Keep it on my phone' }).click();
  const shareOff = await page.evaluate(() => window.__blokTestHost.snapshot().settings.shareFeedback);
  if (shareOff !== false) throw new Error('Keeping feedback on the phone turned sharing on');
  const revealed = await page.locator('#ai-paragraph').evaluate((node) => node.dataset.blokRevealed === '1');
  if (!revealed) throw new Error('Show-human did not reveal the paragraph');

  await page.locator('#sample-photo').scrollIntoViewIfNeeded();
  await page.locator('#sample-photo').click({ clickCount: 3 });
  await page.getByText('You marked this image as AI').waitFor();
  await page.getByRole('button', { name: 'Undo' }).waitFor();
  await page.screenshot({ path: path.join(outDir, 'blok-extension-tripletap.png') });
  await page.getByRole('button', { name: 'Undo' }).click();
  const undone = await page.evaluate(() => {
    const records = window.__blokTestHost.snapshot().records;
    return records.some((record) => record.kind === 'image' && record.undone);
  });
  if (!undone) throw new Error('Undo did not drop the image mark');

  const logic = fs.readFileSync(path.join(root, 'blok/blok-logic.js'), 'utf8');
  const rules = fs.readFileSync(path.join(root, 'blok/rules.json'), 'utf8');
  await page.addInitScript({ content: logic + `
    const host = BlokLogic.createHost({ rules: ${rules}, appVersion: '1.0.0' });
    window.__blokPopupHost = host;
    window.browser = {
      runtime: {
        id: 'blok-popup-test',
        lastError: null,
        sendMessage(message, callback) {
          const response = host.handle(message || {}).response;
          if (callback) callback(response);
          return Promise.resolve(response);
        },
      },
      tabs: {
        query() { return Promise.resolve([{ url: 'https://news.example.com/story' }]); },
      },
    };
  `});
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto(base + '/safari/Extension/Resources/popup.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#host').waitFor();
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  if ((await page.locator('#host').innerText()) !== 'news.example.com') {
    throw new Error('Popup did not read the active site');
  }
  if ((await page.locator('#ads-toggle').getAttribute('aria-pressed')) !== 'true') {
    throw new Error('Ads should start on');
  }
  await page.screenshot({ path: path.join(outDir, 'blok-extension-popup.png') });
  await page.locator('#pause').click();
  await page.getByRole('button', { name: 'Resume Blok on this site' }).waitFor();
  const paused = await page.evaluate(() => window.__blokPopupHost.snapshot().settings.pausedSites.includes('news.example.com'));
  if (!paused) throw new Error('Pause did not record the site');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/safari/preview/app.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await page.locator('#onboard-next').click();
  await page.getByText('Turn on Blok and Blok Content Blocker').waitFor();
  await page.getByText('On iOS 17 and earlier').waitFor();
  await page.screenshot({ path: path.join(outDir, 'blok-app-onboarding.png') });
  await page.locator('#onboard-next').click();
  await page.getByRole('button', { name: 'Start blocking' }).click();
  await page.locator('#home').waitFor();
  await page.getByText('Enable in Safari').waitFor();
  await page.screenshot({ path: path.join(outDir, 'blok-app-home.png') });
  await page.locator('#open-settings').click();
  await page.locator('#share-toggle').waitFor();
  if ((await page.locator('#share-toggle').getAttribute('aria-pressed')) !== 'false') {
    throw new Error('Share feedback should default off');
  }
  await page.getByText('Proprietary · not installed').first().waitFor();
  await page.getByText('Beta · placeholder, not the proprietary model').waitFor();
  await page.locator('#try-placeholder').click();
  await page.locator('#placeholder-result').waitFor();
  const trial = await page.locator('#placeholder-result').innerText();
  if (!/Placeholder \d+% · would hide · Beta/.test(trial)) throw new Error('Placeholder trial did not hide: ' + trial);
  await page.screenshot({ path: path.join(outDir, 'blok-app-settings.png') });
  await page.locator('#settings-back').click();
  await page.locator('#open-sites').click();
  await page.locator('#site-field').fill('news.example.com');
  await page.getByRole('button', { name: 'Pause this site' }).click();
  await page.getByRole('button', { name: 'Ads: off' }).waitFor();
  const known = await page.evaluate(() => window.__blokPreview.snapshot().knownSites);
  if (!known.includes('news.example.com')) throw new Error('Site pause was not stored');

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('blok extension preview ok');
} finally {
  await browser.close();
  server.close();
}
