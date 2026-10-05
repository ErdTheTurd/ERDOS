# Blok for Safari

Blok is its own iPhone app. It is a Safari web extension plus a Safari content blocker. The ERDOS browser stays a separate app (`com.erdos.browser` in `capacitor.config.json`, `com.erdos.desktop` for the desktop build). Blok uses `com.erdos.blok`.

This Mac does not need to change the ERDOS phone UI. Both apps load the same files in `blok/`:

| File | What it is |
| --- | --- |
| `blok/blok-logic.js` | Rules compiler, placeholder detector, feedback records, per-site switches |
| `blok/page-script.js` | On-page hides, the blue overlay, triple-tap, feedback buttons |
| `blok/rules.json` | Original starter list for ads, trackers, AI widgets, and cosmetic hides |

`iphone/js/blok-logic.js`, `iphone/blok/page-script.js`, and `iphone/blok/rules.json` are symlinks to those files. `npm run iphone` follows them (`serve --symlinks`).

The text score in this build is a **placeholder**, marked **Beta**. Image, video, and audio detectors are proprietary models and are **not installed**. Feedback stays on the iPhone unless Share feedback is turned on. Nothing is uploaded.

## What the Xcode project contains

Open `safari/Blok.xcodeproj`. Three targets:

| Target | Bundle id | Role |
| --- | --- | --- |
| Blok | `com.erdos.blok` | SwiftUI container: onboarding, today counts, per-site Ads/AI, settings |
| BlokExtension | `com.erdos.blok.Extension` | Manifest v3 Safari web extension |
| BlokContentBlocker | `com.erdos.blok.ContentBlocker` | Network and CSS blocking |

All three share the App Group `group.com.erdos.blok`. The extension calls `SafariWebExtensionHandler` with `browser.runtime.sendNativeMessage`. That handler runs `blok/blok-logic.js` in JavaScriptCore so the phone and the extension stay on the same rules. The content blocker reads `blockerList.json` from the App Group when the app has written one, and otherwise uses the copy in the extension.

Deployment target is iOS 16. The shared Swift files use Foundation, JavaScriptCore, and SafariServices, not UIKit, so a Mac target can reuse them later. There is no Mac target in this project yet.

## Build and run on a Mac

1. Install Xcode 15 or newer, and join the Apple Developer Program if you want to run on a device.
2. Open `safari/Blok.xcodeproj`.
3. Select the **Blok** target, then **Signing & Capabilities**. Choose your Team. Repeat for **BlokExtension** and **BlokContentBlocker**. Use the same team for all three.
4. Confirm each target has the App Group `group.com.erdos.blok`. The entitlements files already name it. If Xcode shows the group as missing, add the App Groups capability and that identifier so the portal registers it.
5. Leave the bundle ids as they are. Do not reuse `com.erdos.browser`.
6. Choose an iPhone (or the iOS Simulator) and press Run. The scheme is **Blok**.

The first screen is a short intro. The second page is how to turn the extension on. Skip leaves sharing off.

## Turn the extension on

On iOS 18 and later:

1. Open the **Settings** app.
2. Tap **Apps**.
3. Tap **Safari**.
4. Tap **Extensions**.
5. Turn on **Blok** and **Blok Content Blocker**.
6. Tap each one and set Allow to **All Websites**.

On iOS 17 and earlier the path is **Settings > Safari > Extensions**, then the same two switches.

In Safari, open the extensions menu (the puzzle piece) and show Blok in the toolbar. Tap the Blok icon for today’s counts and the Ads and AI switches for that site. **Pause Blok on this site** turns both off and reloads the content blocker rules.

The container app lists paused sites, Visual or Clean mode, text detection (Beta), and Share feedback. Share feedback defaults to **off**. Review before sending defaults to **on**. Delete controls clear the on-device queue or the whole learning store.

## What “blocked” looks like

- Ads, AI Overviews, and known chat widgets get a blue chip in Visual mode, or disappear quietly in Clean mode.
- Text at **80% or more**, and at least about 50 words, is covered with **Blok thinks this is AI-written (NN% sure)**. The note says the score is the placeholder, not the proprietary model. **No, that's human** and **Yep, that's AI** sit under it.
- Triple-tap highlighted text, or an image, video, or audio element, marks it as AI and offers **Undo**.
- The first correction asks **Share to improve Blok** or **Keep it on my phone**. The two buttons are the same weight. Ignoring the page and leaving the setting off both keep the correction on the device.
- Password pages and a short list of mail, bank, and health hosts are never eligible to share.

## Checks without Xcode

From the repo root:

```bash
npm run blok:test
```

That compiles the starter list, checks bundle ids, runs the shared host, and opens the extension popup, the on-page overlay, and a browser preview of the container screens in headless Chrome. The shipping UI is the SwiftUI app. The preview uses the same `createHost` logic and the same enable steps.

Regenerate the bundled blocker list after editing `blok/rules.json`:

```bash
node blok/compile-rules.js
```

Regenerate icons or the Xcode project if you add a source file:

```bash
python3 safari/tools/render_icons.py
python3 safari/tools/generate_xcodeproj.py
```

The starter list is original. It is not EasyList or any other GPL or CC BY-SA list.

## A Mac build later

The iPhone app is the one to ship first. To add macOS Safari afterward:

1. In this project, use **File > New > Target** and add a macOS app plus a macOS Safari web extension and a macOS content blocker.
2. Point those targets at `Shared/`, `Extension/Resources`, `blok/blok-logic.js`, `blok/page-script.js`, and `blok/rules.json`. Do not fork the JavaScript.
3. Use distinct bundle ids, for example `com.erdos.blok.mac`, `com.erdos.blok.mac.Extension`, and `com.erdos.blok.mac.ContentBlocker`.
4. Put the Mac targets in `group.com.erdos.blok` if the developer portal allows it, or give them their own group and a small compile flag around `BlokAppGroup.identifier`.
5. Set the Mac deployment target to macOS 12 or newer so the same manifest v3 background page is available.

The manifest already asks for Safari 16 or newer. Background pages use `background.scripts`, which is the form Safari on iPhone and Mac both accept.
