// Woo Me Channel — edit the four player avatars.
import { overlay, meCanvas } from './common.js';
import { getMe, setMe, randomMe, randomName, SKINS, HAIRS, SHIRTS, drawMe } from '../me.js';

export function create(api) {
  let el = null;
  let editing = -1, draft = null;
  api.music('fish');

  function list() {
    if (el) el.remove();
    el = overlay(api, `
      <h1>Woo Me Channel</h1>
      <p>Pick a Me to edit. Each player number uses their own Me in every game.</p>
      <div class="g-row">${[0, 1, 2, 3].map((i) => `
        <div class="g-card" data-ui="edit" data-i="${i}" style="color:${api.COLORS[i]}">
          <img src="${meCanvas(getMe(i), 160, api.COLORS[i])}" style="width:16vh;height:16vh">
          <div>${escapeHtml(getMe(i).name)}</div><div style="font-size:2vh">Player ${i + 1}</div>
        </div>`).join('')}</div>
      <div class="pill" data-ui="quit">Woo Menu</div>`, {
      edit: (t) => edit(+t.dataset.i),
      quit: () => api.exit(),
    });
  }

  const swatches = (key, arr) => arr.map((c, i) => `<div class="pill small ${draft[key] === i ? 'sel' : ''}" data-ui="set" data-k="${key}" data-v="${i}" style="min-width:5vh;background:${c};${draft[key] === i ? 'box-shadow:0 0 0 4px #35b6ff' : ''}">&nbsp;</div>`).join('');
  const choices = (key, labels) => labels.map((l, i) => `<div class="pill small ${draft[key] === i ? 'sel' : ''}" data-ui="set" data-k="${key}" data-v="${i}">${l}</div>`).join('');

  function edit(i) {
    editing = i;
    draft = Object.assign({}, getMe(i));
    render();
  }
  function render() {
    if (el) el.remove();
    el = overlay(api, `
      <div style="display:flex;gap:3vw;align-items:center">
        <div style="text-align:center">
          <canvas id="me-preview" width="420" height="420" style="width:38vh;height:38vh;background:#fff;border-radius:30px;border:3px solid #d5dae0"></canvas>
          <h2>${escapeHtml(draft.name)}</h2>
          <div class="g-row"><div class="pill small" data-ui="name">🎲 New name</div><div class="pill small" data-ui="random">🎲 Random Me</div></div>
        </div>
        <div style="text-align:left;font-size:2.4vh">
          <div class="panel-row"><b style="width:9vw">Skin</b>${swatches('skin', SKINS)}</div>
          <div class="panel-row"><b style="width:9vw">Hair</b>${swatches('hair', HAIRS)}</div>
          <div class="panel-row"><b style="width:9vw">Style</b>${choices('hairStyle', ['Short', 'Long', 'Spiky', 'Bun'])}</div>
          <div class="panel-row"><b style="width:9vw">Eyes</b>${choices('eyes', ['Dots', 'Happy', 'Big'])}</div>
          <div class="panel-row"><b style="width:9vw">Mouth</b>${choices('mouth', ['Smile', 'Meh', 'Oh!'])}</div>
          <div class="panel-row"><b style="width:9vw">Shirt</b>${swatches('shirt', SHIRTS)}</div>
          <div class="panel-row"><b style="width:9vw">Glasses</b><div class="pill small ${draft.glasses ? 'sel' : ''}" data-ui="glasses">${draft.glasses ? 'Yes' : 'No'}</div></div>
        </div>
      </div>
      <div class="g-row"><div class="pill" data-ui="cancel">Cancel</div><div class="pill" data-ui="save">Save Me</div></div>`, {
      set: (t) => { draft[t.dataset.k] = +t.dataset.v; render(); },
      glasses: () => { draft.glasses = !draft.glasses; render(); },
      name: () => { draft.name = randomName(); render(); },
      random: () => { draft = randomMe(); render(); },
      cancel: () => list(),
      save: () => { setMe(editing, draft); api.toast(`Saved ${draft.name}!`); list(); },
    });
    const c = el.querySelector('#me-preview');
    drawMe(c.getContext('2d'), draft, 210, 180, 110, { color: api.COLORS[editing] });
  }

  list();
  return {
    update() {},
    destroy() { if (el) el.remove(); },
  };
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
