import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const outDir = '/opt/cursor/artifacts/screenshots';
const port = 4174;
const base = `http://127.0.0.1:${port}`;

function startServer() {
  const child = spawn('npx', ['--yes', 'serve', root, '-p', String(port), '--symlinks'], {
    cwd: root,
    stdio: 'ignore',
  });
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const ping = async () => {
      if (child.exitCode != null) {
        reject(new Error('serve exited ' + child.exitCode));
        return;
      }
      try {
        const res = await fetch(base + '/iphone/');
        if (res.ok) {
          resolve(child);
          return;
        }
      } catch (_) { /* not up yet */ }
      if (Date.now() - started > 15000) {
        reject(new Error('Timed out waiting for the preview server'));
        return;
      }
      setTimeout(ping, 200);
    };
    ping();
  });
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const server = await startServer();
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
  await page.goto(base + '/desktop/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const desktop = document.getElementById('desktop');
    return desktop && !desktop.hasAttribute('hidden');
  }, { timeout: 8000 });

  await page.goto(base + '/iphone/', { waitUntil: 'networkidle' });
  await page.locator('#onboarding').waitFor();
  await page.locator('#onboard-skip').waitFor();
  const slides = [
    ['onboard-browser', 'onboard-browser.png'],
    ['onboard-blok', 'onboard-blok.png'],
    ['onboard-text', 'onboard-text.png'],
    ['onboard-tripletap', 'onboard-tripletap.png'],
    ['onboard-erdai', 'onboard-erdai.png'],
    ['onboard-notes', 'onboard-notes.png'],
    ['onboard-share', 'onboard-share.png'],
  ];
  const box = await page.locator('.onboard-viewport').boundingBox();
  await page.mouse.move(box.x + box.width - 30, box.y + 220);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + 220, { steps: 10 });
  await page.mouse.up();
  await page.waitForFunction(() => document.getElementById('onboard-blok').getAttribute('aria-hidden') === 'false');
  await page.locator('.onboard-dots button').first().click();
  await page.waitForFunction(() => document.getElementById('onboard-browser').getAttribute('aria-hidden') === 'false');
  for (let i = 0; i < slides.length; i += 1) {
    await page.waitForFunction((id) => document.getElementById(id).getAttribute('aria-hidden') === 'false', slides[i][0]);
    await page.screenshot({ path: path.join(outDir, slides[i][1]) });
    if (i < slides.length - 1) await page.locator('#onboard-next').click();
  }
  await page.locator('#onboard-share-yes').waitFor();
  await page.locator('#onboard-keep').waitFor();
  await page.locator('#onboard-keep').click();
  await page.locator('#onboarding').waitFor({ state: 'detached' });
  const sharing = await page.evaluate(() => JSON.parse(localStorage.getItem('erdos-blok-settings')).shareFeedback);
  if (sharing !== false) throw new Error('Sharing should stay off after Keep it on my phone');
  await page.waitForSelector('#open-sample');
  const banned = await page.locator('#taskbar, #start-menu, #desktop-icons').count();
  if (banned !== 0) throw new Error('Phone UI still has desktop chrome');
  await page.screenshot({ path: path.join(outDir, 'browser-home.png') });

  await page.locator('#open-sample').click();
  const frame = page.frameLocator('#page-preview');
  await frame.getByText('Blok thinks this is AI-written').waitFor({ timeout: 8000 });
  await frame.getByText('Blok hid an ad').waitFor();
  await frame.getByText('Blok hid an AI Overview').waitFor();
  await frame.getByText('Blok hid an AI chat widget').waitFor();
  await frame.locator('#udm-line').waitFor();
  const udm = await frame.locator('#udm-line').innerText();
  if (!udm.includes('udm=14')) throw new Error('Google Web results URL was not rewritten: ' + udm);
  if (await frame.getByText("No, that's human").count() < 1) throw new Error('Missing human feedback button');
  if (await frame.getByText("Yep, that's AI").count() < 1) throw new Error('Missing AI feedback button');
  const shortHidden = await frame.locator('#short-note').evaluate((node) => getComputedStyle(node).display === 'none' || node.dataset.blokCovered === '1');
  if (shortHidden) throw new Error('Short text was judged');
  await page.screenshot({ path: path.join(outDir, 'blok-sample.png') });

  await page.locator('#blok-badge').click();
  await page.getByRole('dialog', { name: 'Blok for this site' }).waitFor();
  await page.getByRole('button', { name: 'Pause Blok on this site' }).waitFor();
  await page.screenshot({ path: path.join(outDir, 'blok-sheet.png') });
  await page.getByRole('button', { name: 'Close' }).click();

  await frame.locator('#human-note').click({ clickCount: 3 });
  await frame.getByText('You marked this as AI-written').waitFor();
  await frame.getByRole('button', { name: 'Undo' }).waitFor();
  await page.screenshot({ path: path.join(outDir, 'triple-tap-text.png') });
  const share = page.locator('#share-sheet');
  if (await share.count()) {
    await page.screenshot({ path: path.join(outDir, 'learning-consent.png') });
    await page.getByRole('button', { name: 'Keep it on my phone' }).click();
  }
  await frame.getByRole('button', { name: 'Undo' }).click();
  await frame.locator('#human-note').waitFor();
  const revealed = await frame.locator('#human-note').evaluate((node) => node.dataset.blokRevealed === '1' || !node.classList.contains('blok-blur'));
  if (!revealed) throw new Error('Undo did not reveal the text');

  await frame.locator('#sample-photo').scrollIntoViewIfNeeded();
  await frame.locator('#sample-photo').click({ clickCount: 3 });
  await frame.getByText('You marked this image as AI').waitFor();
  await frame.getByRole('button', { name: 'Undo' }).click();

  await frame.locator('#sample-video').scrollIntoViewIfNeeded();
  await frame.locator('#sample-video').click({ clickCount: 3 });
  await frame.getByText('You marked this video as AI').waitFor();
  await frame.getByRole('button', { name: 'Undo' }).click();

  await frame.locator('#sample-audio').scrollIntoViewIfNeeded();
  await frame.locator('.blok-media-hit:has(#sample-audio) .blok-media-cover').click({ clickCount: 3 });
  await frame.getByText('You marked this audio as AI').waitFor();
  await page.screenshot({ path: path.join(outDir, 'triple-tap-audio.png') });
  await frame.getByRole('button', { name: 'Undo' }).click();

  await page.getByRole('button', { name: 'Blok', exact: true }).click();
  await page.getByText('Text detection').waitFor();
  await page.getByText('Proprietary · not installed').first().waitFor();
  await page.screenshot({ path: path.join(outDir, 'blok-home.png') });

  await page.getByRole('button', { name: 'ERDAI', exact: true }).click();
  await page.getByRole('heading', { name: 'ERDAI is optional' }).waitFor();
  await page.getByRole('button', { name: 'Turn on ERDAI' }).waitFor();
  await page.getByRole('button', { name: 'Not now' }).waitFor();
  await page.screenshot({ path: path.join(outDir, 'erdai-consent.png') });

  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByText('Welcome.txt').waitFor();
  await page.screenshot({ path: path.join(outDir, 'notes.png') });

  await page.getByRole('button', { name: 'Arcade', exact: true }).click();
  await page.locator('#play-snake').click();
  await page.locator('#snake-pad').waitFor();
  await page.locator('#snake-pad').getByRole('button', { name: '→' }).click();
  await page.screenshot({ path: path.join(outDir, 'arcade-snake.png') });

  await page.getByRole('button', { name: 'Blok', exact: true }).click();
  await page.locator('#open-settings').waitFor();
  await page.locator('#open-settings').click();
  await page.getByRole('heading', { name: 'Settings' }).waitFor();
  await page.screenshot({ path: path.join(outDir, 'settings.png') });
  await page.locator('#replay-intro').click();
  await page.locator('#onboarding').waitFor();
  await page.locator('#onboard-skip').click();
  await page.locator('#onboarding').waitFor({ state: 'detached' });
  const stillOff = await page.evaluate(() => JSON.parse(localStorage.getItem('erdos-blok-settings')).shareFeedback);
  if (stillOff !== false) throw new Error('Replay skip changed the sharing choice');

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('phone ui ok');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
