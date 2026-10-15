// Shared helpers for games.
import { drawMe } from '../me.js';

// A canvas with a fixed virtual resolution, letterboxed into the game root.
export function makeCanvas(api, W = 1280, H = 720) {
  const canvas = document.createElement('canvas');
  canvas.className = 'g-full';
  api.root.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const view = { canvas, ctx, W, H, scale: 1, ox: 0, oy: 0 };
  view.resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = api.root.clientWidth, ch = api.root.clientHeight;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    view.scale = Math.min(cw / W, ch / H) * dpr;
    view.ox = (canvas.width - W * view.scale) / 2;
    view.oy = (canvas.height - H * view.scale) / 2;
  };
  view.begin = (bg = '#000') => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  };
  view.end = () => ctx.restore();
  // cursor (normalized screen coords) -> virtual coords
  view.toVirtual = (c) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = c.x * api.root.clientWidth * dpr, py = c.y * api.root.clientHeight * dpr;
    return { x: (px - view.ox) / view.scale, y: (py - view.oy) / view.scale };
  };
  view.resize();
  return view;
}

// DOM overlay with pointer-clickable [data-ui] elements.
export function overlay(api, html, handlers = {}, cls = '') {
  const el = document.createElement('div');
  el.className = 'g-overlay ' + cls;
  el.innerHTML = html;
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-ui]');
    if (t && handlers[t.dataset.ui]) { api.audio.play('click'); handlers[t.dataset.ui](t, api.clicker()); }
  });
  api.root.appendChild(el);
  api.showCursors(true);
  api.setRemoteMode('pointer');
  el.close = () => { el.remove(); };
  return el;
}

export function meCanvas(me, size = 120, color) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  drawMe(c.getContext('2d'), me, size / 2, size * 0.42, size * 0.26, { color });
  return c.toDataURL();
}

export function ordinal(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }

// Big floating text helper for canvas games
export function bigText(ctx, text, x, y, size, fill = '#fff', stroke = '#000') {
  ctx.font = `800 ${size}px "M PLUS Rounded 1c", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
  ctx.textBaseline = 'alphabetic';
}

// Standard results overlay. rows: [{name, color, score, me}] already sorted.
export function resultsOverlay(api, title, rows, { again, quit, scoreLabel = 'Points' } = {}) {
  const medals = ['🥇', '🥈', '🥉', ''];
  const html = `<h1>${title}</h1>
    <table class="score"><tr><th></th><th></th><th>Player</th><th>${scoreLabel}</th></tr>
    ${rows.map((r, i) => `<tr><td>${medals[i] || ''}</td><td>${r.me ? `<img src="${meCanvas(r.me, 64, r.color)}" style="width:6vh;height:6vh">` : ''}</td><td style="color:${r.color};font-weight:800">${r.name}</td><td><b>${r.score}</b></td></tr>`).join('')}</table>
    <div class="g-row"><div class="pill" data-ui="again">Play Again</div><div class="pill" data-ui="quit">Woo Menu</div></div>`;
  api.audio.play('win');
  const o = overlay(api, html, { again: () => { o.close(); if (again) again(); }, quit: () => api.exit() });
  return o;
}

// Soft dark edges — makes flat 2D scenes look a lot less flat.
export function vignette(ctx, W, H, a = 0.3) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
