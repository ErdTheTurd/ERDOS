/* Forwards extension messages to the Blok app. Safari calls
   SafariWebExtensionHandler; there is no separate native host name. */
(function () {
  const runtime = typeof browser !== 'undefined' ? browser : chrome;

  function sendNative(payload) {
    return new Promise((resolve, reject) => {
      let settled = false;
      function finish(error, value) {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(value);
      }
      let maybe;
      try {
        maybe = runtime.runtime.sendNativeMessage(payload, (response) => {
          const err = runtime.runtime.lastError;
          if (err) finish(new Error(err.message || 'native messaging failed'));
          else finish(null, response);
        });
      } catch (error) {
        finish(error);
        return;
      }
      if (maybe && typeof maybe.then === 'function') {
        maybe.then((response) => finish(null, response), (error) => finish(error));
      }
    });
  }

  runtime.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const payload = Object.assign({}, message || {});
    if (!payload.href && sender && sender.url) payload.href = sender.url;
    sendNative(payload).then((response) => {
      sendResponse(response || { ok: false });
    }, (error) => {
      sendResponse({ ok: false, error: String(error && error.message ? error.message : error) });
    });
    return true;
  });
})();
