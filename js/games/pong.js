// Woo Pong — point up/down (or D-pad) to move your paddle. P1/P3 left, P2/P4 right, CPU fills in.
import { makeCanvas, overlay, bigText, resultsOverlay, vignette } from './common.js';

const W = 1280, H = 720, PH = 130, PW = 18, WIN = 7;

export function create(api) {
  const view = makeCanvas(api, W, H);
  const { ctx } = view;
  let paddles = [], ball = null, score = [0, 0], state = 'title', serveT = 0, shake = 0, trail = [], clock = 0, ui = null;

  function start() {
    const ps = api.active();
    paddles = [];
    ps.forEach((p, i) => {
      const side = i % 2, lane = Math.floor(i / 2);
      paddles.push({ p, side, x: side === 0 ? 50 + lane * 90 : W - 50 - lane * 90, y: H / 2, color: p.color, hits: 0 });
    });
    if (!paddles.some((q) => q.side === 1)) paddles.push({ cpu: true, side: 1, x: W - 50, y: H / 2, color: '#bbbbbb', hits: 0 });
    score = [0, 0]; state = 'play'; serve(Math.random() < 0.5 ? 0 : 1);
    api.showCursors(false); api.setRemoteMode('pointer'); api.music('shoot');
  }
  function serve(toward) {
    ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, toward }; serveT = 1.2; trail = [];
  }

  function update(dt, t) {
    clock = t;
    if (state === 'play') {
      for (const q of paddles) {
        if (q.cpu) { const target = ball.vx > 0 ? ball.y : H / 2; q.y += Math.max(-430 * dt, Math.min(430 * dt, target - q.y)); }
        else {
          const dy = q.p.dirY();
          if (dy) q.y += dy * 700 * dt;
          else { const c = view.toVirtual(q.p.cursor); q.y += (c.y - q.y) * Math.min(1, dt * 14); }
        }
        q.y = Math.max(PH / 2 + 10, Math.min(H - PH / 2 - 10, q.y));
      }
      if (serveT > 0) {
        serveT -= dt;
        if (serveT <= 0) { const a = (Math.random() - 0.5) * 0.8; const sp = 520; ball.vx = Math.cos(a) * sp * (ball.toward ? 1 : -1); ball.vy = Math.sin(a) * sp; }
      } else {
        const steps = 3;
        for (let s = 0; s < steps; s++) {
          const h = dt / steps;
          ball.x += ball.vx * h; ball.y += ball.vy * h;
          if (ball.y < 14 && ball.vy < 0) { ball.vy = -ball.vy; api.audio.play('bounce'); }
          if (ball.y > H - 14 && ball.vy > 0) { ball.vy = -ball.vy; api.audio.play('bounce'); }
          for (const q of paddles) {
            const dir = q.side === 0 ? -1 : 1;
            if (Math.sign(ball.vx) !== dir) continue;
            if (Math.abs(ball.x - q.x) < PW / 2 + 12 && Math.abs(ball.y - q.y) < PH / 2 + 12) {
              const off = (ball.y - q.y) / (PH / 2);
              const sp = Math.min(1500, Math.hypot(ball.vx, ball.vy) * 1.07);
              const a = off * 1.0;
              ball.vx = -dir * Math.cos(a) * sp; ball.vy = Math.sin(a) * sp;
              ball.x = q.x - dir * (PW / 2 + 13);
              q.hits++; shake = 0.15; api.audio.play('hit');
              if (q.p) api.rumble(q.p.index, 60);
            }
          }
        }
        trail.push({ x: ball.x, y: ball.y }); if (trail.length > 14) trail.shift();
        if (ball.x < -30 || ball.x > W + 30) {
          const scorer = ball.x < 0 ? 1 : 0;
          score[scorer]++; api.audio.play(score[scorer] >= WIN ? 'win' : 'coin');
          if (score[scorer] >= WIN) { state = 'over'; finish(scorer); }
          else serve(scorer === 0 ? 1 : 0);
        }
      }
    }
    if (shake > 0) shake -= dt;
    draw();
  }

  function draw() {
    view.begin('#000');
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0d1030'); g.addColorStop(1, '#251040');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 4; ctx.setLineDash([16, 18]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '900 120px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillText(score[0], W / 2 - 160, 150); ctx.fillText(score[1], W / 2 + 160, 150);
    for (const q of paddles) {
      ctx.shadowColor = q.color; ctx.shadowBlur = 25; ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.roundRect(q.x - PW / 2, q.y - PH / 2, PW, PH, 9); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.font = '800 16px Arial'; ctx.fillText(q.cpu ? 'CPU' : 'P' + (q.p.index + 1), q.x, q.y - PH / 2 - 10);
    }
    if (ball) {
      trail.forEach((p, i) => { ctx.fillStyle = `rgba(255,255,255,${i / trail.length * 0.35})`; ctx.beginPath(); ctx.arc(p.x, p.y, 4 + i * 0.6, 0, 7); ctx.fill(); });
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, 13, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      if (serveT > 0 && state === 'play') bigText(ctx, 'Ready…', W / 2, H / 2 + 80, 50, '#fff', '#203');
    }
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    vignette(ctx, W, H, 0.35);
    view.end();
  }

  function finish(winner) {
    const rows = paddles.filter((q) => q.p).map((q) => ({ name: api.getMe(q.p.index).name, color: q.color, me: api.getMe(q.p.index), score: `${q.side === winner ? '🏆 ' : ''}${q.hits} hits` }));
    resultsOverlay(api, winner === 0 ? 'Left side wins!' : (paddles.some((q) => q.cpu) ? 'The CPU wins. Shameful.' : 'Right side wins!'), rows, { again: start, scoreLabel: 'Result' });
  }

  ui = overlay(api, `<h1>Woo Pong</h1><p>${api.active().length > 1 ? 'P1 & P3 on the left, P2 & P4 on the right.' : 'You vs. a very focused CPU.'} First to ${WIN}.</p>
    <div class="pill" data-ui="go">Serve!</div>
    <p class="g-hint">Point up/down at the TV to move your paddle (or use the D-pad).</p>
    <div class="pill small" data-ui="quit">Woo Menu</div>`, { go: () => { ui.remove(); start(); }, quit: () => api.exit() });
  ui.style.background = 'rgba(20,16,50,.6)'; ui.style.color = '#fff'; ui.querySelector('h1').style.color = '#fff';
  return { update, resize: view.resize, destroy() {} };
}
