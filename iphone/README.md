# ERDOS for iPhone

A phone browser with **Blok** built in. The screen shows one section at a time (Browser, Blok, ERDAI, Notes, Arcade) and a bottom tab bar. It is not the desktop shell: there is no taskbar, Start menu, or desktop.

The first launch shows a short swipeable intro in Blok blue. Skip it any time. Play it again from **Settings** (the Settings button on the Blok tab). The last intro screen asks whether to share feedback to improve the models. That choice starts **off**. Skipping the intro leaves sharing off.

ERDAI stays off until its consent screen. Blok’s four detectors (text, image, video, audio) are proprietary models that learn from use. This build does not ship the weights. It ships the detector interface, a placeholder text score marked **Beta**, and an on-device learning store. Sharing corrections for retraining is off until you opt in, and nothing is uploaded yet.

## Phone UI

```bash
npm run iphone
```

Open `http://localhost:4174` at **390×844**. Sample search shows the Blok chips, the beta text overlay, and triple-tap marking. That preview cannot load arbitrary sites.

```bash
npm run iphone:test
```

## Blok in this build

- **Rules.** `iphone/blok/rules.json` is a small starter list written for Blok (ads, trackers, known AI widget hosts, and a few cosmetic hides). It is not EasyList or any other GPL / CC BY-SA list. Per-site **Ads** and **AI** switches add `unless-domain` exceptions.
- **Page script.** `iphone/blok/page-script.js` hides Google AI Overviews (and similar headings), sends Google web search to `udm=14`, and hides known AI chat widgets behind a tap-to-show chip. Clean mode hides them with no chip.
- **Text rule (Beta).** The placeholder score hides a block at **80% or more** when it is at least about 50 words, unless you already said it was human. The overlay reads **Blok thinks this is AI-written (NN% sure)**. **No, that's human** and **Yep, that's AI** sit under it. The score is not from the real model.
- **Other detectors.** Image, video, and audio expose the same interface and return “not installed”. Manual flags still work.
- **Triple tap.** Triple-tap selected text, or triple-tap an image, video, or audio element, to mark it as AI. It is hidden behind the Blok overlay, stored as **Yep, that's AI**, and a toast offers **Undo**.
- **Learning.** Every correction is stored on the phone for continual on-device training (`appliedToModel` stays false until weights exist). The first correction asks whether to **Share to improve Blok** or **Keep it on my phone**. Shared items can be reviewed under Blok → Learning. Approving queues them on the device. This build has no upload.

## Layout

```
iphone/                 Phone HTML, CSS, and scripts
iphone/blok/            Page script and starter content rules
```

The desktop app is unchanged: `npm start` still launches Electron.
