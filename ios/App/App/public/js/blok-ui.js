/* Full-screen Blok home: blue field, learning status, detector stubs. */
const BlokUI = (() => {
  let panel;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value != null) node.setAttribute(key, value);
    });
    [].concat(children || []).forEach((child) => {
      if (child != null) node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  async function refresh() {
    if (!panel) return;
    const settings = await window.erdos.blok.settings();
    const learning = await window.erdos.blok.learning();
    const summary = learning.summary || window.BlokLogic.adapterSummary(learning.records || []);
    const queue = learning.queue || [];
    panel.innerHTML = '';
    const visual = settings.visual !== false;
    const textOn = settings.textDetection !== false;
    const root = el('div', { className: 'blok-home' });
    const textRow = el('button', { className: 'switch-row', type: 'button', id: 'text-detection-toggle' });
    textRow.append(
      el('span', { className: 'switch' + (textOn ? ' on' : '') }),
      el('span', {}, [
        el('strong', { text: 'Text detection' }),
        document.createElement('br'),
        el('small', { text: 'Beta · placeholder detector · hides at 80% or more' }),
      ])
    );
    textRow.addEventListener('click', async () => {
      await window.erdos.blok.setSettings({ textDetection: !textOn });
      refresh();
    });
    const shareRow = el('button', { className: 'switch-row', type: 'button', id: 'share-toggle' });
    shareRow.append(
      el('span', { className: 'switch' + (settings.shareFeedback ? ' on' : '') }),
      el('span', {}, [
        el('strong', { text: 'Share feedback' }),
        document.createElement('br'),
        el('small', { text: 'Off by default. Opt in to queue corrections for retraining.' }),
      ])
    );
    shareRow.addEventListener('click', async () => {
      await window.erdos.blok.setShareChoice(settings.shareFeedback ? 'local' : 'share');
      refresh();
    });
    const reviewRow = el('button', { className: 'switch-row', type: 'button' });
    reviewRow.append(
      el('span', { className: 'switch' + (settings.reviewBeforeSending !== false ? ' on' : '') }),
      el('span', {}, [
        el('strong', { text: 'Review before sending' }),
        document.createElement('br'),
        el('small', { text: 'Approved items stay on this phone. Nothing is uploaded in this build.' }),
      ])
    );
    reviewRow.addEventListener('click', async () => {
      await window.erdos.blok.setSettings({ reviewBeforeSending: settings.reviewBeforeSending === false });
      refresh();
    });
    const queueBox = el('div', { id: 'share-queue' });
    queue.forEach((item) => {
      const row = el('div', { className: 'queue-item' });
      row.append(el('p', { text: (item.kind || 'item') + ' · ' + item.verdict + ' · ' + (item.sharing && item.sharing.state) }));
      if (item.sharing && item.sharing.state === 'needs-review') {
        row.append(el('div', { className: 'pair' }, [
          el('button', { className: 'primary', type: 'button', text: 'Approve', onClick: async () => { await window.erdos.blok.reviewShare(item.id, true); refresh(); } }),
          el('button', { className: 'ghost', type: 'button', text: 'Keep local', onClick: async () => { await window.erdos.blok.reviewShare(item.id, false); refresh(); } }),
        ]));
      }
      queueBox.append(row);
    });
    if (!queue.length) queueBox.append(el('p', { className: 'fine', text: 'No corrections are waiting to be shared.' }));

    root.append(
      el('div', { className: 'blok-top' }, [
        el('div', { className: 'wordmark' }, [
          el('img', { src: 'assets/blok-mark.svg', alt: '' }),
          el('span', { text: 'blok' }),
        ]),
        el('button', {
          className: 'settings-link',
          type: 'button',
          id: 'open-settings',
          text: 'Settings',
          onClick: () => window.Onboarding.openSettings(),
        }),
      ]),
      el('h1', { text: 'Ads and AI, on this phone.' }),
      el('p', { className: 'fine', text: 'Four proprietary detectors learn from the corrections you make here. Their weights are not in this build, so each answer is stored for on-device training and, only if you opt in, a later shared retrain.' }),
      el('div', { className: 'card' }, [
        el('span', { className: 'pill-tag beta', text: 'Beta' }),
        el('h2', { text: 'Text', style: 'margin:8px 0;font-size:28px;letter-spacing:-.04em;' }),
        textRow,
        el('p', { className: 'fine', text: (summary.text ? summary.text.examples : 0) + ' corrections saved · model not installed' }),
      ]),
      el('div', { className: 'card' }, [
        el('strong', { text: 'Look' }),
        el('div', { className: 'mode-row' }, [
          el('button', { type: 'button', text: 'Visual', 'aria-pressed': visual ? 'true' : 'false', onClick: async () => { await window.erdos.blok.setSettings({ visual: true }); refresh(); } }),
          el('button', { type: 'button', text: 'Clean', 'aria-pressed': visual ? 'false' : 'true', onClick: async () => { await window.erdos.blok.setSettings({ visual: false }); refresh(); } }),
        ]),
      ]),
      el('div', { className: 'card' }, [
        el('strong', { text: 'Detectors' }),
        detectorLine('Image', summary.image),
        detectorLine('Video', summary.video),
        detectorLine('Audio', summary.audio),
        el('button', {
          className: 'ghost',
          type: 'button',
          id: 'try-placeholder',
          text: 'Try the text placeholder',
          onClick: async () => {
            const sample = "As an AI language model, it is important to note that in today's rapidly changing web we should delve into a tapestry of sources before publishing a long answer that is clearly over fifty words so the beta rule can run.";
            const result = await window.erdos.blok.detectText(sample);
            const hide = window.BlokLogic.shouldHideText({ confidence: result.confidence, words: window.BlokLogic.wordCount(sample) });
            window.ErdosPhone.toast('Placeholder ' + Math.round(result.confidence * 100) + '% · ' + (hide ? 'would hide' : 'would show') + ' · Beta');
          },
        }),
      ]),
      el('div', { className: 'card' }, [
        el('strong', { text: 'Learning' }),
        el('p', { className: 'fine', text: '“No, that’s human”, “Yep, that’s AI”, and a triple tap all update the on-device store. Sharing is a separate choice.' }),
        shareRow,
        reviewRow,
        queueBox,
        el('button', { className: 'ghost', type: 'button', text: 'Delete what I’ve queued', onClick: async () => { await window.erdos.blok.clearLearning('shared'); refresh(); } }),
        el('button', { className: 'ghost', type: 'button', text: 'Delete on-device learning', onClick: async () => { await window.erdos.blok.clearLearning('all'); refresh(); } }),
      ])
    );
    panel.append(root);
  }

  function detectorLine(label, info) {
    const examples = info && info.examples ? info.examples : 0;
    return el('div', { className: 'detector' }, [
      el('div', {}, [el('strong', { text: label }), el('small', { text: 'Proprietary · not installed' })]),
      el('strong', { text: String(examples) }),
    ]);
  }

  function mount(target) {
    panel = target;
    refresh();
  }

  return { mount, refresh };
})();
window.BlokUI = BlokUI;
