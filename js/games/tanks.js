// Woo Tanks! — co-op top-down tank battles. D-pad = drive, pointer = aim turret, A/B = fire, 1 = drop a mine.
import { makeCanvas, overlay, bigText, resultsOverlay, vignette } from './common.js';

const W = 1280, H = 720, CELL = 40, COLS = 32, ROWS = 18;
const MAPS = [
  [
    '################################',
    '#..............................#',
    '#..............................#',
    '#.....####............####.....#',
    '#..............................#',
    '#..............................#',
    '#..........#........#..........#',
    '#..........#........#..........#',
    '#.......xxxx........xxxx.......#',
    '#..........#........#..........#',
    '#..........#........#..........#',
    '#..............................#',
    '#..............................#',
    '#.....####............####.....#',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '################################',
  ],
  [
    '################################',
    '#..............#...............#',
    '#..............#...............#',
    '#....xxx.......#.......xxx.....#',
    '#..............................#',
    '#.........#####....#####.......#',
    '#..............................#',
    '#.....#..................#.....#',
    '#.....#.......xxxx.......#.....#',
    '#.....#.......xxxx.......#.....#',
    '#.....#..................#.....#',
    '#..............................#',
    '#.........#####....#####.......#',
    '#..............................#',
    '#....xxx.......#.......xxx.....#',
    '#..............#...............#',
    '#..............#...............#',
    '################################',
  ],
  [
    '################################',
    '#..............................#',
    '#...#....#....#....#....#......#',
    '#...#....#....#....#....#......#',
    '#...#.........#.........#......#',
    '#..............................#',
    '#.......xxxxxx......xxxxxx.....#',
    '#..............................#',
    '#...#.........#.........#......#',
    '#...#.........#.........#......#',
    '#..............................#',
    '#.......xxxxxx......xxxxxx.....#',
    '#..............................#',
    '#...#.........#.........#......#',
    '#...#....#....#....#....#......#',
    '#...#....#....#....#....#......#',
    '#..............................#',
    '################################',
  ],
];
// enemy types
const TYPES = {
  brown: { color: '#9a6a3a', speed: 0, fireEvery: 2.6, bulletSpeed: 230, bounces: 1, aim: 0.35 },
  grey: { color: '#8a8f99', speed: 55, fireEvery: 1.8, bulletSpeed: 260, bounces: 1, aim: 0.2 },
  teal: { color: '#2aa198', speed: 70, fireEvery: 1.2, bulletSpeed: 420, bounces: 0, aim: 0.08 },
  purple: { color: '#8a4ad2', speed: 95, fireEvery: 0.9, bulletSpeed: 300, bounces: 2, aim: 0.12 },
};

