// Woo Darts — aim with the pointer (it wobbles!), flick the remote (or press A) to throw. 5 rounds × 3 darts.
import { makeCanvas, overlay, bigText, resultsOverlay, vignette } from './common.js';

const W = 1280, H = 720, CX = 640, CY = 370, R = 270, ROUNDS = 5;
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

function scoreAt(x, y) {
  const dx = x - CX, dy = y - CY, d = Math.hypot(dx, dy) / R;
  if (d > 1) return { pts: 0, label: 'Miss' };
  if (d < 0.04) return { pts: 50, label: 'BULLSEYE!' };
  if (d < 0.09) return { pts: 25, label: 'Outer bull' };
  let a = Math.atan2(dx, -dy) * 180 / Math.PI; if (a < 0) a += 360;
  const seg = ORDER[Math.floor(((a + 9) % 360) / 18)];
  if (d > 0.93) return { pts: seg * 2, label: `Double ${seg}` };
  if (d > 0.55 && d < 0.61) return { pts: seg * 3, label: `Treble ${seg}!` };
  return { pts: seg, label: String(seg) };
}

export function create(api) {
  const view = makeCanvas(api, W, H);
  const { ctx } = view;
  let ps = [], cur = 0, round = 0, dartN = 0, darts = [], flying = null, msg = '', msgT = 0, state = 'title', clock = 0, ui = null, wait = 0;
  const board = document.createElement('canvas'); board.width = W; board.height = H;
  drawBoard(board.getContext('2d'));

  function start() {
    ps = api.active().map((p) => ({ p, total: 0, rounds: [] }));
    cur = 0; round = 0; dartN = 0; darts = []; state = 'aim';
    api.showCursors(false); api.setRemoteMode('pointer'); api.music('sports');
  }
  function aimPoint(pl, t) {
    const c = view.toVirtual(pl.p.cursor);
    const wob = 9 + 5 * Math.sin(t * 0.7);
    return { x: c.x + Math.sin(t * 2.3) * wob + Math.sin(t * 5.1) * 3, y: c.y + Math.cos(t * 1.9) * wob };
  }
  function throwDart(power) {
    const pl = ps[cur];
    const a = aimPoint(pl, clock);
    const drop = (1 - Math.max(0.2, Math.min(1, power))) * 70;  // weak throws sink
    flying = { sx: a.x, sy: H + 80, tx: a.x + (Math.random() - 0.5) * 8, ty: a.y + drop + (Math.random() - 0.5) * 8, t: 0, color: pl.p.color };
    state = 'fly'; api.audio.play('whoosh');
  }

  function update(dt, t) {
    clock = t;
    if (msgT > 0) msgT -= dt;
    if (state === 'aim') {
      const p = ps[cur].p;
      const sw = p.takeSwing();
      if (sw) throwDart(sw.power + 0.2);
      else if (p.pressed(api.BTN.A) || p.pressed(api.BTN.B)) throwDart(0.85);
    } else if (state === 'fly') {
      flying.t += dt / 0.35;
      if (flying.t >= 1) {
        const s = scoreAt(flying.tx, flying.ty);
        darts.push({ x: flying.tx, y: flying.ty, color: flying.color });
        const pl = ps[cur]; pl.total += s.pts;
        pl.rounds[round] = (pl.rounds[round] || 0) + s.pts;
        msg = s.pts ? `${s.label}  +${s.pts}` : 'Miss!'; msgT = 1.2;
        api.audio.play(s.pts >= 50 ? 'cheer' : s.pts ? 'hit' : 'aww'); api.rumble(pl.p.index, 80);
        flying = null; dartN++;
        state = 'wait'; wait = dartN >= 3 ? 1.6 : 0.6;
      }
    } else if (state === 'wait') {
      wait -= dt;
      if (wait <= 0) {
        if (dartN >= 3) {
          dartN = 0; darts = []; cur++;
          if (cur >= ps.length) { cur = 0; round++; }
          if (round >= ROUNDS) { state = 'over'; finish(); }
          else { state = 'aim'; msg = `${api.getMe(ps[cur].p.index).name} — Round ${round + 1}`; msgT = 1.5; }
        } else state = 'aim';
      }
    }
    draw();
  }

  function drawBoard(g) {
    g.fillStyle = '#3b2a1e'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.05 + (i % 3) * 0.03})`; g.fillRect(0, i * 18, W, 2); }
    g.fillStyle = '#111'; g.beginPath(); g.arc(CX, CY, R * 1.18, 0, 7); g.fill();
    const ring = (r0, r1, colA, colB) => {
      for (let i = 0; i < 20; i++) {
        const a0 = (i * 18 - 9 - 90) * Math.PI / 180, a1 = ((i + 1) * 18 - 9 - 90) * Math.PI / 180;
        g.fillStyle = i % 2 ? colA : colB;
        g.beginPath(); g.arc(CX, CY, r1 * R, a0, a1); g.arc(CX, CY, r0 * R, a1, a0, true); g.closePath(); g.fill();
      }
    };
    ring(0.09, 1, '#f2e6c4', '#151515');
    ring(0.93, 1, '#2a9a3a', '#d42a2a');
    ring(0.55, 0.61, '#2a9a3a', '#d42a2a');
    g.fillStyle = '#2a9a3a'; g.beginPath(); g.arc(CX, CY, 0.09 * R, 0, 7); g.fill();
    g.fillStyle = '#d42a2a'; g.beginPath(); g.arc(CX, CY, 0.04 * R, 0, 7); g.fill();
    g.strokeStyle = 'rgba(200,200,200,.6)'; g.lineWidth = 1.5;
    for (const r of [0.09, 0.55, 0.61, 0.93, 1]) { g.beginPath(); g.arc(CX, CY, r * R, 0, 7); g.stroke(); }
    g.fillStyle = '#fff'; g.font = '800 26px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ORDER.forEach((n, i) => { const a = (i * 18 - 90) * Math.PI / 180; g.fillText(n, CX + Math.cos(a) * R * 1.09, CY + Math.sin(a) * R * 1.09); });
  }
  function drawDart(x, y, color, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, 22); ctx.stroke();
    ctx.fillStyle = '#333'; ctx.fillRect(14, 20, 8, 18);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(18, 34); ctx.lineTo(8, 52); ctx.lineTo(28, 52); ctx.fill();
    ctx.restore();
  }
  function draw() {
    view.begin('#000');
    ctx.drawImage(board, 0, 0);
    for (const d of darts) drawDart(d.x, d.y, d.color);
    if (flying) { const k = flying.t; const x = flying.sx + (flying.tx - flying.sx) * k, y = flying.sy + (flying.ty - flying.sy) * k - Math.sin(k * Math.PI) * 120; drawDart(x, y, flying.color, 2.4 - k * 1.4); }
    if (state === 'aim' && ps[cur]) {
      const a = aimPoint(ps[cur], clock), col = ps[cur].p.color;
      ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(a.x, a.y, 16, 0, 7); ctx.moveTo(a.x - 26, a.y); ctx.lineTo(a.x + 26, a.y); ctx.moveTo(a.x, a.y - 26); ctx.lineTo(a.x, a.y + 26); ctx.stroke();
    }
    vignette(ctx, W, H, 0.4);
    // scoreboard
    ps.forEach((pl, i) => {
      ctx.fillStyle = i === cur ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.roundRect(20, 20 + i * 58, 250, 50, 10); ctx.fill();
      ctx.fillStyle = pl.p.color; ctx.font = '800 24px Arial'; ctx.textAlign = 'left';
      ctx.fillText(api.getMe(pl.p.index).name.slice(0, 10), 34, 54 + i * 58);
      ctx.fillStyle = '#222'; ctx.textAlign = 'right'; ctx.fillText(pl.total, 255, 54 + i * 58);
    });
    ctx.fillStyle = '#fff'; ctx.font = '800 26px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`Round ${Math.min(ROUNDS, round + 1)}/${ROUNDS} · Dart ${Math.min(3, dartN + 1)}/3`, W - 24, 46);
    if (msgT > 0) bigText(ctx, msg, CX, H - 60, 52, '#ffd23a', '#311');
    if (state === 'aim') bigText(ctx, 'Flick the remote (or press A) to throw', CX, H - 20, 24, '#fff', '#000');
    view.end();
  }
  function finish() {
    const rows = ps.map((pl) => ({ name: api.getMe(pl.p.index).name, color: pl.p.color, me: api.getMe(pl.p.index), score: pl.total, raw: pl.total })).sort((a, b) => b.raw - a.raw);
    resultsOverlay(api, '🎯 Darts Results', rows, { again: start, scoreLabel: 'Points' });
  }

  ui = overlay(api, `<h1>🎯 Woo Darts</h1><p>${ROUNDS} rounds, 3 darts each. Highest total wins. Bullseye = 50, trebles count triple!</p>
    <div class="pill" data-ui="go">Let's throw</div>
    <p class="g-hint">Point at the board — your hand wobbles, that's realism. Flick the remote forward to throw (weak flicks drop lower).</p>
    <div class="pill small" data-ui="quit">Woo Menu</div>`, { go: () => { ui.remove(); start(); }, quit: () => api.exit() });
  ui.style.background = 'rgba(30,20,10,.6)'; ui.style.color = '#fff'; ui.querySelector('h1').style.color = '#fff';
  return { update, resize: view.resize, destroy() {} };
}
