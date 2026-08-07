# ErdOS

**Phosphor Glass** desktop environment for **Windows** and **Linux**.

[![Release](https://img.shields.io/github/v/release/ErdTheTurd/ERDOS?style=flat-square)](https://github.com/ErdTheTurd/ERDOS/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/ErdTheTurd/ERDOS/total?style=flat-square)](https://github.com/ErdTheTurd/ERDOS/releases)

Retro chrome · modern motion · Browser · Arcade · Terminal · **ERDAI** · streaks, XP, and quests — all local, no accounts.

## Download

**Public installs:** [Latest GitHub Release](https://github.com/ErdTheTurd/ERDOS/releases/latest)

| Platform | Asset |
|----------|--------|
| Windows | `ErdOS-Setup-*.exe` |
| Linux | `ErdOS-*.AppImage` or `ErdOS-*.deb` |

Marketing site (GitHub Pages once enabled): `website/` in this repo → [erdtheturd.github.io/ERDOS](https://erdtheturd.github.io/ERDOS/) (or your Pages URL).

> Builds are **unsigned**. On Windows, SmartScreen may warn — choose **More info → Run anyway**.

## Quick start (from source)

```bash
npm install
npm start
```

Preview the download site:

```bash
npm run website
```

## Build installers

```bash
npm run dist:win     # NSIS + portable
npm run dist:linux   # AppImage + deb
```

Push a version tag to publish via GitHub Actions:

```bash
git tag v1.1.0
git push origin v1.1.0
```

## What's inside

- Desktop shell with CRT boot, taskbar, start menu, draggable windows
- **Browser**, **ERDAI**, **Arcade** (Snake / Breakout / Memory / Pong)
- **Terminal**, **Files**, **Notepad**, **Sticky Notes**, **Music Box**
- **Trophy Case**, quests, streaks, XP, rare wallpaper/theme drops
- In-app update checks via `electron-updater` (packaged builds)

## Project layout

```
electron/     Main process, preload, progress IPC, auto-updater
desktop/      Phosphor Glass UI (shell, WM, apps, habit loop)
website/      Public download / marketing page
.github/      Release + Pages workflows
```

## License

MIT
