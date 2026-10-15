// Woo Mini Golf — top-down putt-putt. Point to aim, swing to putt (or hold A to charge, release).
import { makeCanvas, overlay, bigText, resultsOverlay, vignette } from './common.js';

const W = 1280, H = 720, BR = 10, CUP = 17, MAX_STROKES = 8;
// walls/sand/water are rectangles [x, y, w, h]; course area is the green rect
const HOLES = [
  { par: 2, green: [140, 200, 1000, 320], start: [220, 360], cup: [1060, 360], walls: [], sand: [], water: [] },
  { par: 3, green: [140, 120, 1000, 480], start: [220, 520], cup: [1060, 200], walls: [[560, 120, 30, 330]], sand: [[820, 420, 180, 120]], water: [] },
  { par: 3, green: [140, 120, 1000, 480], start: [220, 200], cup: [1060, 520], walls: [[420, 260, 30, 340], [760, 120, 30, 340]], sand: [], water: [] },
  { par: 3, green: [140, 140, 1000, 440], start: [220, 360], cup: [1060, 360], walls: [[600, 140, 30, 150], [600, 430, 30, 150]], sand: [], water: [[380, 300, 140, 120]] },
  { par: 4, green: [140, 100, 1000, 520], start: [210, 540], cup: [1070, 170], walls: [[330, 100, 30, 380], [560, 240, 30, 380], [790, 100, 30, 380]], sand: [[880, 470, 200, 110]], water: [] },
  { par: 3, green: [240, 100, 800, 520], start: [640, 560], cup: [640, 170], walls: [[420, 330, 160, 26], [700, 330, 160, 26]], sand: [[560, 230, 160, 50]], water: [[260, 120, 120, 200], [900, 120, 120, 200]] },
];
const inRect = (x, y, [rx, ry, rw, rh], m = 0) => x > rx - m && x < rx + rw + m && y > ry - m && y < ry + rh + m;

