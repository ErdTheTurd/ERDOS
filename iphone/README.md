# ERDOS for iPhone

A phone browser with **Blok** built in. The screen shows one section at a time (Browser, Blok, ERDAI, Notes, Arcade) and a bottom tab bar. It is not the desktop shell: there is no taskbar, Start menu, or desktop.

The first launch shows a short swipeable intro in Blok blue. Skip it any time. Play it again from **Settings** (the Settings button on the Blok tab). The last intro screen asks whether to share feedback to improve the models. That choice starts **off**. Skipping the intro leaves sharing off.

ERDAI stays off until its consent screen. Blok’s four detectors (text, image, video, audio) are proprietary models that learn from use. This build does not ship the weights. It ships the detector interface, a placeholder text score marked **Beta**, and an on-device learning store. Sharing corrections for retraining is off until you opt in, and nothing is uploaded yet.

## What you need

- A Mac with **Xcode 16** or newer (the iOS Simulator, or an iPhone)
- Apple Developer signing if you run on a device (a free personal team works for local installs; TestFlight needs the paid program)
- Node.js 20 or newer

This repo cannot run Xcode. The steps below are what to run on the Mac.

## Run it

From the repo root:

```bash
npm install
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Select the **App** scheme.
2. Choose an iPhone simulator, or your iPhone.
3. Select the App target → **Signing & Capabilities** → your Team.
4. Press Run.

`npx cap sync ios` copies `iphone/` into the iOS app and refreshes the native project. Run it again after you change the phone UI, the Blok page script, or `iphone/blok/rules.json`.

The browser view is a **WKWebView** inside the app (`ios/App/App/BlokBrowser.swift`). It is not Safari View Controller, so Blok can apply content rules and the page script. The first time you load a site, allow the app to use the network.

## Phone UI without Xcode

```bash
npm run iphone
```

Open `http://localhost:4174` at **390×844**. Sample search shows the Blok chips, the beta text overlay, and triple-tap marking. That preview cannot load arbitrary sites; on an iPhone those open in the WKWebView.

```bash
npm run iphone:test
```

## Blok in this build

- **Rules.** `iphone/blok/rules.json` is a small starter list written for Blok (ads, trackers, known AI widget hosts, and a few cosmetic hides). It is not EasyList or any other GPL / CC BY-SA list. On device, WebKit compiles it into separate `WKContentRuleList`s (ads, trackers, AI, cosmetic). Per-site **Ads** and **AI** switches add `unless-domain` exceptions and reload the page.
- **Page script.** `iphone/blok/page-script.js` hides Google AI Overviews (and similar headings), sends Google web search to `udm=14`, and hides known AI chat widgets behind a tap-to-show chip. Clean mode hides them with no chip.
- **Text rule (Beta).** The placeholder score hides a block at **80% or more** when it is at least about 50 words, unless you already said it was human. The overlay reads **Blok thinks this is AI-written (NN% sure)**. **No, that's human** and **Yep, that's AI** sit under it. The score is not from the real model.
- **Other detectors.** Image, video, and audio expose the same interface and return “not installed”. Manual flags still work.
- **Triple tap.** Triple-tap selected text, or triple-tap an image, video, or audio element, to mark it as AI. It is hidden behind the Blok overlay, stored as **Yep, that's AI**, and a toast offers **Undo**.
- **Learning.** Every correction is stored on the phone for continual on-device training (`appliedToModel` stays false until weights exist). The first correction asks whether to **Share to improve Blok** or **Keep it on my phone**. Shared items can be reviewed under Blok → Learning. Approving queues them on the device. This build has no upload.

## Layout

```
iphone/                 Phone HTML, CSS, and scripts (Capacitor webDir)
iphone/blok/            Page script and starter content rules
ios/App/App/Blok*.swift WKWebView, rules, placeholder detector, learning store
ios/App/App/ErdosNativePlugin.swift
```

The desktop app is unchanged: `npm start` still launches Electron.
