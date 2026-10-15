// Woo Breakout — co-op brick smashing: every player gets a paddle (pointer left/right or D-pad), A launches.
import { makeCanvas, overlay, bigText, resultsOverlay, vignette } from './common.js';

const W = 1280, H = 720, COLS = 14, BW = 84, BH = 30, TOP = 80;
const LEVELS = [
  ['..aaaaaaaaaa..', '.bbbbbbbbbbbb.', 'cccccccccccccc', 'dddddddddddddd', 'eeeeeeeeeeeeee'],
  ['a.a.a.a.a.a.a.', '.b.b.b.b.b.b.b', 'cccc####cccccc', 'dd..dddd..dddd', 'eeeeeeeeeeeeee', '..ffffffffff..'],
  ['######..######', 'aaaaa....aaaaa', 'bbbb.cccc.bbbb', 'ddd.eeeeee.ddd', 'ff.ffffffff.ff', 'eeeeeeeeeeeeee'],
];
const COLORS = { a: '#ff4a5a', b: '#ff8a2a', c: '#f5b622', d: '#36c96b', e: '#2fa8ff', f: '#9b59ff', '#': '#8a95a5' };

export function create(api) {
  const view = makeCanvas(api, W, H);
  const { ctx } = view;
  let pads = [], balls = [], bricks = [], drops = [], parts = [], lives = 5, level = 0, state = 'title', clock = 0, ui = null, msgT = 0;

  function start() {
    pads = api.active().map((p, i) => ({ p, x: W / 2 + (i - 1.5) * 160, y: H - 50 - i * 22, w: 150, wideT: 0, score: 0 }));
    lives = 5; level = 0; loadLevel();
    api.showCursors(false); api.setRemoteMode('pointer'); api.music('bros');
  }
  function loadLevel() {
    bricks = [];
    LEVELS[level % LEVELS.length].forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      bricks.push({ x: (W - COLS * BW) / 2 + c * BW, y: TOP + r * BH, hp: ch === '#' ? 3 : 1, color: COLORS[ch], hit: 0 });
    }));
    balls = []; drops = []; resetBalls(); state = 'play'; msgT = 2;
  }
  function resetBalls() { balls = pads.map((pd) => ({ x: pd.x, y: pd.y - 20, vx: 0, vy: 0, stuck: pd, owner: pd })); }

  function update(dt, t) {
    clock = t;
    if (msgT > 0) msgT -= dt;
    if (state === 'play') {
      for (const pd of pads) {
        const dx = pd.p.dirX();
        if (dx) pd.x += dx * 900 * dt;
        else { const c = view.toVirtual(pd.p.cursor); pd.x += (c.x - pd.x) * Math.min(1, dt * 16); }
        const w = pd.wideT > 0 ? 240 : 150; pd.w += (w - pd.w) * Math.min(1, dt * 8); if (pd.wideT > 0) pd.wideT -= dt;
        pd.x = Math.max(pd.w / 2, Math.min(W - pd.w / 2, pd.x));
        if (pd.p.pressed(api.BTN.A) || pd.p.pressed(api.BTN.B) || pd.p.takeSwing()) for (const b of balls) if (b.stuck === pd) { b.stuck = null; b.vx = (Math.random() - 0.5) * 300; b.vy = -560; api.audio.play('bounce'); }
      }
      for (const b of balls) {
        if (b.stuck) { b.x = b.stuck.x; b.y = b.stuck.y - 20; continue; }
        const steps = 3;
        for (let s = 0; s < steps; s++) {
          const h = dt / steps;
          b.x += b.vx * h; b.y += b.vy * h;
          if (b.x < 10) { b.x = 10; b.vx = Math.abs(b.vx); }
          if (b.x > W - 10) { b.x = W - 10; b.vx = -Math.abs(b.vx); }
          if (b.y < 10) { b.y = 10; b.vy = Math.abs(b.vy); }
          for (const pd of pads) {
            if (b.vy > 0 && Math.abs(b.y - pd.y) < 14 && Math.abs(b.x - pd.x) < pd.w / 2 + 10) {
              const off = (b.x - pd.x) / (pd.w / 2), sp = Math.min(950, Math.hypot(b.vx, b.vy) * 1.02);
              b.vx = off * sp * 0.8; b.vy = -Math.sqrt(Math.max(1, sp * sp - b.vx * b.vx)); b.owner = pd;
              api.audio.play('bounce'); api.rumble(pd.p.index, 30);
            }
          }
          for (const br of bricks) {
            if (br.hp <= 0) continue;
            if (b.x > br.x - 9 && b.x < br.x + BW + 9 && b.y > br.y - 9 && b.y < br.y + BH + 9) {
              const ox = Math.min(b.x - (br.x - 9), br.x + BW + 9 - b.x), oy = Math.min(b.y - (br.y - 9), br.y + BH + 9 - b.y);
              if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
              br.hp--; br.hit = 0.15;
              if (br.hp <= 0) {
                b.owner.score += 10; api.audio.play('pop');
                for (let k = 0; k < 8; k++) parts.push({ x: br.x + BW / 2, y: br.y + BH / 2, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.8) * 300, t: 0.6, c: br.color });
                if (Math.random() < 0.12) drops.push({ x: br.x + BW / 2, y: br.y, kind: Math.random() < 0.5 ? 'multi' : 'wide' });
              } else api.audio.play('block');
              break;
            }
          }
        }
        if (b.y > H + 20) b.dead = true;
      }
      balls = balls.filter((b) => !b.dead);
      if (!balls.length) {
        lives--; api.audio.play('lose');
        if (lives <= 0) { state = 'over'; finish(false); } else resetBalls();
      }
      for (const d of drops) {
        d.y += 220 * dt;
        for (const pd of pads) if (Math.abs(d.y - pd.y) < 16 && Math.abs(d.x - pd.x) < pd.w / 2) {
          d.gone = true; api.audio.play('powerup');
          if (d.kind === 'wide') pd.wideT = 12;
          else { const src = balls.find((q) => !q.stuck) || balls[0]; if (src) for (let k = 0; k < 2; k++) balls.push({ x: src.x, y: src.y, vx: (k ? 1 : -1) * 300, vy: -480, owner: pd }); }
        }
        if (d.y > H) d.gone = true;
      }
      drops = drops.filter((d) => !d.gone);
      if (bricks.every((br) => br.hp <= 0 || br.color === COLORS['#'])) {
        level++; api.audio.play('win');
        if (level >= LEVELS.length) { state = 'over'; finish(true); } else loadLevel();
      }
    }
    for (const p of parts) { p.t -= dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter((p) => p.t > 0);
    draw();
  }

  function draw() {
    view.begin('#000');
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#140c34'); g.addColorStop(1, '#3a1a70');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.3 * Math.abs(Math.sin(clock + i))})`; ctx.fillRect((i * 211) % W, (i * 97) % H, 2, 2); }
    for (const br of bricks) {
      if (br.hp <= 0) continue;
      const gg = ctx.createLinearGradient(0, br.y, 0, br.y + BH); gg.addColorStop(0, '#fff'); gg.addColorStop(0.15, br.color); gg.addColorStop(1, br.color);
      ctx.fillStyle = br.hit > 0 ? '#fff' : gg; br.hit -= 1 / 60;
      ctx.beginPath(); ctx.roundRect(br.x + 2, br.y + 2, BW - 4, BH - 4, 6); ctx.fill();
      if (br.hp > 1) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.font = '800 16px Arial'; ctx.textAlign = 'center'; ctx.fillText('▣'.repeat(br.hp - 1), br.x + BW / 2, br.y + 21); }
    }
    for (const d of drops) { ctx.fillStyle = d.kind === 'wide' ? '#36c96b' : '#ff4fa8'; ctx.beginPath(); ctx.roundRect(d.x - 22, d.y - 12, 44, 24, 12); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '900 16px Arial'; ctx.textAlign = 'center'; ctx.fillText(d.kind === 'wide' ? '↔' : '×3', d.x, d.y + 6); }
    for (const pd of pads) {
      ctx.shadowColor = pd.p.color; ctx.shadowBlur = 18; ctx.fillStyle = pd.p.color;
      ctx.beginPath(); ctx.roundRect(pd.x - pd.w / 2, pd.y - 9, pd.w, 18, 9); ctx.fill(); ctx.shadowBlur = 0;
    }
    for (const b of balls) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 16; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
    for (const p of parts) { ctx.fillStyle = p.c; ctx.globalAlpha = p.t / 0.6; ctx.fillRect(p.x - 4, p.y - 4, 8, 8); ctx.globalAlpha = 1; }
    vignette(ctx, W, H, 0.35);
    ctx.fillStyle = '#fff'; ctx.font = '800 24px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Level ${level + 1}   ♥ ${lives}`, 20, 40);
    pads.forEach((pd, i) => { ctx.fillStyle = pd.p.color; ctx.textAlign = 'right'; ctx.fillText(`P${pd.p.index + 1}: ${pd.score}`, W - 20 - i * 150, 40); });
    if (state === 'play' && balls.some((b) => b.stuck)) bigText(ctx, 'Press A (or flick) to launch', W / 2, H / 2 + 120, 34, '#fff', '#203');
    if (msgT > 0) bigText(ctx, `Level ${level + 1}`, W / 2, H / 2, 80, '#ffd23a', '#203');
    view.end();
  }
  function finish(won) {
    const rows = pads.map((pd) => ({ name: api.getMe(pd.p.index).name, color: pd.p.color, me: api.getMe(pd.p.index), score: pd.score, raw: pd.score })).sort((a, b) => b.raw - a.raw);
    resultsOverlay(api, won ? '🧱 All bricks smashed!' : '💥 Out of balls', rows, { again: start, scoreLabel: 'Points' });
  }

  ui = overlay(api, `<h1>Woo Breakout</h1><p>Everyone gets a paddle. Smash all the bricks together. Grey bricks need 3 hits.</p>
    <div class="pill" data-ui="go">Go!</div>
    <p class="g-hint">Point left/right to move your paddle (or D-pad). A or a flick launches the ball. Catch ↔ for a wide paddle and ×3 for more balls.</p>
    <div class="pill small" data-ui="quit">Woo Menu</div>`, { go: () => { ui.remove(); start(); }, quit: () => api.exit() });
  ui.style.background = 'rgba(20,10,50,.6)'; ui.style.color = '#fff'; ui.querySelector('h1').style.color = '#fff';
  return { update, resize: view.resize, destroy() {} };
}
