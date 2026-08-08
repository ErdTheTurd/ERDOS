# ErdOS

> **Live site:** [erdtheturd.github.io/ERDOS](https://erdtheturd.github.io/ERDOS/) — green glassy Phosphor download page.

**Phosphor Glass** desktop for **Windows**, **macOS**, and **Linux** — a modern windowed OS with **ERDAI** powered by **Puter AI**.

Runs as a **normal app window** — never replaces your host OS.

[![Release](https://img.shields.io/github/v/release/ErdTheTurd/ERDOS?style=flat-square)](https://github.com/ErdTheTurd/ERDOS/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/ErdTheTurd/ERDOS/total?style=flat-square)](https://github.com/ErdTheTurd/ERDOS/releases)

Glassmorphic chrome · simple browser · Arcade · Terminal · **ERDAI** (real AI via Puter). No XP grind.

## Download

**Public installs:** [Latest GitHub Release](https://github.com/ErdTheTurd/ERDOS/releases/latest)

| Platform | Asset |
|----------|--------|
| Windows | `ErdOS-Setup-*.exe` |
| macOS | `ErdOS-*-mac.dmg` (universal, windowed) |
| Linux | `ErdOS-*.AppImage` or `ErdOS-*.deb` |

Marketing site: `website/` → [GitHub Pages](https://erdtheturd.github.io/ERDOS/) when enabled.

> Builds are **unsigned**.
> - **Windows:** SmartScreen → More info → Run anyway  
> - **macOS:** Right-click the app → **Open**, or run `xattr -cr /Applications/ErdOS.app`

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
npm run dist:mac     # DMG + zip (universal)
npm run dist:linux   # AppImage + deb
```

Push a version tag to publish via GitHub Actions:

```bash
git tag v1.6.0
git push origin v1.6.0
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