export function create(api) {
  const view = makeCanvas(api, W, H);
  const { ctx } = view;
  let grid = [], tanks = [], bullets = [], mines = [], booms = [], tracks = [];
  let level = 0, state = 'title', stateT = 0, clock = 0, crew = [];
  let ui = null;

  const wall = (c, r) => (r < 0 || r >= ROWS || c < 0 || c >= COLS) ? '#' : grid[r][c];
  const solidAt = (x, y) => { const t = wall(Math.floor(x / CELL), Math.floor(y / CELL)); return t === '#' || t === 'x'; };

  function startLevel(n) {
    level = n;
    grid = MAPS[n % MAPS.length].map((row) => [...row]);
    tanks = []; bullets = []; mines = []; booms = []; tracks = [];
    crew.forEach((c, i) => {
      tanks.push({ human: c.p, crew: c, x: 3 * CELL + 20, y: (4 + i * 3) * CELL + 20, a: 0, turret: 0, color: c.p.color, r: 17, alive: true, cool: 0, mines: 2, bulletsOut: 0, maxBullets: 5, speed: 120, bounces: 1, bulletSpeed: 330 });
    });
    const count = Math.min(9, 2 + n);
    const pool = n < 2 ? ['brown', 'grey'] : n < 4 ? ['brown', 'grey', 'teal'] : ['grey', 'teal', 'purple', 'brown'];
    for (let i = 0; i < count; i++) {
      let x, y, tries = 0;
      do { x = (18 + Math.floor(Math.random() * 12)) * CELL + CELL / 2; y = (1 + Math.floor(Math.random() * 16)) * CELL + CELL / 2; tries++; } while ((solidAt(x, y) || tanks.some((t) => Math.hypot(t.x - x, t.y - y) < 70)) && tries < 200);
      const type = TYPES[pool[Math.floor(Math.random() * pool.length)]];
      tanks.push({ ai: type, x, y, a: Math.PI, turret: Math.PI, color: type.color, r: 17, alive: true, cool: 1 + Math.random() * type.fireEvery, wanderT: 0, dir: Math.random() * 6.28, bulletsOut: 0, maxBullets: 3, speed: type.speed, bounces: type.bounces, bulletSpeed: type.bulletSpeed });
    }
    state = 'intro'; stateT = 2.2;
    api.showCursors(false); api.setRemoteMode('pointer'); api.music('shoot');
  }

  function moveTank(t, dx, dy, dt) {
    if (!dx && !dy) return;
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const want = Math.atan2(dy, dx);
    let da = want - t.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) > Math.PI / 2) { da = da > 0 ? da - Math.PI : da + Math.PI; } // tanks drive backwards too
    t.a += Math.max(-dt * 6, Math.min(dt * 6, da));
    const sp = t.speed * dt;
    const nx = t.x + dx * sp, ny = t.y + dy * sp;
    const free = (x, y) => !solidAt(x - t.r, y - t.r) && !solidAt(x + t.r, y - t.r) && !solidAt(x - t.r, y + t.r) && !solidAt(x + t.r, y + t.r);
    if (free(nx, t.y)) t.x = nx;
    if (free(t.x, ny)) t.y = ny;
    if (Math.random() < 0.3) tracks.push({ x: t.x, y: t.y, a: t.a, t: 4 });
  }

  function fire(t) {
    if (t.cool > 0 || t.bulletsOut >= t.maxBullets) return;
    const bx = t.x + Math.cos(t.turret) * 28, by = t.y + Math.sin(t.turret) * 28;
    if (solidAt(bx, by)) return;
    bullets.push({ x: bx, y: by, vx: Math.cos(t.turret) * t.bulletSpeed, vy: Math.sin(t.turret) * t.bulletSpeed, owner: t, bounces: t.bounces, age: 0 });
    t.bulletsOut++; t.cool = t.human ? 0.25 : t.ai.fireEvery * (0.7 + Math.random() * 0.6);
    api.audio.play('shoot');
    if (t.human) api.rumble(t.human.index, 40);
  }
  function explode(x, y, big) {
    booms.push({ x, y, t: 0, big });
    api.audio.play(big ? 'break' : 'pop');
  }
  function kill(t, by) {
    if (!t.alive) return;
    t.alive = false;
    explode(t.x, t.y, true);
    if (t.human) { api.rumble(t.human.index, 500); api.audio.play('lose'); }
    else if (by && by.human) by.crew.kills++;
  }

  function lineOfSight(a, b) {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12);
    for (let i = 1; i < steps; i++) { const k = i / steps; if (solidAt(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)) return false; }
    return true;
  }

  function update(dt, t) {
    clock = t;
    if (state === 'intro') { stateT -= dt; if (stateT <= 0) state = 'play'; draw(); return; }
    if (state === 'clear' || state === 'lost') {
      stateT -= dt;
      if (stateT <= 0) { if (state === 'clear') startLevel(level + 1); else finish(); }
      stepFx(dt); draw(); return;
    }
    if (state !== 'play') { draw(); return; }
    const humans = tanks.filter((tk) => tk.human && tk.alive);
    for (const tk of tanks) {
      if (!tk.alive) continue;
      tk.cool -= dt;
      if (tk.human) {
        const p = tk.human;
        moveTank(tk, p.dirX(), p.dirY(), dt);
        const c = view.toVirtual(p.cursor);
        tk.aimX = c.x; tk.aimY = c.y;
        tk.turret = Math.atan2(c.y - tk.y, c.x - tk.x);
        if (p.pressed(api.BTN.B) || p.pressed(api.BTN.A) || p.takeSwing()) fire(tk);
        if ((p.pressed(api.BTN.ONE) || p.pressed(api.BTN.MINUS)) && tk.mines > 0 && !mines.some((m) => Math.hypot(m.x - tk.x, m.y - tk.y) < 40)) {
          tk.mines--; mines.push({ x: tk.x, y: tk.y, t: 8, owner: tk }); api.audio.play('beep');
        }
      } else {
        const ai = tk.ai;
        const target = humans.sort((a, b) => Math.hypot(a.x - tk.x, a.y - tk.y) - Math.hypot(b.x - tk.x, b.y - tk.y))[0];
        if (ai.speed) {
          tk.wanderT -= dt;
          if (tk.wanderT <= 0) { tk.dir = target && Math.random() < 0.5 ? Math.atan2(target.y - tk.y, target.x - tk.x) + (Math.random() - 0.5) * 1.5 : Math.random() * 6.28; tk.wanderT = 1 + Math.random() * 2; }
          // dodge nearby bullets
          for (const b of bullets) { if (b.owner !== tk && Math.hypot(b.x - tk.x, b.y - tk.y) < 90) { tk.dir = Math.atan2(b.vy, b.vx) + Math.PI / 2; break; } }
          const ox = tk.x, oy = tk.y;
          moveTank(tk, Math.cos(tk.dir), Math.sin(tk.dir), dt);
          if (ox === tk.x && oy === tk.y) tk.wanderT = 0;
        }
        if (target) {
          const want = Math.atan2(target.y - tk.y, target.x - tk.x) + Math.sin(clock * 2 + tk.x) * ai.aim;
          let da = want - tk.turret; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
          tk.turret += Math.max(-dt * 2.5, Math.min(dt * 2.5, da));
          if (tk.cool <= 0 && Math.abs(da) < 0.15 && lineOfSight(tk, target)) fire(tk);
          else if (tk.cool <= 0 && Math.random() < dt * 0.4 && ai.bounces > 0) fire(tk); // bank shots, sort of
        }
      }
    }
    // tank vs tank push
    for (let i = 0; i < tanks.length; i++) for (let j = i + 1; j < tanks.length; j++) {
      const a = tanks[i], b = tanks[j];
      if (!a.alive || !b.alive) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < a.r + b.r && d > 0) { const push = (a.r + b.r - d) / 2, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push; }
    }
    // bullets
    for (const b of bullets) {
      b.age += dt;
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      let bounced = false;
      if (solidAt(nx, b.y)) { b.vx = -b.vx; bounced = true; }
      if (solidAt(b.x, ny)) { b.vy = -b.vy; bounced = true; }
      if (bounced) { if (b.bounces-- <= 0) { b.dead = true; explode(b.x, b.y, false); continue; } api.audio.play('bounce'); }
      else { b.x = nx; b.y = ny; }
      for (const tk of tanks) {
        if (!tk.alive || (tk === b.owner && b.age < 0.15)) continue;
        if (Math.hypot(tk.x - b.x, tk.y - b.y) < tk.r + 3) {
          if (tk.human && b.owner.human && tk !== b.owner) { b.dead = true; explode(b.x, b.y, false); break; } // no friendly fire
          kill(tk, b.owner); b.dead = true; break;
        }
      }
      for (const o of bullets) if (o !== b && !o.dead && !b.dead && Math.hypot(o.x - b.x, o.y - b.y) < 7) { o.dead = b.dead = true; explode(b.x, b.y, false); }
      for (const m of mines) if (!m.done && Math.hypot(m.x - b.x, m.y - b.y) < 14) { m.t = 0; b.dead = true; }
    }
    for (const b of bullets) if (b.dead) b.owner.bulletsOut--;
    bullets = bullets.filter((b) => !b.dead);
    // mines
    for (const m of mines) {
      m.t -= dt;
      const near = tanks.some((tk) => tk.alive && tk !== m.owner && Math.hypot(tk.x - m.x, tk.y - m.y) < 40);
      if (near && m.t > 0.5) m.t = 0.5;
      if (m.t <= 0 && !m.done) {
        m.done = true; explode(m.x, m.y, true);
        for (const tk of tanks) if (tk.alive && Math.hypot(tk.x - m.x, tk.y - m.y) < 80) kill(tk, m.owner);
        for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
          const cc = Math.floor(m.x / CELL) + c, rr = Math.floor(m.y / CELL) + r;
          if (wall(cc, rr) === 'x' && Math.hypot(c, r) < 2.2) grid[rr][cc] = '.';
        }
        if (m.owner.human) m.owner.mines++;
      }
    }
    mines = mines.filter((m) => !m.done);
    stepFx(dt);
    // win / lose
    if (!tanks.some((tk) => tk.ai && tk.alive)) { state = 'clear'; stateT = 2.5; api.audio.play('win'); for (const c of crew) c.levels = level + 1; }
    else if (!tanks.some((tk) => tk.human && tk.alive)) { state = 'lost'; stateT = 3; api.audio.stopMusic(); }
    draw();
  }
  function stepFx(dt) {
    for (const b of booms) b.t += dt;
    booms = booms.filter((b) => b.t < 0.6);
    for (const tr of tracks) tr.t -= dt;
    tracks = tracks.filter((tr) => tr.t > 0);
    if (tracks.length > 600) tracks.splice(0, tracks.length - 600);
  }

  function drawTank(t) {
    ctx.save(); ctx.translate(t.x, t.y);
    ctx.save(); ctx.rotate(t.a);
    ctx.fillStyle = '#333'; ctx.fillRect(-20, -18, 40, 8); ctx.fillRect(-20, 10, 40, 8);
    ctx.fillStyle = t.color; ctx.fillRect(-17, -12, 34, 24);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.strokeRect(-17, -12, 34, 24);
    ctx.restore();
    ctx.rotate(t.turret);
    ctx.fillStyle = t.color; ctx.fillRect(0, -4, 28, 8);
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.strokeRect(0, -4, 28, 8);
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (t.human) { ctx.fillStyle = '#fff'; ctx.font = '800 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('P' + (t.human.index + 1), t.x, t.y - 26); }
  }
  function draw() {
    view.begin('#000');
    ctx.fillStyle = '#e3cf9c'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,.04)'; ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke(); }
    for (const tr of tracks) { ctx.save(); ctx.globalAlpha = tr.t / 8; ctx.translate(tr.x, tr.y); ctx.rotate(tr.a); ctx.fillStyle = '#9a8558'; ctx.fillRect(-3, -16, 6, 5); ctx.fillRect(-3, 11, 6, 5); ctx.restore(); }
    if (grid.length) { ctx.fillStyle = 'rgba(60,40,10,.22)'; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] !== '.') ctx.fillRect(c * CELL + 7, r * CELL + 7, CELL, CELL); }
    for (const t of tanks) if (t.alive) { ctx.fillStyle = 'rgba(60,40,10,.25)'; ctx.beginPath(); ctx.ellipse(t.x + 5, t.y + 6, 22, 18, t.a, 0, 7); ctx.fill(); }
    if (grid.length) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const t = grid[r][c];
      if (t === '#') { ctx.fillStyle = '#b48a4e'; ctx.fillRect(c * CELL, r * CELL, CELL, CELL); ctx.fillStyle = '#c99f62'; ctx.fillRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 10); }
      else if (t === 'x') { ctx.fillStyle = '#8a6a3e'; ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2); ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 2; ctx.strokeRect(c * CELL + 4, r * CELL + 4, CELL - 8, CELL - 8); ctx.beginPath(); ctx.moveTo(c * CELL + 4, r * CELL + 4); ctx.lineTo(c * CELL + CELL - 4, r * CELL + CELL - 4); ctx.stroke(); }
    }
    for (const m of mines) { ctx.fillStyle = m.t < 1.5 && Math.floor(m.t * 8) % 2 ? '#ff3b3b' : '#f2c84b'; ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, 7); ctx.fill(); ctx.strokeStyle = '#333'; ctx.stroke(); }
    for (const t of tanks) if (t.alive) drawTank(t); else { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.font = '800 34px Arial'; ctx.textAlign = 'center'; ctx.fillText('✕', t.x, t.y + 12); }
    for (const b of bullets) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fill(); ctx.stroke(); }
    for (const b of booms) { const r = (b.big ? 70 : 20) * Math.sin(b.t / 0.6 * Math.PI); ctx.fillStyle = `rgba(255,${150 - b.t * 200},40,${1 - b.t / 0.6})`; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill(); }
    // aim lines + reticles
    for (const t of tanks) if (t.alive && t.human && t.aimX != null) {
      ctx.setLineDash([6, 10]); ctx.strokeStyle = t.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.aimX, t.aimY); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(t.aimX, t.aimY, 14, 0, 7); ctx.stroke();
    }
    vignette(ctx, W, H, 0.3);
    ctx.fillStyle = '#5a4020'; ctx.font = '800 22px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Mission ${level + 1}   ·   Enemies left: ${tanks.filter((t) => t.ai && t.alive).length}`, 14, H - 10);
    if (state === 'intro') { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(0, H / 2 - 90, W, 180); bigText(ctx, `Mission ${level + 1}`, W / 2, H / 2 - 20, 80, '#c33', '#fff'); bigText(ctx, `Enemy tanks: ${tanks.filter((t) => t.ai).length}`, W / 2, H / 2 + 50, 36, '#555', '#fff'); }
    if (state === 'clear') bigText(ctx, 'Mission Cleared!', W / 2, H / 2, 80, '#ffd23a', '#7a3d00');
    if (state === 'lost') bigText(ctx, 'Mission Failed', W / 2, H / 2, 80, '#fff', '#c33');
    view.end();
  }

  function begin() {
    crew = api.active().map((p) => ({ p, kills: 0, levels: 0 }));
    startLevel(0);
  }
  function finish() {
    state = 'done';
    const rows = crew.map((c) => ({ name: api.getMe(c.p.index).name, color: c.p.color, me: api.getMe(c.p.index), score: c.kills })).sort((a, b) => b.score - a.score);
    resultsOverlay(api, `💥 You reached Mission ${level + 1}`, rows, { again: begin, scoreLabel: 'Tanks destroyed' });
  }

  ui = overlay(api, `<h1>Woo Tanks!</h1>
    <p>Team up and blow up every enemy tank. Bullets bounce off walls — careful!</p>
    <div class="pill" data-ui="go" style="min-width:30vw">Roll out!</div>
    <p class="g-hint">Hold the remote normally: <b>D-pad</b> drive · <b>point</b> to aim · <b>A/B</b> fire · <b>1</b> drop mine (mines break crates)<br>Keyboard: arrows/WASD drive · mouse aim · click fire · Z mine</p>
    <div class="pill small" data-ui="quit">Woo Menu</div>`, {
    go: () => { ui.remove(); begin(); },
    quit: () => api.exit(),
  });
  ui.style.background = 'rgba(255,255,255,.7)';
  grid = MAPS[0].map((row) => [...row]);
  return { update, resize: view.resize, destroy() {} };
}
