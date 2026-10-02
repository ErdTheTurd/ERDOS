/* Blok rules that do not touch the page.
   The iPhone shell, the injected page script, tests, and the Swift
   placeholder all follow this file. Detector weights are not included. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BlokLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function blokLogicFactory() {
  const TEXT_THRESHOLD = 0.8;
  const MIN_WORDS = 50;
  const APP_VERSION = '1.7.0';

  /* Placeholder phrases only. A proprietary model will replace this score. */
  const PHRASES = [
    'as an ai language model',
    'as a language model',
    "it's important to note",
    'it is important to note',
    "in today's rapidly",
    'in today’s rapidly',
    'delve into',
    'tapestry of',
  ];

  const DETECTORS = {
    text: {
      id: 'text',
      modality: 'text',
      beta: true,
      proprietary: true,
      placeholder: true,
      learns: 'on-device-continual',
      threshold: TEXT_THRESHOLD,
      minUnits: MIN_WORDS,
      unit: 'words',
    },
    image: {
      id: 'image',
      modality: 'image',
      beta: false,
      proprietary: true,
      placeholder: true,
      learns: 'on-device-continual',
      threshold: TEXT_THRESHOLD,
      minUnits: null,
      unit: 'image',
    },
    video: {
      id: 'video',
      modality: 'video',
      beta: false,
      proprietary: true,
      placeholder: true,
      learns: 'on-device-continual',
      threshold: TEXT_THRESHOLD,
      minUnits: null,
      unit: 'frames',
    },
    audio: {
      id: 'audio',
      modality: 'audio',
      beta: false,
      proprietary: true,
      placeholder: true,
      learns: 'on-device-continual',
      threshold: TEXT_THRESHOLD,
      minUnits: null,
      unit: 'clip',
    },
  };

  function wordCount(text) {
    return (String(text || '').trim().match(/\S+/g) || []).length;
  }

  /* 32-bit djb2. Swift BlokDetector.hashText must stay in step. */
  function hashText(text) {
    let hash = 5381;
    const value = String(text || '');
    for (let i = 0; i < value.length; i += 1) {
      hash = Math.imul(hash, 33) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  function mockDetectText(text) {
    const lower = String(text || '').toLowerCase();
    const signals = PHRASES.filter((phrase) => lower.includes(phrase));
    let confidence = 0.42 + signals.length * 0.18;
    if (confidence > 0.97) confidence = 0.97;
    confidence = Math.round(confidence * 100) / 100;
    return {
      kind: 'text',
      confidence,
      placeholder: true,
      beta: true,
      proprietary: true,
      model: null,
      label: 'placeholder',
      signals,
    };
  }

  function detectorStub(kind) {
    const spec = DETECTORS[kind] || {
      id: kind,
      proprietary: true,
      placeholder: true,
      beta: false,
    };
    return {
      kind: spec.id,
      proprietary: true,
      placeholder: true,
      beta: !!spec.beta,
      model: null,
      status: 'no-model',
      learns: 'on-device-continual',
      confidence: null,
      message: spec.id === 'text'
        ? 'Text detection is Beta. This build uses a placeholder, not the proprietary model.'
        : 'The proprietary ' + spec.id + ' model is not in this build. Corrections are saved on this phone for when it is installed.',
    };
  }

  function shouldHideText(input) {
    const opts = input || {};
    if (opts.remembered === 'human') return false;
    if (opts.manual) return true;
    const words = Number(opts.words);
    const minWords = opts.minWords == null ? MIN_WORDS : opts.minWords;
    if (Number.isFinite(words) && words < minWords) return false;
    const score = Number(opts.confidence);
    const threshold = opts.threshold == null ? TEXT_THRESHOLD : opts.threshold;
    if (!Number.isFinite(score)) return false;
    return score >= threshold;
  }

  function googleWebResultsUrl(href) {
    let url;
    try {
      url = new URL(href);
    } catch (_) {
      return null;
    }
    if (!/(^|\.)google\./i.test(url.hostname)) return null;
    if (!/^\/search(\/|$)/.test(url.pathname)) return null;
    const tbm = url.searchParams.get('tbm');
    if (tbm && tbm !== 'web') return null;
    if (url.searchParams.get('udm') !== '14') url.searchParams.set('udm', '14');
    return url.toString();
  }

  function domainPatterns(hostname) {
    const host = String(hostname || '').replace(/^www\./i, '').toLowerCase();
    if (!host || host.includes('/') || host.includes(' ')) return [];
    return [host, '*.' + host];
  }

  function applySiteExceptions(rules, hostnames) {
    const domains = [];
    (hostnames || []).forEach((host) => {
      domainPatterns(host).forEach((pattern) => {
        if (!domains.includes(pattern)) domains.push(pattern);
      });
    });
    return (rules || []).map((rule) => {
      const trigger = Object.assign({}, rule.trigger);
      if (domains.length) trigger['unless-domain'] = domains.slice();
      return {
        trigger,
        action: Object.assign({}, rule.action),
      };
    });
  }

  function scrubText(text) {
    return String(text || '')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .replace(/\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g, '[phone]');
  }

  function resolveTripleTap(info) {
    const event = info || {};
    if (event.inBlokChrome || event.editable) return null;
    const media = event.mediaKind;
    if (media === 'image' || media === 'video' || media === 'audio') {
      return { kind: media, manual: true, source: 'triple-tap' };
    }
    const selected = String(event.selectionText || '').trim();
    if (!selected) return null;
    return { kind: 'text', manual: true, source: 'triple-tap', text: selected };
  }

  function buildFeedbackRecord(input, prefs) {
    const item = input || {};
    const settings = prefs || {};
    const now = item.at || new Date().toISOString();
    const kind = item.kind || 'text';
    const manual = item.source === 'triple-tap' || item.manual === true;
    const shareOn = settings.shareFeedback === true;
    const sensitive = item.sensitive === true;
    const eligible = shareOn && !sensitive;
    let shareState = 'on-device';
    let shareReason = 'share-off';
    if (sensitive) shareReason = 'sensitive-page';
    if (eligible) {
      shareState = settings.reviewBeforeSending === false ? 'queued' : 'needs-review';
      shareReason = 'opt-in';
    }
    const rawText = kind === 'text' ? String(item.text || '') : '';
    const hash = item.hash || hashText(rawText || (kind + '|' + (item.mediaKey || '')));
    return {
      version: 1,
      id: item.id || ('fb_' + hashText(kind + '|' + hash + '|' + now + '|' + Math.random())),
      hash,
      kind,
      verdict: item.verdict === 'human' ? 'human' : 'ai',
      score: manual || item.score == null || item.score === '' ? null : Number(item.score),
      confidenceSource: manual ? 'manual' : (item.placeholder === false ? 'model' : 'placeholder'),
      source: item.source || (manual ? 'triple-tap' : 'buttons'),
      signals: Array.isArray(item.signals) ? item.signals.slice() : (manual ? ['manual'] : []),
      domain: String(item.domain || '').replace(/^www\./i, ''),
      at: now,
      sensitive,
      excerpt: kind === 'text' ? scrubText(rawText).slice(0, 4000) : '',
      mediaKey: kind === 'text' ? '' : String(item.mediaKey || ''),
      appVersion: APP_VERSION,
      learning: {
        personal: true,
        appliedToModel: false,
        reason: 'proprietary-weights-not-in-this-build',
        modelId: kind,
      },
      sharing: {
        eligible,
        state: shareState,
        reason: shareReason,
      },
      undone: false,
    };
  }

  function verdictFor(records, hash) {
    const list = (records || []).filter((record) => record && record.hash === hash && !record.undone);
    if (!list.length) return null;
    return list[list.length - 1].verdict;
  }

  function upsertRecord(records, record) {
    const next = (records || []).filter((item) => item && item.id !== record.id);
    next.push(record);
    return next.slice(-1000);
  }

  function undoRecord(records, id) {
    return (records || []).map((record) => {
      if (!record || record.id !== id) return record;
      return Object.assign({}, record, {
        undone: true,
        sharing: Object.assign({}, record.sharing, { eligible: false, state: 'on-device', reason: 'undone' }),
      });
    });
  }

  function adapterSummary(records) {
    const summary = {};
    Object.keys(DETECTORS).forEach((kind) => {
      const examples = (records || []).filter((record) => {
        return record && record.kind === kind && record.learning && record.learning.personal && !record.undone;
      });
      summary[kind] = {
        examples: examples.length,
        appliedToModel: examples.filter((record) => record.learning.appliedToModel).length,
        proprietary: true,
        placeholder: true,
        beta: !!DETECTORS[kind].beta,
        learns: 'on-device-continual',
      };
    });
    return summary;
  }

  function shareQueue(records) {
    return (records || []).filter((record) => {
      return record && !record.undone && record.sharing && (record.sharing.state === 'needs-review' || record.sharing.state === 'queued');
    });
  }

  return {
    APP_VERSION,
    PHRASES,
    DETECTORS,
    TEXT_THRESHOLD,
    MIN_WORDS,
    wordCount,
    hashText,
    mockDetectText,
    detectorStub,
    shouldHideText,
    googleWebResultsUrl,
    domainPatterns,
    applySiteExceptions,
    scrubText,
    resolveTripleTap,
    buildFeedbackRecord,
    verdictFor,
    upsertRecord,
    undoRecord,
    adapterSummary,
    shareQueue,
  };
});
