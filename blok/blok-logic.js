/* Shared Blok rules. ERDOS and the Blok Safari extension both load this
   file. Detector weights are not included. The text score is a placeholder. */
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

  function reviewShareRecords(records, id, approve) {
    return (records || []).map((record) => {
      if (!record || record.id !== id) return record;
      const sharing = Object.assign({}, record.sharing, approve
        ? { state: 'queued', eligible: true, reason: 'approved-on-device' }
        : { state: 'on-device', eligible: false, reason: 'kept-local' });
      return Object.assign({}, record, { sharing });
    });
  }

  function clearLearningRecords(records, scope) {
    if (scope !== 'shared') return [];
    return (records || []).map((record) => {
      if (!record || !record.sharing) return record;
      if (record.sharing.state !== 'queued' && record.sharing.state !== 'needs-review') return record;
      return Object.assign({}, record, {
        excerpt: '',
        sharing: { eligible: false, state: 'on-device', reason: 'deleted-share-copy' },
      });
    });
  }

  /* A short built-in skip list. Password fields are checked separately on the page. */
  const SENSITIVE_HOSTS = [
    'mail.google.com',
    'outlook.live.com',
    'outlook.office.com',
    'outlook.office365.com',
    'paypal.com',
    'wellsfargo.com',
    'chase.com',
    'bankofamerica.com',
    'myhealth.va.gov',
  ];

  function isSensitiveHost(hostname) {
    const host = String(hostname || '').replace(/^www\./i, '').toLowerCase();
    if (!host) return false;
    return SENSITIVE_HOSTS.some((item) => host === item || host.endsWith('.' + item));
  }

  function hostnameFrom(href) {
    const raw = String(href || '');
    try {
      return new URL(raw).hostname.replace(/^www\./i, '').toLowerCase();
    } catch (_) {
      return raw.replace(/^www\./i, '').split('/')[0].toLowerCase();
    }
  }

  function uniqueHosts(list) {
    const out = [];
    (list || []).forEach((item) => {
      const host = hostnameFrom(String(item || '').includes('://') ? item : ('https://' + item));
      if (!host || host.includes('/') || host.includes(' ') || host.includes('..')) return;
      if (!out.includes(host)) out.push(host);
    });
    return out;
  }

  function hostListed(list, host) {
    return (list || []).some((item) => host === item || (item && host.endsWith('.' + item)));
  }

  function compileBlockerList(ruleDoc, prefs) {
    const doc = ruleDoc || {};
    const settings = prefs || {};
    const adsOn = settings.ads !== false;
    const aiOn = settings.ai !== false;
    const adsHosts = uniqueHosts([].concat(settings.disabledAds || [], settings.pausedSites || []));
    const aiHosts = uniqueHosts([].concat(settings.disabledAi || [], settings.pausedSites || []));
    let rules = [];
    if (adsOn) {
      rules = rules.concat(applySiteExceptions(doc.ads || [], adsHosts));
      rules = rules.concat(applySiteExceptions(doc.trackers || [], adsHosts));
      rules = rules.concat(applySiteExceptions(doc.cosmetic || [], adsHosts));
    }
    if (aiOn) {
      rules = rules.concat(applySiteExceptions(doc.ai || [], aiHosts));
    }
    return rules;
  }

  const DEFAULT_SETTINGS = {
    ads: true,
    ai: true,
    visual: true,
    textDetection: true,
    shareFeedback: false,
    shareChoice: 'unset',
    reviewBeforeSending: true,
    disabledAds: [],
    disabledAi: [],
    pausedSites: [],
    onboardingDone: false,
    textThreshold: TEXT_THRESHOLD,
    minWords: MIN_WORDS,
  };

  function cloneSettings(input) {
    const base = Object.assign({}, DEFAULT_SETTINGS, input || {});
    base.disabledAds = uniqueHosts(base.disabledAds);
    base.disabledAi = uniqueHosts(base.disabledAi);
    base.pausedSites = uniqueHosts(base.pausedSites);
    base.shareFeedback = base.shareFeedback === true;
    base.reviewBeforeSending = base.reviewBeforeSending !== false;
    base.onboardingDone = base.onboardingDone === true;
    base.ads = base.ads !== false;
    base.ai = base.ai !== false;
    base.visual = base.visual !== false;
    base.textDetection = base.textDetection !== false;
    if (base.shareChoice !== 'share' && base.shareChoice !== 'local') base.shareChoice = 'unset';
    if (base.shareFeedback && base.shareChoice !== 'share') base.shareChoice = 'share';
    if (!base.shareFeedback && base.shareChoice === 'share') base.shareChoice = 'local';
    const threshold = Number(base.textThreshold);
    base.textThreshold = Number.isFinite(threshold) ? threshold : TEXT_THRESHOLD;
    const minWords = Number(base.minWords);
    base.minWords = Number.isFinite(minWords) ? minWords : MIN_WORDS;
    return base;
  }

  function emptyStats(day) {
    return {
      day: day,
      ads: 0,
      text: 0,
      image: 0,
      video: 0,
      audio: 0,
      overview: 0,
      widget: 0,
    };
  }

  function dayStamp(now) {
    const date = now ? new Date(now) : new Date();
    if (Number.isNaN(date.getTime())) return dayStamp();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + month + '-' + day;
  }

  function pageConfig(settings, href) {
    const host = hostnameFrom(href);
    const paused = hostListed(settings.pausedSites, host);
    const adsOff = paused || hostListed(settings.disabledAds, host);
    const aiOff = paused || hostListed(settings.disabledAi, host);
    return {
      ads: settings.ads !== false && !adsOff,
      ai: settings.ai !== false && !aiOff,
      visual: settings.visual !== false,
      textDetection: settings.textDetection !== false,
      textThreshold: settings.textThreshold,
      minWords: settings.minWords,
      disabledAds: uniqueHosts([].concat(settings.disabledAds, settings.pausedSites)),
      disabledAi: uniqueHosts([].concat(settings.disabledAi, settings.pausedSites)),
      pausedSites: settings.pausedSites.slice(),
      host: host,
    };
  }

  function setSiteLists(settings, host, adsOn, aiOn) {
    const name = hostnameFrom(host && String(host).includes('://') ? host : ('https://' + (host || '')));
    if (!name) return settings;
    const disabledAds = settings.disabledAds.filter((item) => item !== name);
    const disabledAi = settings.disabledAi.filter((item) => item !== name);
    const pausedSites = settings.pausedSites.filter((item) => item !== name);
    if (!adsOn) disabledAds.push(name);
    if (!aiOn) disabledAi.push(name);
    if (!adsOn && !aiOn) pausedSites.push(name);
    return cloneSettings(Object.assign({}, settings, { disabledAds, disabledAi, pausedSites }));
  }

  function knownSites(settings) {
    return uniqueHosts([].concat(settings.disabledAds, settings.disabledAi, settings.pausedSites));
  }

  function blockerPatch(patch) {
    return ['ads', 'ai', 'disabledAds', 'disabledAi', 'pausedSites'].some((key) => {
      return Object.prototype.hasOwnProperty.call(patch || {}, key);
    });
  }

  /* One host for the Safari extension, the container app, and headless tests.
     Swift keeps the JSON store and calls handle() through JavaScriptCore. */
  function createHost(initial) {
    const seed = initial || {};
    const rules = seed.rules || { ads: [], trackers: [], ai: [], cosmetic: [] };
    const appVersion = seed.appVersion || APP_VERSION;
    let settings = cloneSettings(seed.settings);
    let records = Array.isArray(seed.records) ? seed.records.slice() : [];
    let clock = seed.now || null;
    let stats = Object.assign(emptyStats(dayStamp(clock)), seed.stats || {});
    if (stats.day !== dayStamp(clock)) stats = emptyStats(dayStamp(clock));

    function snapshot() {
      return {
        settings: settings,
        stats: stats,
        records: records,
        queue: shareQueue(records),
        summary: adapterSummary(records),
        knownSites: knownSites(settings),
      };
    }

    function finish(response, flags) {
      const reload = !!(flags && flags.reloadBlocker);
      return {
        response: response || { ok: true },
        state: snapshot(),
        reloadBlocker: reload,
        blockerList: reload ? compileBlockerList(rules, settings) : null,
      };
    }

    function bump(kind) {
      const allowed = { ads: 1, text: 1, image: 1, video: 1, audio: 1, overview: 1, widget: 1 };
      const key = allowed[kind] ? kind : '';
      if (!key) return;
      const today = dayStamp(clock);
      if (stats.day !== today) stats = emptyStats(today);
      stats = Object.assign({}, stats);
      stats[key] = (stats[key] || 0) + 1;
    }

    function handle(message) {
      const msg = message || {};
      const type = msg.type;
      if (type === 'ready' || type === 'get-config') {
        return finish({ ok: true, config: pageConfig(settings, msg.href || '') });
      }
      if (type === 'get-popup') {
        const config = pageConfig(settings, msg.href || '');
        return finish({
          ok: true,
          host: config.host,
          adsOn: config.ads,
          aiOn: config.ai,
          adsGlobal: settings.ads,
          aiGlobal: settings.ai,
          visual: settings.visual,
          textDetection: settings.textDetection,
          shareFeedback: settings.shareFeedback === true,
          stats: stats,
        });
      }
      if (type === 'detect-text') {
        const text = String(msg.text || '');
        const result = mockDetectText(text);
        const hash = hashText(text);
        return finish({
          id: msg.id,
          confidence: result.confidence,
          hash: hash,
          remembered: verdictFor(records, hash),
          signals: result.signals,
          placeholder: true,
          beta: true,
          proprietary: true,
          model: null,
          label: 'placeholder',
        });
      }
      if (type === 'detect') {
        const stub = detectorStub(msg.kind || 'image');
        return finish(Object.assign({ ok: true, id: msg.id }, stub));
      }
      if (type === 'feedback') {
        const host = hostnameFrom(msg.href || '') || String(msg.domain || '').replace(/^www\./i, '');
        const sensitive = msg.sensitive === true || isSensitiveHost(host);
        const record = buildFeedbackRecord(Object.assign({}, msg, {
          domain: host,
          sensitive: sensitive,
        }), settings);
        record.appVersion = appVersion;
        records = upsertRecord(records, record);
        return finish({
          ok: true,
          id: record.id,
          askShare: settings.shareChoice === 'unset',
        });
      }
      if (type === 'undo') {
        records = undoRecord(records, msg.id);
        return finish({ ok: true, id: msg.id });
      }
      if (type === 'hid') {
        bump(msg.kind);
        return finish({ ok: true });
      }
      if (type === 'share-choice') {
        const share = msg.choice === 'share';
        settings = cloneSettings(Object.assign({}, settings, {
          shareFeedback: share,
          shareChoice: share ? 'share' : 'local',
        }));
        return finish({ ok: true, settings: settings });
      }
      if (type === 'set-settings') {
        const patch = msg.patch || {};
        settings = cloneSettings(Object.assign({}, settings, patch));
        if (Object.prototype.hasOwnProperty.call(patch, 'shareFeedback')) {
          settings = cloneSettings(Object.assign({}, settings, {
            shareChoice: settings.shareFeedback ? 'share' : 'local',
          }));
        }
        return finish({ ok: true, settings: settings }, { reloadBlocker: blockerPatch(patch) });
      }
      if (type === 'set-site') {
        settings = setSiteLists(settings, msg.host, msg.ads !== false, msg.ai !== false);
        return finish({ ok: true, settings: settings }, { reloadBlocker: true });
      }
      if (type === 'pause-site') {
        const paused = msg.paused !== false;
        settings = setSiteLists(settings, msg.host, !paused, !paused);
        return finish({ ok: true, settings: settings }, { reloadBlocker: true });
      }
      if (type === 'review-share') {
        records = reviewShareRecords(records, msg.id, msg.approve === true);
        return finish({ ok: true });
      }
      if (type === 'clear-learning') {
        records = clearLearningRecords(records, msg.scope === 'shared' ? 'shared' : 'all');
        return finish({ ok: true });
      }
      if (type === 'state') {
        return finish({ ok: true }, { reloadBlocker: msg.writeRules === true });
      }
      return finish({ ok: false, error: 'unknown-message' });
    }

    return {
      handle: handle,
      snapshot: snapshot,
    };
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
    reviewShareRecords,
    clearLearningRecords,
    isSensitiveHost,
    hostnameFrom,
    uniqueHosts,
    compileBlockerList,
    pageConfig,
    DEFAULT_SETTINGS,
    createHost,
  };
});
