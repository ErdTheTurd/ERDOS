/* ERDAI stays off until the consent screen is accepted.
   Puter.js is not loaded before that. */
const ErdAIPhone = (() => {
  const KEY = 'erdos-erdai-consent';
  let panel;
  let history = [];

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

  function consent() {
    return localStorage.getItem(KEY) === 'on';
  }

  function setConsent(on) {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  }

  function loadPuter() {
    if (window.puter && window.puter.ai && window.puter.ai.chat) return Promise.resolve(true);
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.async = true;
      script.onload = () => resolve(!!(window.puter && window.puter.ai));
      script.onerror = () => resolve(false);
      document.head.append(script);
    });
  }

  function mount(target) {
    panel = target;
    render();
  }

  function render() {
    panel.innerHTML = '';
    if (!consent()) {
      panel.append(el('div', { className: 'panel-pad erdai-consent', id: 'erdai-consent' }, [
        el('h1', { text: 'ERDAI is optional' }),
        el('p', { text: 'ERDAI can chat with you, or summarize a page when you ask. It stays off until you turn it on. Blok does not use it.' }),
        el('div', { className: 'card' }, [
          el('p', { text: 'What is sent: the message you type. Page text is included only if you tap Summarize.' }),
          el('p', { text: 'Where it goes: Puter (puter.com), the AI provider this app uses. ERDOS does not add an account of its own.' }),
          el('p', { text: 'You can turn ERDAI off later and delete the chat on this phone.' }),
        ]),
        el('div', { className: 'pair' }, [
          el('button', { className: 'primary', type: 'button', id: 'erdai-on', text: 'Turn on ERDAI', onClick: () => { setConsent(true); render(); } }),
          el('button', { className: 'ghost', type: 'button', id: 'erdai-off', text: 'Not now', onClick: () => window.ErdosPhone.show('browser') }),
        ]),
      ]));
      return;
    }
    const log = el('div', { className: 'erdai-log', id: 'erdai-log' });
    history.forEach((item) => log.append(el('div', { className: 'bubble ' + (item.role === 'user' ? 'user' : 'bot'), text: item.content })));
    const input = el('input', { type: 'text', placeholder: 'Message ERDAI', 'aria-label': 'Message ERDAI' });
    const send = el('button', { className: 'primary', type: 'button', text: 'Send' });
    send.style.width = 'auto';
    const status = el('p', { className: 'fine', id: 'erdai-status', text: 'Optional. Puter is contacted only when you send.' });
    async function submit() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      history.push({ role: 'user', content: text });
      render();
      const box = document.getElementById('erdai-status');
      if (box) box.textContent = 'Thinking…';
      try {
        const ok = await loadPuter();
        if (!ok || !window.puter?.ai?.chat) throw new Error('Puter is unavailable. Check the network.');
        const result = await window.puter.ai.chat([
          { role: 'system', content: 'You are ERDAI inside the ERDOS iPhone app. Be concise. Do not claim to be part of Blok.' },
          ...history.slice(-12),
        ], { model: 'gpt-4o-mini' });
        const reply = typeof result === 'string' ? result : (result?.message?.content || result?.text || '…');
        history.push({ role: 'assistant', content: String(reply) });
      } catch (err) {
        history.push({ role: 'assistant', content: err.message || 'ERDAI could not reply.' });
      }
      render();
    }
    send.addEventListener('click', submit);
    panel.append(el('div', { className: 'panel-pad' }, [
      el('div', { className: 'panel-head' }, [
        el('h1', { text: 'ERDAI' }),
        el('button', {
          className: 'ghost',
          type: 'button',
          text: 'Turn off',
          onClick: () => { setConsent(false); history = []; render(); },
        }),
      ]),
      status,
      log,
      el('div', { className: 'compose' }, [input, send]),
      el('button', { className: 'text-btn', type: 'button', text: 'Delete chat', onClick: () => { history = []; render(); } }),
    ]));
  }

  return { mount, render };
})();
window.ErdAIPhone = ErdAIPhone;
