// Woo Fishing — point your lure into the pond, keep still, and yank the remote UP (or press B) when a fish bites.
import { makeCanvas, overlay, bigText, resultsOverlay, vignette } from './common.js';

const W = 1280, H = 720;
const POND = { x: W / 2, y: H / 2 + 20, rx: 560, ry: 290 };
const FISH = [
  { name: 'Minnow', size: 0.6, pts: 5, color: '#8fa7b8', w: 4 },
  { name: 'Perch', size: 0.9, pts: 10, color: '#7d9a4a', w: 4 },
  { name: 'Trout', size: 1.15, pts: 20, color: '#c08a6a', w: 3 },
  { name: 'Big Bass', size: 1.5, pts: 40, color: '#4e6b3a', w: 2 },
  { name: 'Grumpy Pike', size: 1.9, pts: 70, color: '#5b6b72', w: 1 },
  { name: 'Golden Woofish', size: 1.2, pts: 150, color: '#ffd23a', w: 0.35 },
  { name: 'Old Boot', size: 0.9, pts: 1, color: '#5a3a1a', w: 0.6, boot: true },
];
const inPond = (x, y, m = 0) => ((x - POND.x) / (POND.rx - m)) ** 2 + ((y - POND.y) / (POND.ry - m)) ** 2 < 1;
function pickFish() {
  const total = FISH.reduce((s, f) => s + f.w, 0);
  let r = Math.random() * total;
  for (const f of FISH) { r -= f.w; if (r <= 0) return f; }
  return FISH[0];
}

