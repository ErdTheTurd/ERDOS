(function () {
  const OWNER = 'ErdTheTurd';
  const REPO = 'ERDOS';
  const FALLBACK_VERSION = '1.4.0';
  const latestBase = `https://github.com/${OWNER}/${REPO}/releases/latest/download`;

  const ua = navigator.userAgent || '';
  const isWin = /Windows/i.test(ua);
  const isMac = /Mac OS X|Macintosh/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !/Android/i.test(ua);

  const hint = document.getElementById('detect-hint');
  const primary = document.getElementById('btn-primary-download');
  const navDl = document.getElementById('nav-download');
  const dlWin = document.getElementById('dl-win');
  const dlMac = document.getElementById('dl-mac');
  const dlApp = document.getElementById('dl-appimage');
  const dlDeb = document.getElementById('dl-deb');
  const liveStreak = document.getElementById('live-streak');

  function assetUrls(version) {
    return {
      win: `${latestBase}/ErdOS-Setup-${version}.exe`,
      mac: `${latestBase}/ErdOS-${version}-mac.dmg`,
      appimage: `${latestBase}/ErdOS-${version}.AppImage`,
      deb: `${latestBase}/ErdOS-${version}.deb`,
    };
  }

  function clearRec() {
    [dlWin, dlMac, dlApp, dlDeb].forEach((el) => el?.classList.remove('is-recommended'));
  }

  function apply(version) {
    const urls = assetUrls(version);
    if (dlWin) dlWin.href = urls.win;
    if (dlMac) dlMac.href = urls.mac;
    if (dlApp) dlApp.href = urls.appimage;
    if (dlDeb) dlDeb.href = urls.deb;
    clearRec();

    let url = `https://github.com/${OWNER}/${REPO}/releases/latest`;
    let label = 'Download ErdOS';
    let tip = '';

    if (isWin) {
      url = urls.win;
      label = 'Download for Windows';
      tip = 'Windows · x64 installer';
      dlWin?.classList.add('is-recommended');
    } else if (isMac) {
      url = urls.mac;
      label = 'Download for Mac';
      tip = 'macOS · universal DMG';
      dlMac?.classList.add('is-recommended');
    } else if (isLinux) {
      url = urls.appimage;
      label = 'Download for Linux';
      tip = 'Linux · AppImage';
      dlApp?.classList.add('is-recommended');
    } else {
      tip = 'Windows · macOS · Linux';
    }

    if (primary) {
      primary.href = url;
      primary.textContent = label;
    }
    if (navDl) navDl.href = url;
    if (hint) hint.textContent = tip;
  }

  apply(FALLBACK_VERSION);

  if (liveStreak) {
    let n = 7;
    setInterval(() => {
      n = n >= 99 ? 3 : n + 1;
      liveStreak.textContent = String(n);
    }, 2200);
  }

  fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data) return;
      const version = String(data.tag_name || '').replace(/^v/, '') || FALLBACK_VERSION;
      const assets = data.assets || [];
      const find = (pred) => assets.find(pred)?.browser_download_url;

      const winUrl = find((a) => /\.exe$/i.test(a.name) && /Setup/i.test(a.name))
        || find((a) => /\.exe$/i.test(a.name));
      const macUrl = find((a) => /\.dmg$/i.test(a.name));
      const appUrl = find((a) => /\.AppImage$/i.test(a.name));
      const debUrl = find((a) => /\.deb$/i.test(a.name));

      if (winUrl && dlWin) dlWin.href = winUrl;
      if (macUrl && dlMac) dlMac.href = macUrl;
      if (appUrl && dlApp) dlApp.href = appUrl;
      if (debUrl && dlDeb) dlDeb.href = debUrl;

      if (isWin && winUrl) {
        primary.href = winUrl;
        if (navDl) navDl.href = winUrl;
      } else if (isMac && macUrl) {
        primary.href = macUrl;
        if (navDl) navDl.href = macUrl;
      } else if (isLinux && appUrl) {
        primary.href = appUrl;
        if (navDl) navDl.href = appUrl;
      }

      if (hint && hint.textContent) hint.textContent += ` · v${version}`;
    })
    .catch(() => {});
})();