export function create(api) {
  const view = makeCanvas(api, W, H);
  const { ctx } = view;
  let ps = [], hole = 0, cur = 0, state = 'title', charge = 0, charging = false, msg = '', msgT = 0, clock = 0, ui = null, wait = 0;
  const H_ = () => HOLES[hole];

  function start() {
    ps = api.active().map((p) => ({ p, cards: [], x: 0, y: 0, vx: 0, vy: 0, strokes: 0, done: false, lastX: 0, lastY: 0 }));
    hole = 0; beginHole();
    api.showCursors(false); api.setRemoteMode('pointer'); api.music('fish');
  }
  function beginHole() {
    const [sx, sy] = H_().start;
    ps.forEach((pl, i) => Object.assign(pl, { x: sx, y: sy + (i - (ps.length - 1) / 2) * 26, vx: 0, vy: 0, strokes: 0, done: false }));
    cur = 0; state = 'aim'; msg = `Hole ${hole + 1} · Par ${H_().par}`; msgT = 2;
  }
  function moving() { return ps.some((pl) => Math.hypot(pl.vx, pl.vy) > 4); }
  function shoot(power) {
    const pl = ps[cur], c = view.toVirtual(pl.p.cursor);
    const a = Math.atan2(c.y - pl.y, c.x - pl.x), sp = 120 + Math.max(0.05, Math.min(1, power)) * 1050;
    pl.lastX = pl.x; pl.lastY = pl.y;
    pl.vx = Math.cos(a) * sp; pl.vy = Math.sin(a) * sp; pl.strokes++;
    state = 'roll'; api.audio.play('hit'); api.rumble(pl.p.index, 70);
  }
  function nextTurn() {
    if (ps.every((pl) => pl.done)) {
      ps.forEach((pl) => pl.cards.push(pl.strokes));
      hole++;
      if (hole >= HOLES.length) { state = 'over'; finish(); return; }
      state = 'between'; wait = 1.8; return;
    }
    do { cur = (cur + 1) % ps.length; } while (ps[cur].done);
    state = 'aim';
  }

  function physics(pl, dt) {
    const h = H_();
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const dtt = dt / steps;
      const sp = Math.hypot(pl.vx, pl.vy);
      if (sp < 4) { pl.vx = pl.vy = 0; break; }
      const sand = h.sand.some((r) => inRect(pl.x, pl.y, r));
      const dec = (sand ? 900 : 230) * dtt;
      const k = Math.max(0, sp - dec) / sp; pl.vx *= k; pl.vy *= k;
      let nx = pl.x + pl.vx * dtt, ny = pl.y + pl.vy * dtt;
      const [gx, gy, gw, gh] = h.green;
      if (nx < gx + BR || nx > gx + gw - BR) { pl.vx = -pl.vx * 0.8; nx = pl.x; api.audio.play('bump'); }
      if (ny < gy + BR || ny > gy + gh - BR) { pl.vy = -pl.vy * 0.8; ny = pl.y; api.audio.play('bump'); }
      for (const r of h.walls) {
        if (inRect(nx, ny, r, BR)) {
          if (!inRect(pl.x, ny, r, BR)) { pl.vx = -pl.vx * 0.8; nx = pl.x; } else { pl.vy = -pl.vy * 0.8; ny = pl.y; }
          api.audio.play('bump');
        }
      }
      pl.x = nx; pl.y = ny;
      if (h.water.some((r) => inRect(pl.x, pl.y, r))) {
        api.audio.play('splash'); pl.x = pl.lastX; pl.y = pl.lastY; pl.vx = pl.vy = 0; pl.strokes++; msg = 'Splash! +1 stroke'; msgT = 1.4; break;
      }
      const [cx, cy] = h.cup, d = Math.hypot(pl.x - cx, pl.y - cy);
      if (d < CUP && sp < 650) {
        pl.done = true; pl.vx = pl.vy = 0; pl.x = cx; pl.y = cy;
        const diff = pl.strokes - h.par;
        msg = pl.strokes === 1 ? 'HOLE IN ONE!!' : diff <= -2 ? 'Eagle!' : diff === -1 ? 'Birdie!' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : `+${diff}`;
        msgT = 1.8; api.audio.play(pl.strokes === 1 ? 'cheer' : 'coin');
        break;
      } else if (d < CUP + 10 && sp >= 650) { pl.vx *= 0.9; pl.vy += (cy - pl.y) * 0.5; } // lip-out wobble
    }
  }

  function update(dt, t) {
    clock = t;
    if (msgT > 0) msgT -= dt;
    if (state === 'aim') {
      const p = ps[cur].p, B = api.BTN;
      const sw = p.takeSwing();
      if (sw) shoot(sw.power * 0.9);
      else if (p.down(B.A) || p.down(B.B)) { charging = true; charge = (Math.sin(clock * 3 - Math.PI / 2) + 1) / 2; }
      else if (charging) { charging = false; shoot(charge); }
    } else if (state === 'roll') {
      for (const pl of ps) physics(pl, dt);
      if (!moving()) {
        const pl = ps[cur];
        if (!pl.done && pl.strokes >= MAX_STROKES) { pl.done = true; pl.strokes = MAX_STROKES + 1; msg = 'Max strokes — picked up'; msgT = 1.4; }
        nextTurn();
      }
    } else if (state === 'between') { wait -= dt; if (wait <= 0) beginHole(); }
    draw();
  }

  function draw() {
    view.begin('#000');
    const h = H_();
    ctx.fillStyle = '#3f8f3a'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 120; i++) { ctx.fillStyle = 'rgba(0,40,0,.12)'; ctx.fillRect((i * 173) % W, (i * 89) % H, 3, 9); }
    const [gx, gy, gw, gh] = h.green;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.roundRect(gx + 8, gy + 10, gw, gh, 24); ctx.fill();
    ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.roundRect(gx - 14, gy - 14, gw + 28, gh + 28, 30); ctx.fill();
    const gr = ctx.createLinearGradient(0, gy, 0, gy + gh); gr.addColorStop(0, '#7fdc6b'); gr.addColorStop(1, '#55bf4a');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 18); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 18); ctx.clip();
    for (let x = gx; x < gx + gw; x += 60) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x, gy, 30, gh); }
    ctx.restore();
    for (const r of h.sand) { ctx.fillStyle = '#ecd9a0'; ctx.beginPath(); ctx.roundRect(...r, 30); ctx.fill(); }
    for (const r of h.water) { const wg = ctx.createLinearGradient(r[0], r[1], r[0], r[1] + r[3]); wg.addColorStop(0, '#5bc8ff'); wg.addColorStop(1, '#1f7fd0'); ctx.fillStyle = wg; ctx.beginPath(); ctx.roundRect(...r, 20); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(r[0] + r[2] / 2, r[1] + r[3] / 2 + Math.sin(clock * 2) * 6, r[2] * 0.3, 6, 0, 0, 7); ctx.stroke(); }
    for (const r of h.walls) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(r[0] + 5, r[1] + 6, r[2], r[3]); ctx.fillStyle = '#a06a35'; ctx.fillRect(...r); ctx.fillStyle = '#c48a4d'; ctx.fillRect(r[0], r[1], r[2], 6); }
    const [cx, cy] = h.cup;
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(cx, cy, CUP, 0, 7); ctx.fill();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 4, cy - 90); ctx.stroke();
    ctx.fillStyle = '#ff4a5a'; ctx.beginPath(); ctx.moveTo(cx + 4, cy - 90); ctx.lineTo(cx + 54, cy - 76 + Math.sin(clock * 4) * 4); ctx.lineTo(cx + 4, cy - 62); ctx.fill();
    // aim line
    if (state === 'aim') {
      const pl = ps[cur], c = view.toVirtual(pl.p.cursor);
      const a = Math.atan2(c.y - pl.y, c.x - pl.x);
      ctx.setLineDash([10, 10]); ctx.strokeStyle = pl.p.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x + Math.cos(a) * 200, pl.y + Math.sin(a) * 200); ctx.stroke(); ctx.setLineDash([]);
      if (charging) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(pl.x - 60, pl.y + 26, 120, 16); ctx.fillStyle = `hsl(${120 - charge * 120},90%,50%)`; ctx.fillRect(pl.x - 58, pl.y + 28, 116 * charge, 12); }
    }
    for (const pl of ps) {
      if (pl.done) continue;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(pl.x + 3, pl.y + 4, BR, BR * 0.7, 0, 0, 7); ctx.fill();
      const bg = ctx.createRadialGradient(pl.x - 3, pl.y - 3, 1, pl.x, pl.y, BR); bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#d8dde4');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(pl.x, pl.y, BR, 0, 7); ctx.fill();
      ctx.strokeStyle = pl.p.color; ctx.lineWidth = 3; ctx.stroke();
    }
    vignette(ctx, W, H, 0.3);
    // scorecard
    ps.forEach((pl, i) => {
      ctx.fillStyle = i === cur && state === 'aim' ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.roundRect(16, 16 + i * 46, 300, 40, 10); ctx.fill();
      ctx.fillStyle = pl.p.color; ctx.font = '800 20px Arial'; ctx.textAlign = 'left';
      ctx.fillText(api.getMe(pl.p.index).name.slice(0, 10), 28, 43 + i * 46);
      ctx.fillStyle = '#333'; ctx.textAlign = 'right';
      ctx.fillText(`${pl.cards.reduce((s, v) => s + v, 0) + (pl.done ? 0 : pl.strokes)} (${pl.strokes})`, 304, 43 + i * 46);
    });
    ctx.fillStyle = '#fff'; ctx.font = '800 24px Arial'; ctx.textAlign = 'right'; ctx.fillText(`Hole ${hole + 1}/${HOLES.length} · Par ${h.par}`, W - 20, 40);
    if (msgT > 0) bigText(ctx, msg, W / 2, H / 2, 70, '#fff', '#1a4a1a');
    if (state === 'aim') bigText(ctx, `${api.getMe(ps[cur].p.index).name}: point to aim · swing to putt (or hold A, release)`, W / 2, H - 22, 22, '#fff', '#000');
    view.end();
  }
  function finish() {
    const par = HOLES.reduce((s, h) => s + h.par, 0);
    const rows = ps.map((pl) => { const tot = pl.cards.reduce((s, v) => s + v, 0); return { name: api.getMe(pl.p.index).name, color: pl.p.color, me: api.getMe(pl.p.index), score: `${tot} (${tot - par >= 0 ? '+' : ''}${tot - par})`, raw: tot }; }).sort((a, b) => a.raw - b.raw);
    resultsOverlay(api, '⛳ Mini Golf Results', rows, { again: start, scoreLabel: 'Strokes' });
  }

  ui = overlay(api, `<h1>⛳ Woo Mini Golf</h1><p>${HOLES.length} holes. Fewest strokes wins. Water = +1 stroke, sand = slow.</p>
    <div class="pill" data-ui="go">Tee off</div>
    <p class="g-hint">Point at the green to aim. Swing the remote like a putter — gentle swing, gentle putt.<br>Or hold A and let go when the power bar looks right.</p>
    <div class="pill small" data-ui="quit">Woo Menu</div>`, { go: () => { ui.remove(); start(); }, quit: () => api.exit() });
  ui.style.background = 'rgba(255,255,255,.75)';
  return { update, resize: view.resize, destroy() {} };
}
