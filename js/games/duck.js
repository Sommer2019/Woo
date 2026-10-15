// Woo Play: Duck Blaster — point & shoot gallery for up to 4 at once. Aim with the pointer, B or A to fire.
import { makeCanvas, overlay, bigText, resultsOverlay, vignette } from './common.js';
import { drawDuck } from '../channels.js';

const W = 1280, H = 720;
const STAGES = [
  { name: 'Stage 1: Balloon Pop', kind: 'balloon', time: 25 },
  { name: 'Stage 2: Duck Season', kind: 'duck', time: 25 },
  { name: 'Stage 3: Can Juggle', kind: 'can', time: 25 },
];

export function create(api) {
  const view = makeCanvas(api, W, H);
  const { ctx } = view;
  let state = 'title', stage = 0, timer = 0, spawnT = 0, introT = 0, clock = 0;
  let targets = [], pops = [], shots = [];
  let players = [];
  let ui = null;

  function start() {
    players = api.active().map((p) => ({ p, score: 0, cool: 0, hits: 0, shots: 0 }));
    stage = 0; beginStage();
  }
  function beginStage() {
    targets = []; pops = []; shots = [];
    timer = STAGES[stage].time; spawnT = 0; introT = 2.2; state = 'intro';
    api.showCursors(false); api.setRemoteMode('pointer'); api.music('shoot');
  }

  function spawn() {
    const kind = STAGES[stage].kind;
    if (kind === 'balloon') {
      const gold = Math.random() < 0.08;
      targets.push({ kind, x: 80 + Math.random() * (W - 160), y: H + 60, vx: 0, vy: -(90 + Math.random() * 90), r: gold ? 26 : 36, pts: gold ? 50 : 10, color: gold ? '#ffd23a' : `hsl(${Math.random() * 360},80%,60%)`, t: Math.random() * 6, hp: 1 });
    } else if (kind === 'duck') {
      const dir = Math.random() < 0.5 ? 1 : -1, fast = Math.random() < 0.2;
      targets.push({ kind, x: dir > 0 ? -60 : W + 60, y: 120 + Math.random() * 330, vx: dir * (fast ? 330 : 190 + Math.random() * 80), vy: 0, r: 34, pts: fast ? 40 : 20, color: fast ? '#d23ad2' : '#4a8f3a', t: Math.random() * 6, hp: 1, base: 0, amp: 40 + Math.random() * 60 });
      targets[targets.length - 1].base = targets[targets.length - 1].y;
    } else {
      targets.push({ kind, x: 140 + Math.random() * (W - 280), y: H + 40, vx: (Math.random() - 0.5) * 160, vy: -(720 + Math.random() * 180), r: 30, pts: 10, color: ['#e33', '#3a8', '#36f', '#fa0'][Math.floor(Math.random() * 4)], t: 0, hp: 99, rot: 0, juggles: 0 });
    }
  }

  function shoot(pl) {
    if (pl.cool > 0) return;
    pl.cool = 0.22; pl.shots++;
    const c = view.toVirtual(pl.p.cursor);
    shots.push({ x: c.x, y: c.y, t: 0.15, color: pl.p.color });
    api.audio.play('shoot');
    api.rumble(pl.p.index, 50);
    // hit the top-most target under the crosshair
    for (let i = targets.length - 1; i >= 0; i--) {
      const tg = targets[i];
      if (tg.dead) continue;
      if (Math.hypot(tg.x - c.x, tg.y - c.y) < tg.r + 6) {
        pl.hits++;
        if (tg.kind === 'can') {
          tg.juggles++; tg.vy = -600; tg.vx = (tg.x - c.x) * 6; tg.rot += 2;
          const pts = 10 * tg.juggles;
          pl.score += pts; pops.push({ x: tg.x, y: tg.y - 30, text: '+' + pts, color: pl.p.color, t: 0.8 });
          api.audio.play('bump');
        } else {
          tg.dead = true; tg.vy = tg.kind === 'duck' ? 100 : 0; tg.deadT = 1;
          pl.score += tg.pts; pops.push({ x: tg.x, y: tg.y - 30, text: '+' + tg.pts, color: pl.p.color, t: 0.8 });
          api.audio.play(tg.kind === 'duck' ? 'quack' : 'pop');
        }
        break;
      }
    }
  }

  function update(dt, t) {
    clock = t;
    if (state === 'intro') { introT -= dt; if (introT <= 0) state = 'play'; }
    if (state === 'play') {
      timer -= dt;
      spawnT -= dt;
      const rate = STAGES[stage].kind === 'can' ? 1.1 : STAGES[stage].kind === 'duck' ? 0.75 : 0.45;
      if (spawnT <= 0) { spawn(); spawnT = rate * (0.6 + Math.random() * 0.8); }
      for (const pl of players) {
        pl.cool -= dt;
        if (pl.p.pressed(api.BTN.B) || pl.p.pressed(api.BTN.A)) shoot(pl);
      }
      if (timer <= 0) {
        state = 'between'; introT = 2.5;
        api.audio.play('bell');
      }
    } else if (state === 'between') {
      introT -= dt;
      if (introT <= 0) { stage++; if (stage < STAGES.length) beginStage(); else finish(); }
    }
    for (const tg of targets) {
      tg.t += dt;
      if (tg.dead) {
        tg.deadT -= dt;
        if (tg.kind === 'duck') { tg.vy += 900 * dt; tg.y += tg.vy * dt; }
        continue;
      }
      if (tg.kind === 'balloon') { tg.x += Math.sin(tg.t * 2) * 30 * dt; tg.y += tg.vy * dt; if (tg.y < -80) tg.gone = true; }
      else if (tg.kind === 'duck') { tg.x += tg.vx * dt; tg.y = tg.base + Math.sin(tg.t * 3) * tg.amp; if (tg.x < -100 || tg.x > W + 100) tg.gone = true; if (Math.random() < dt * 0.3) api.audio.play('quack'); }
      else { tg.vy += 900 * dt; tg.x += tg.vx * dt; tg.y += tg.vy * dt; tg.rot += dt * 4; if (tg.x < 30 || tg.x > W - 30) tg.vx = -tg.vx; if (tg.y > H + 80 && tg.vy > 0) tg.gone = true; }
    }
    targets = targets.filter((tg) => !tg.gone && !(tg.dead && tg.deadT <= 0));
    for (const p of pops) { p.t -= dt; p.y -= 40 * dt; }
    pops = pops.filter((p) => p.t > 0);
    for (const s of shots) s.t -= dt;
    shots = shots.filter((s) => s.t > 0);
    draw();
  }

  function draw() {
    view.begin('#000');
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#5fb4ff'); g.addColorStop(1, '#d3eeff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sg = ctx.createRadialGradient(1050, 110, 10, 1050, 110, 180); sg.addColorStop(0, 'rgba(255,250,220,.95)'); sg.addColorStop(0.2, 'rgba(255,240,180,.45)'); sg.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = sg; ctx.fillRect(850, 0, 400, 320);
    ctx.fillStyle = 'rgba(150,190,230,.55)'; ctx.beginPath(); ctx.moveTo(0, 520); for (let x = 0; x <= W; x += 120) ctx.lineTo(x + 60, 400 + ((x * 7) % 5) * 18); ctx.lineTo(W, 520); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 5; i++) { const x = ((i * 300 + clock * 15) % (W + 200)) - 100; ctx.beginPath(); ctx.arc(x, 90 + i * 25, 30, 0, 7); ctx.arc(x + 40, 75 + i * 25, 40, 0, 7); ctx.arc(x + 80, 90 + i * 25, 28, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#7fc96b'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 520 - Math.sin(x / 180) * 40); ctx.lineTo(W, H); ctx.fill();
    for (const tg of targets) drawTarget(tg);
    // foreground grass + bushes
    ctx.fillStyle = '#3c9c3c'; ctx.fillRect(0, 620, W, 100);
    ctx.fillStyle = '#2e7d32';
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(i * 120 + 30, 630, 70, Math.PI, 0); ctx.fill(); }
    for (const p of pops) { ctx.globalAlpha = Math.min(1, p.t * 2); bigText(ctx, p.text, p.x, p.y, 34, '#fff', p.color); ctx.globalAlpha = 1; }
    for (const s of shots) { ctx.fillStyle = `rgba(255,255,200,${s.t * 5})`; ctx.beginPath(); ctx.arc(s.x, s.y, 30 * (1 - s.t * 4) + 10, 0, 7); ctx.fill(); }
    // crosshairs
    for (const pl of players) {
      const c = view.toVirtual(pl.p.cursor);
      ctx.strokeStyle = pl.p.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, 7); ctx.moveTo(c.x - 34, c.y); ctx.lineTo(c.x - 10, c.y); ctx.moveTo(c.x + 10, c.y); ctx.lineTo(c.x + 34, c.y); ctx.moveTo(c.x, c.y - 34); ctx.lineTo(c.x, c.y - 10); ctx.moveTo(c.x, c.y + 10); ctx.lineTo(c.x, c.y + 34); ctx.stroke();
      ctx.fillStyle = pl.p.color; ctx.font = '800 16px Arial'; ctx.textAlign = 'left'; ctx.fillText(pl.p.index + 1, c.x + 22, c.y - 20);
    }
    vignette(ctx, W, H, 0.25);
    // HUD
    players.forEach((pl, i) => {
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(20 + i * 250, 16, 230, 50);
      ctx.fillStyle = pl.p.color; ctx.font = '800 28px Arial'; ctx.textAlign = 'left';
      ctx.fillText(`P${pl.p.index + 1}  ${pl.score}`, 34 + i * 250, 52);
    });
    ctx.fillStyle = '#fff'; ctx.font = '800 40px Arial'; ctx.textAlign = 'right';
    if (state === 'play') ctx.fillText(Math.ceil(timer), W - 30, 56);
    if (state === 'intro') bigText(ctx, STAGES[stage].name, W / 2, H / 2, 64, '#fff', '#235');
    if (state === 'between') bigText(ctx, "Time's up!", W / 2, H / 2, 80, '#ffd23a', '#7a3d00');
    view.end();
  }
  function drawTarget(tg) {
    ctx.save();
    if (tg.dead && tg.kind === 'balloon') {
      ctx.strokeStyle = tg.color; ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = tg.r * (1.2 + (1 - tg.deadT) * 1.5); ctx.beginPath(); ctx.moveTo(tg.x + Math.cos(a) * r * 0.6, tg.y + Math.sin(a) * r * 0.6); ctx.lineTo(tg.x + Math.cos(a) * r, tg.y + Math.sin(a) * r); ctx.stroke(); }
      ctx.restore(); return;
    }
    if (tg.kind === 'balloon') {
      ctx.strokeStyle = '#666'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tg.x, tg.y + tg.r); ctx.quadraticCurveTo(tg.x + 10, tg.y + tg.r + 30, tg.x, tg.y + tg.r + 60); ctx.stroke();
      ctx.fillStyle = tg.color; ctx.beginPath(); ctx.ellipse(tg.x, tg.y, tg.r * 0.85, tg.r, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(tg.x - tg.r * 0.3, tg.y - tg.r * 0.4, tg.r * 0.18, tg.r * 0.3, -0.5, 0, 7); ctx.fill();
    } else if (tg.kind === 'duck') {
      if (tg.dead) { ctx.translate(tg.x, tg.y); ctx.rotate(tg.t * 10); ctx.translate(-tg.x, -tg.y); }
      drawDuck(ctx, tg.x, tg.y, 26, tg.dead ? 0 : tg.t, Math.sign(tg.vx) || 1, tg.color);
    } else {
      ctx.translate(tg.x, tg.y); ctx.rotate(tg.rot);
      ctx.fillStyle = tg.color; ctx.fillRect(-20, -28, 40, 56);
      ctx.fillStyle = '#ddd'; ctx.fillRect(-20, -28, 40, 6); ctx.fillRect(-20, 22, 40, 6);
      ctx.fillStyle = '#fff'; ctx.font = '800 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('WOO', 0, 5);
    }
    ctx.restore();
  }

  function finish() {
    state = 'done';
    const rows = players.map((pl) => ({ name: api.getMe(pl.p.index).name, color: pl.p.color, me: api.getMe(pl.p.index), score: pl.score + (pl.shots ? ` <span style="font-size:.7em;color:#999">(${Math.round(pl.hits / pl.shots * 100)}% hits)</span>` : ''), raw: pl.score })).sort((a, b) => b.raw - a.raw);
    resultsOverlay(api, '🦆 Duck Blaster Results', rows, { again: start });
  }

  function title() {
    state = 'title';
    ui = overlay(api, `<h1>Woo Play: Duck Blaster</h1>
      <p>Point at the screen with your remote. Press <b>B</b> (or A) to fire. Everyone plays at once!</p>
      <div class="pill" data-ui="go" style="min-width:30vw">Start</div>
      <p class="g-hint">3 stages · balloons, ducks, and cans that you keep in the air by shooting them again.<br>No real ducks were harmed. They are made of rectangles.</p>
      <div class="pill small" data-ui="quit">Woo Menu</div>`, {
      go: () => { ui.remove(); start(); },
      quit: () => api.exit(),
    });
    ui.style.background = 'rgba(255,255,255,.7)';
  }
  title();
  return { update(dt, t) { if (state === 'title' || state === 'done') { clock = t; draw(); return; } update(dt, t); }, resize: view.resize, destroy() {} };
}