export function create(api) {
  const view = makeCanvas(api, W, H);
  const { ctx } = view;
  let state = 'title', timer = 90, clock = 0;
  let fish = [], anglers = [], pops = [], ripples = [];
  let ui = null;

  function newFish() {
    let x, y;
    do { x = POND.x + (Math.random() - 0.5) * POND.rx * 2; y = POND.y + (Math.random() - 0.5) * POND.ry * 2; } while (!inPond(x, y, 40));
    const type = pickFish();
    return { type, x, y, a: Math.random() * 6.28, sp: 30 + Math.random() * 30, turn: 0, state: 'wander', target: null, t: 0, scared: 0 };
  }
  function start() {
    fish = Array.from({ length: 14 }, newFish);
    anglers = api.active().map((p) => ({ p, score: 0, catches: [], lx: 0, ly: 0, still: 0, prev: null, hooked: null, bob: 0, msg: '', msgT: 0, flying: null }));
    timer = 90; state = 'play';
    api.showCursors(false); api.setRemoteMode('pointer'); api.music('fish');
  }

  function update(dt, t) {
    clock = t;
    if (state !== 'play') { draw(); return; }
    timer -= dt;
    if (timer <= 0) { state = 'done'; api.audio.play('bell'); setTimeout(finish, 1200); }
    for (const an of anglers) {
      const c = view.toVirtual(an.p.cursor);
      const moved = an.prev ? Math.hypot(c.x - an.prev.x, c.y - an.prev.y) : 0;
      an.prev = c;
      an.lx = c.x; an.ly = c.y;
      an.wet = inPond(c.x, c.y, 10);
      an.still = moved < 2.5 ? an.still + dt : 0;
      if (an.msgT > 0) an.msgT -= dt;
      const pull = an.p.takeSwing() || an.p.pressed(api.BTN.B) || an.p.pressed(api.BTN.A) || an.p.pitch > 0.75 && an.p.hasMotion && an.lastPitch <= 0.75;
      an.lastPitch = an.p.pitch;
      const f = an.hooked;
      if (pull) {
        if (f && f.state === 'bite') { catchFish(an, f); }
        else if (f && f.state === 'nibble') { f.state = 'flee'; f.scared = 2; an.hooked = null; an.msg = 'Too early!'; an.msgT = 1.2; api.audio.play('splash'); }
        else if (an.wet) { ripples.push({ x: c.x, y: c.y, t: 0.8 }); api.audio.play('reel'); }
      }
      if (f && Math.hypot(f.x - an.lx, f.y - an.ly) > 40 && f.state !== 'approach') { f.state = 'flee'; f.scared = 1.5; an.hooked = null; }
    }
    for (const f of fish) stepFish(f, dt);
    fish = fish.filter((f) => !f.gone);
    while (fish.length < 14) fish.push(newFish());
    for (const p of pops) { p.t -= dt; p.y -= 30 * dt; }
    pops = pops.filter((p) => p.t > 0);
    for (const r of ripples) r.t -= dt;
    ripples = ripples.filter((r) => r.t > 0);
    for (const an of anglers) if (an.flying) { an.flying.t += dt; if (an.flying.t > 1.4) an.flying = null; }
    draw();
  }

  function stepFish(f, dt) {
    f.t += dt;
    if (f.state === 'wander') {
      f.turn += (Math.random() - 0.5) * dt * 3; f.turn *= 0.98;
      f.a += f.turn * dt;
      // notice a still lure
      for (const an of anglers) {
        if (an.hooked || !an.wet || an.still < 0.6) continue;
        const d = Math.hypot(an.lx - f.x, an.ly - f.y);
        if (d < 190 && Math.random() < dt * 1.2) { f.state = 'approach'; f.target = an; an.hooked = f; break; }
      }
    } else if (f.state === 'approach') {
      const an = f.target;
      if (an.still < 0.3) { f.state = 'flee'; f.scared = 1.5; an.hooked = null; }
      const want = Math.atan2(an.ly - f.y, an.lx - f.x);
      let da = want - f.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      f.a += da * Math.min(1, dt * 3);
      if (Math.hypot(an.lx - f.x, an.ly - f.y) < 22 * f.type.size + 6) { f.state = 'nibble'; f.t = 0; f.nibbles = 1 + Math.floor(Math.random() * 3); }
    } else if (f.state === 'nibble') {
      const an = f.target;
      if (Math.floor(f.t / 0.6) !== Math.floor((f.t - dt) / 0.6)) { an.bob = 0.25; api.audio.play('bump'); }
      if (f.t > f.nibbles * 0.6 + 0.3) { f.state = 'bite'; f.t = 0; an.bob = 0.6; api.audio.play('bite'); api.rumble(an.p.index, 450); }
    } else if (f.state === 'bite') {
      if (f.t > 0.75) { f.state = 'flee'; f.scared = 2; if (f.target) { f.target.hooked = null; f.target.msg = 'It got away…'; f.target.msgT = 1.2; } }
    } else if (f.state === 'flee') {
      f.scared -= dt;
      if (f.target) { f.a = Math.atan2(f.y - f.target.ly, f.x - f.target.lx); }
      if (f.scared <= 0) { f.state = 'wander'; f.target = null; }
    }
    const sp = f.state === 'flee' ? 160 : f.state === 'nibble' || f.state === 'bite' ? 0 : f.state === 'approach' ? 45 : f.sp;
    f.x += Math.cos(f.a) * sp * dt; f.y += Math.sin(f.a) * sp * dt;
    if (!inPond(f.x, f.y, 35)) { f.a = Math.atan2(POND.y - f.y, POND.x - f.x) + (Math.random() - 0.5); f.x += Math.cos(f.a) * 3; f.y += Math.sin(f.a) * 3; }
  }

  function catchFish(an, f) {
    f.gone = true; an.hooked = null;
    an.score += f.type.pts; an.catches.push(f.type.name);
    an.flying = { type: f.type, t: 0, x: f.x, y: f.y };
    pops.push({ x: f.x, y: f.y - 40, text: `${f.type.name} +${f.type.pts}`, color: an.p.color, t: 1.6 });
    api.audio.play(f.type.boot ? 'aww' : f.type.pts >= 70 ? 'cheer' : 'coin');
    api.audio.play('splash');
    api.rumble(an.p.index, 200);
  }

  function drawFish(x, y, a, type, alpha = 0.45, shadow = true) {
    const s = type.size * 22;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    if (type.boot) {
      ctx.fillStyle = shadow ? `rgba(20,30,40,${alpha})` : type.color;
      ctx.fillRect(-s, -s * 0.4, s * 1.3, s * 0.8); ctx.fillRect(0, -s * 0.4, s * 0.5, s * 1.2);
      ctx.restore(); return;
    }
    ctx.fillStyle = shadow ? `rgba(10,30,50,${alpha})` : type.color;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.42, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.85, 0); ctx.lineTo(-s * 1.5, -s * 0.45); ctx.lineTo(-s * 1.5, s * 0.45); ctx.fill();
    if (!shadow) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.1, s * 0.12, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(s * 0.58, -s * 0.1, s * 0.06, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function draw() {
    view.begin('#000');
    ctx.fillStyle = '#68b84a'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = i % 2 ? '#5aa83f' : '#79c95a'; ctx.fillRect((i * 173) % W, (i * 97) % H, 6, 14); }
    // pond
    ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.ellipse(POND.x, POND.y, POND.rx + 18, POND.ry + 18, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(POND.x, POND.y, 40, POND.x, POND.y, POND.rx);
    g.addColorStop(0, '#2a7fbf'); g.addColorStop(1, '#3db7e6');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, 7); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const y = POND.y - POND.ry + i * 70 + Math.sin(clock + i) * 6; ctx.beginPath(); ctx.moveTo(POND.x - POND.rx, y); ctx.bezierCurveTo(POND.x - 200, y - 15, POND.x + 200, y + 15, POND.x + POND.rx, y); ctx.stroke(); }
    // caustics shimmer
    ctx.globalAlpha = 0.12; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const cx = POND.x + Math.cos(i * 2.4) * POND.rx * 0.8, cy = POND.y + Math.sin(i * 1.7) * POND.ry * 0.8; ctx.beginPath(); ctx.ellipse(cx + Math.sin(clock + i) * 12, cy, 40 + Math.sin(clock * 1.3 + i) * 12, 14, i, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const f of fish) drawFish(f.x, f.y, f.a, f.type, f.type.pts >= 150 ? 0.7 : 0.4);
    // lily pads
    ctx.fillStyle = '#3d9a4a';
    for (const [x, y, r] of [[260, 260, 34], [1000, 470, 40], [880, 230, 28], [370, 520, 30]]) { ctx.beginPath(); ctx.arc(x, y, r, 0.3, Math.PI * 2); ctx.lineTo(x, y); ctx.fill(); }
    for (const r of ripples) { ctx.strokeStyle = `rgba(255,255,255,${r.t})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r.x, r.y, (1 - r.t) * 60 + 5, (1 - r.t) * 30 + 3, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
    // lures
    for (const an of anglers) {
      const x = an.lx, y = an.ly;
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (an.p.index - 1.5) * 200, H + 20); ctx.stroke();
      if (an.bob > 0) an.bob -= 1 / 60;
      const dip = an.hooked && an.hooked.state === 'bite' ? 1 : an.bob > 0 ? an.bob : 0;
      if (an.wet) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 14 + Math.sin(clock * 4) * 2, 6, 0, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y + dip * 8, 10 - dip * 4, 0, 7); ctx.fill();
      ctx.fillStyle = an.p.color; ctx.beginPath(); ctx.arc(x, y + dip * 8, 10 - dip * 4, Math.PI, 0); ctx.fill();
      ctx.fillStyle = an.p.color; ctx.font = '800 16px Arial'; ctx.textAlign = 'center'; ctx.fillText('P' + (an.p.index + 1), x, y - 18);
      if (an.hooked && an.hooked.state === 'bite') bigText(ctx, 'NOW!', x, y - 50, 40, '#fff', '#e33');
      if (an.msgT > 0) bigText(ctx, an.msg, x, y - 50, 28, '#fff', '#555');
      if (an.flying) {
        const k = an.flying.t / 1.4;
        const fx = an.flying.x + (an.p.index - 1.5) * 200 * k, fy = an.flying.y - Math.sin(k * Math.PI) * 220 + k * 300;
        drawFish(fx, fy, -1.2 + k * 3, an.flying.type, 1, false);
      }
    }
    for (const p of pops) bigText(ctx, p.text, p.x, p.y, 30, '#fff', p.color);
    vignette(ctx, W, H, 0.3);
    anglers.forEach((an, i) => {
      ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(20 + i * 250, 16, 230, 50);
      ctx.fillStyle = an.p.color; ctx.font = '800 26px Arial'; ctx.textAlign = 'left';
      ctx.fillText(`P${an.p.index + 1}  ${an.score} pts`, 34 + i * 250, 51);
    });
    if (state === 'play' || state === 'done') { ctx.fillStyle = '#fff'; ctx.font = '800 40px Arial'; ctx.textAlign = 'right'; ctx.fillText(`⏱ ${Math.max(0, Math.ceil(timer))}`, W - 30, 56); }
    view.end();
  }

  function finish() {
    const rows = anglers.map((an) => ({ name: api.getMe(an.p.index).name, color: an.p.color, me: api.getMe(an.p.index), score: `${an.score} <span style="font-size:.7em;color:#999">(${an.catches.length} catches)</span>`, raw: an.score })).sort((a, b) => b.raw - a.raw);
    resultsOverlay(api, '🎣 Fishing Results', rows, { again: start });
  }

  ui = overlay(api, `<h1>Woo Fishing</h1>
    <p>Point your lure into the pond and hold it <b>still</b>. Fish nibble a few times — wait! —<br>when it really bites (<b>NOW!</b> + rumble) yank the remote <b>upward</b> (or press B).</p>
    <div class="pill" data-ui="go" style="min-width:30vw">Cast off!</div>
    <p class="g-hint">90 seconds · everyone fishes at once · watch out for the Golden Woofish</p>
    <div class="pill small" data-ui="quit">Woo Menu</div>`, {
    go: () => { ui.remove(); start(); },
    quit: () => api.exit(),
  });
  ui.style.background = 'rgba(255,255,255,.7)';
  fish = Array.from({ length: 14 }, newFish);
  return { update(dt, t) { if (state === 'title') { clock = t; for (const f of fish) stepFish(f, dt); draw(); return; } update(dt, t); }, resize: view.resize, destroy() {} };
}
