(function () {
  const OWNER = 'ErdTheTurd';
  const REPO = 'ERDOS';
  const FALLBACK_VERSION = '1.2.0';
  const latestBase = `https://github.com/${OWNER}/${REPO}/releases/latest/download`;

  const ua = navigator.userAgent || '';
  const isWin = /Windows/i.test(ua);
  const isMac = /Mac OS X|Macintosh/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !/Android/i.test(ua);

  const hint = document.getElementById('detect-hint');
  const primary = document.getElementById('btn-primary-download');
  const dlWin = document.getElementById('dl-win');
  const dlMac = document.getElementById('dl-mac');
  const dlApp = document.getElementById('dl-appimage');
  const dlDeb = document.getElementById('dl-deb');

  function assetUrls(version) {
    return {
      win: `${latestBase}/ErdOS-Setup-${version}.exe`,
      mac: `${latestBase}/ErdOS-${version}-mac.dmg`,
      appimage: `${latestBase}/ErdOS-${version}.AppImage`,
      deb: `${latestBase}/ErdOS-${version}.deb`,
    };
  }

  function apply(version) {
    const urls = assetUrls(version);
    if (dlWin) dlWin.href = urls.win;
    if (dlMac) dlMac.href = urls.mac;
    if (dlApp) dlApp.href = urls.appimage;
    if (dlDeb) dlDeb.href = urls.deb;

    if (isWin) {
      primary.href = urls.win;
      primary.textContent = 'Download for Windows';
      dlWin?.classList.add('is-recommended');
      hint.textContent = 'Recommended for your system: Windows installer';
    } else if (isMac) {
      primary.href = urls.mac;
      primary.textContent = 'Download for Mac';
      dlMac?.classList.add('is-recommended');
      hint.textContent = 'Recommended for your system: macOS DMG (opens in a normal window)';
    } else if (isLinux) {
      primary.href = urls.appimage;
      primary.textContent = 'Download for Linux';
      dlApp?.classList.add('is-recommended');
      hint.textContent = 'Recommended for your system: Linux AppImage (or grab the .deb)';
    } else {
      primary.href = `https://github.com/${OWNER}/${REPO}/releases/latest`;
      primary.textContent = 'View downloads';
      hint.textContent = 'Pick Windows, macOS, or Linux below.';
    }
  }

  apply(FALLBACK_VERSION);

  fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data) return;
      const version = String(data.tag_name || '').replace(/^v/, '') || FALLBACK_VERSION;
      const assets = data.assets || [];
      const find = (pred) => assets.find(pred)?.browser_download_url;

      const winUrl = find((a) => /\.exe$/i.test(a.name) && /Setup/i.test(a.name))
        || find((a) => /\.exe$/i.test(a.name));
      const macUrl = find((a) => /\.dmg$/i.test(a.name))
        || find((a) => /mac.*\.zip$/i.test(a.name));
      const appUrl = find((a) => /\.AppImage$/i.test(a.name));
      const debUrl = find((a) => /\.deb$/i.test(a.name));

      if (winUrl && dlWin) dlWin.href = winUrl;
      if (macUrl && dlMac) dlMac.href = macUrl;
      if (appUrl && dlApp) dlApp.href = appUrl;
      if (debUrl && dlDeb) dlDeb.href = debUrl;

      if (isWin && winUrl) primary.href = winUrl;
      else if (isMac && macUrl) primary.href = macUrl;
      else if (isLinux && appUrl) primary.href = appUrl;

      hint.textContent = (hint.textContent || '') + ` · latest ${version}`;
    })
    .catch(() => {});

  const stage = document.querySelector('.mock-desktop');
  if (stage) {
    let t = 0;
    setInterval(() => {
      t += 1;
      stage.style.setProperty('--drift', `${Math.sin(t / 20) * 6}px`);
    }, 40);
  }
})();
