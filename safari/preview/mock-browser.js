/* Headless stand-in for SafariWebExtensionHandler. The page script talks to
   browser.runtime, and this mock answers with the shared Blok host. */
(function () {
  if (!window.BlokLogic || window.browser) return;
  const host = window.BlokLogic.createHost({
    rules: window.__BLOK_RULES__ || { ads: [], trackers: [], ai: [], cosmetic: [] },
    appVersion: '1.0.0',
  });
  window.__blokTestHost = host;
  window.browser = {
    runtime: {
      id: 'blok-preview',
      lastError: null,
      sendMessage: function (message, callback) {
        const result = host.handle(message || {});
        const response = result.response;
        if (typeof callback === 'function') callback(response);
        return Promise.resolve(response);
      },
    },
  };
})();
