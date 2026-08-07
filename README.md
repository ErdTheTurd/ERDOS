# ErdOS

Downloadable desktop environment for **Windows** and **Linux**.

ErdOS is an Electron-based OS-style desktop with a window manager, taskbar, start menu, and built-in apps — including a browser, games, and **ERDAI**, the onboard AI assistant.

## Features

- Desktop shell with wallpaper, icons, taskbar, and start menu
- Movable / resizable windows (minimize, maximize, close)
- **Browser** — webview browsing with address bar and search
- **ERDAI** — chat assistant for tips, jokes, riddles, and help
- **Games** — Snake, Breakout, Memory Match
- **Files** — browse ErdOS home folders
- **Notepad**, **Calculator**, **Settings** (themes + system info)
- Marketing site in `website/` for downloads

## Quick start

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
# Windows (NSIS installer + portable)
npm run dist:win

# Linux (AppImage + .deb)
npm run dist:linux

# Current platform
npm run dist
```

Artifacts are written to `dist/`.

## Project layout

```
electron/     Main process + preload bridge
desktop/      Desktop UI (shell, window manager, apps)
website/      Public download / marketing page
```

## License

MIT
