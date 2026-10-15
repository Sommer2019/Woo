// Reusable text entry: on-screen keyboard (pointer), the TV's physical keyboard, or the phone (⌨).
import { overlay } from './common.js';
import { textInput } from '../input.js';

const ROWS_KB = ['1234567890', 'QWERTZUIOP', 'ASDFGHJKLÖ', 'YXCVBNMÄÜ-', '.,:/?!@_'];
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// opts: { title, value, max, color, playerIndex, cls, onDone(text|null) }
export function openKeyboard(api, opts) {
  const max = opts.max || 12;
  let text = opts.value || '', shift = !text, el = null, done = false;
  const finish = (val) => {
    if (done) return;
    done = true;
    textInput.handler = null;
    window.removeEventListener('woo-text', onPhone);
    if (el) el.remove();
    opts.onDone(val);
  };
  const onPhone = (e) => { const t = e.detail.text.trim(); if (t) finish(t.slice(0, max)); };
  function draw() {
    if (el) el.remove();
    const key = (k) => `<div class="pill small kb-key" data-ui="key" data-k="${esc(k)}">${esc(shift ? k : k.toLowerCase())}</div>`;
    el = overlay(api, `
      <h2>✏️ ${esc(opts.title || 'Type something')}</h2>
      <div class="kb-text" style="border-color:${opts.color || '#35b6ff'}">${esc(text) || '<span class="dim">…</span>'}<span class="kb-caret">|</span></div>
      <div class="kb">${ROWS_KB.map((r) => `<div class="g-row kb-row">${[...r].map(key).join('')}</div>`).join('')}
        <div class="g-row kb-row">
          <div class="pill small kb-key ${shift ? 'sel' : ''}" data-ui="shift">⇧ Shift</div>
          <div class="pill small kb-key kb-space" data-ui="space">Space</div>
          <div class="pill small kb-key" data-ui="back">⌫</div>
        </div>
      </div>
      <p class="g-hint">Tip: you can also type on a keyboard, or on your phone — tap ⌨ on the remote.</p>
      <div class="g-row"><div class="pill" data-ui="cancel">Cancel</div><div class="pill" data-ui="ok">✔ OK</div></div>`, {
      key: (x) => { if (text.length < max) { text += shift ? x.dataset.k : x.dataset.k.toLowerCase(); shift = false; } draw(); },
      shift: () => { shift = !shift; draw(); },
      space: () => { if (text.length < max && text) text += ' '; draw(); },
      back: () => { text = text.slice(0, -1); draw(); },
      cancel: () => finish(null),
      ok: () => finish(text.trim() || null),
    }, opts.cls || '');
  }
  textInput.handler = (k) => {
    if (k === 'Enter') return finish(text.trim() || null);
    if (k === 'Escape') return finish(null);
    if (k === 'Backspace') text = text.slice(0, -1);
    else if (text.length < max) text += k;
    draw();
  };
  window.addEventListener('woo-text', onPhone);
  if (opts.playerIndex != null) api.askText(opts.playerIndex, opts.title || 'Text', text);
  draw();
  return { close: () => finish(null) };
}
