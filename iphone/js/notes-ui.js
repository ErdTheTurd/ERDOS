/* Notes and Files share one tab. Storage goes through window.erdos. */
const NotesUI = (() => {
  let panel;
  let mode = 'notes';
  let editing = null;

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

  async function openEditor(path, fresh) {
    editing = path;
    let text = '';
    if (!fresh) {
      try { text = await window.erdos.readFile(path); } catch (_) { text = ''; }
    }
    panel.innerHTML = '';
    const area = el('textarea', { id: 'note-editor', 'aria-label': 'Note' });
    area.value = text;
    panel.append(el('div', { className: 'panel-pad editor' }, [
      el('div', { className: 'panel-head' }, [
        el('button', { className: 'ghost', type: 'button', text: 'Back', onClick: () => { editing = null; render(); } }),
        el('h1', { text: path.split('/').pop() }),
      ]),
      area,
      el('button', {
        className: 'primary',
        type: 'button',
        text: 'Save',
        onClick: async () => {
          await window.erdos.writeFile(path, area.value);
          window.ErdosPhone.toast('Saved on this phone');
        },
      }),
    ]));
  }

  async function render() {
    if (editing) return;
    panel.innerHTML = '';
    const root = el('div', { className: 'panel-pad' });
    const list = el('div', { id: 'notes-list' });
    const folder = mode === 'notes' ? 'Notes' : 'Files';
    root.append(
      el('div', { className: 'panel-head' }, [el('h1', { text: 'Notes' })]),
      el('div', { className: 'seg', role: 'tablist' }, [
        el('button', { type: 'button', text: 'Notes', 'aria-pressed': mode === 'notes' ? 'true' : 'false', onClick: () => { mode = 'notes'; render(); } }),
        el('button', { type: 'button', text: 'Files', 'aria-pressed': mode === 'files' ? 'true' : 'false', onClick: () => { mode = 'files'; render(); } }),
      ]),
      el('button', {
        className: 'primary',
        type: 'button',
        id: 'new-note',
        text: mode === 'notes' ? 'New note' : 'New file',
        onClick: async () => {
          const name = mode === 'notes' ? 'Note ' + new Date().toLocaleTimeString() : 'File ' + new Date().toLocaleTimeString();
          const path = folder + '/' + name.replace(/[\\/]/g, '-') + '.txt';
          await window.erdos.writeFile(path, '');
          openEditor(path, true);
        },
      })
    );
    if (mode === 'files') {
      root.append(el('button', {
        className: 'ghost',
        type: 'button',
        text: 'Open from Files',
        onClick: async () => {
          try {
            const picked = await window.erdos.pickOpenPath();
            const text = picked && (picked.text || picked.contents || '');
            const name = (picked && picked.name) || 'Imported.txt';
            const path = 'Files/' + name.replace(/[\\/]/g, '-');
            await window.erdos.writeFile(path, text);
            openEditor(path, false);
          } catch (err) {
            window.ErdosPhone.toast(err.message || 'The Files app is available on iPhone.');
          }
        },
      }));
    }
    try {
      const data = await window.erdos.listDir(folder);
      (data.entries || []).filter((entry) => !entry.isDirectory).forEach((entry) => {
        const path = folder + '/' + entry.name;
        list.append(el('button', {
          className: 'note-row',
          type: 'button',
          onClick: () => openEditor(path, false),
        }, [el('strong', { text: entry.name })]));
      });
    } catch (err) {
      list.append(el('p', { text: err.message || 'Could not read files.' }));
    }
    root.append(list);
    panel.append(root);
  }

  function mount(target) {
    panel = target;
    render();
  }

  return { mount, render };
})();
window.NotesUI = NotesUI;
