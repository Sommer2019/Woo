// Woo Sports: Tennis. Players run on their own; you just swing.
// Swing early = pull it one way, late = push it the other. Swing hard = fast ball.
import { buildMe3D } from '../me.js';
import { bigText, overlay } from './common.js';

const HL = 11.9, HW = 4.12, NET_H = 0.95, G = 9.8;
const PT = ['0', '15', '30', '40'];

export function create(env) {
  const { api, THREE, renderer, hctx, hud, root } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd3ff);
  scene.fog = new THREE.Fog(0x8fd3ff, 50, 120);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x557755, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-8, 20, -6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 16, bottom: -16 });
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

  // court
  const courtTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#3c8d5a'; g.fillRect(0, 0, 512, 1024);
    const sx = 512 / 14, sz = 1024 / 28; // 14m x 28m texture
    const X = (x) => 256 + x * sx, Z = (z) => 512 - z * sz;
    g.fillStyle = '#2f6fb0'; g.fillRect(X(-5.5), Z(HL), 11 * sx, 2 * HL * sz);
    g.strokeStyle = '#fff'; g.lineWidth = 4;
    g.strokeRect(X(-HW), Z(HL), 2 * HW * sx, 2 * HL * sz);
    g.strokeRect(X(-5.48), Z(HL), 10.96 * sx, 2 * HL * sz);
    g.beginPath(); g.moveTo(X(-HW), Z(6.4)); g.lineTo(X(HW), Z(6.4)); g.moveTo(X(-HW), Z(-6.4)); g.lineTo(X(HW), Z(-6.4));
    g.moveTo(X(0), Z(6.4)); g.lineTo(X(0), Z(-6.4)); g.moveTo(X(0), Z(HL)); g.lineTo(X(0), Z(HL - 0.3)); g.moveTo(X(0), Z(-HL)); g.lineTo(X(0), Z(-HL + 0.3)); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const court = new THREE.Mesh(new THREE.PlaneGeometry(14, 28), new THREE.MeshLambertMaterial({ map: courtTex }));
  court.rotation.x = -Math.PI / 2; court.receiveShadow = true; scene.add(court);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0x5cbf5a }));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.01; scene.add(grass);
  const netTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.strokeStyle = 'rgba(30,30,30,.9)'; g.lineWidth = 2; for (let i = 0; i <= 64; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 3); return t; })();
  const net = new THREE.Mesh(new THREE.PlaneGeometry(12, NET_H), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide }));
  net.position.set(0, NET_H / 2, 0); scene.add(net);
  const band = new THREE.Mesh(new THREE.BoxGeometry(12, 0.06, 0.04), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  band.position.set(0, NET_H, 0); scene.add(band);
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1), new THREE.MeshLambertMaterial({ color: 0x333333 })); post.position.set(s * 6, 0.55, 0); scene.add(post); }
  // crowd stands (blocks of colors)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 40; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.4), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.6, 0.6) }));
      b.position.set(s * (10 + (i % 3) * 1.2), 0.35 + (i % 3) * 0.7, -14 + Math.floor(i / 3) * 2.2); scene.add(b);
    }
  }

  // ball
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshLambertMaterial({ color: 0xdff23a, emissive: 0x333300 }));
  ballMesh.castShadow = true; scene.add(ballMesh);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  const ball = { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, live: false, bounces: 0, hitter: 0, serve: false, bounceSide: 0 };

  // players
  const humans = api.active().slice(0, 2);
  if (api.active().length > 2) api.toast('Tennis is 1-on-1: Players 1 & 2 play');
  const mkRacket = () => {
    const r = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    handle.position.y = -0.15; r.add(handle);
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 20), new THREE.MeshLambertMaterial({ color: 0xff3355 }));
    head.position.y = -0.45; r.add(head);
    const strings = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
    strings.position.y = -0.45; r.add(strings);
    return r;
  };
  const sides = [-1, 1].map((side, i) => {
    const human = humans[i] || null;
    const me = human ? api.getMe(human.index) : { name: 'CPU Carl', skin: 2, hair: 5, hairStyle: 0, eyes: 0, mouth: 1, shirt: 6, glasses: true };
    const fig = buildMe3D(THREE, me);
    const racket = mkRacket(); racket.position.y = -0.5;
    fig.userData.arms[1].add(racket);
    scene.add(fig);
    return { side, human, me, fig, x: 0, z: side * 12.3, tx: 0, tz: side * 12.3, swingT: 0, swingDir: 1, cpuHitAt: 0.6, color: human ? human.color : '#888', points: 0, games: 0 };
  });

  let state = 'menu', server = 0, faults = 0, msg = '', msgT = 0, waitT = 0, gamesToWin = 2;

  function startPoint() {
    const s = sides[server];
    const deuceSide = (sides[0].points + sides[1].points) % 2 === 0 ? 1 : -1;
    for (const p of sides) { p.x = p === s ? deuceSide * 0.8 * -p.side : -deuceSide * 2 * -p.side; p.z = p.side * 12.3; p.tx = p.x; p.tz = p.z; }
    ball.live = false; ball.serve = true; ball.bounces = 0;
    state = 'serve'; waitT = 1.2 + Math.random();
    api.setRemoteMode('pointer'); api.showCursors(false);
  }

  function hitBall(p, power, timing) {
    // timing: -1 (late) .. 1 (early)
    const opp = -p.side;
    let tx = Math.max(-3.7, Math.min(3.7, -timing * 3.4 * opp + (Math.random() - 0.5) * 0.8));
    let tz = opp * (7.5 + Math.random() * 3.6);
    if (!p.human && Math.random() < 0.07) tx *= 1.6; // CPU sometimes misses wide
    let speed = 14 + power * 14;
    launch(p, tx, tz, speed, 1.15);
    p.swingT = 0.35;
    api.audio.play('hit');
    if (p.human) api.rumble(p.human.index, 70);
  }
  function launch(p, tx, tz, speed, clearance) {
    ball.hitter = p.side; ball.bounces = 0; ball.live = true;
    const dx = tx - ball.x, dz = tz - ball.z, dist = Math.hypot(dx, dz);
    for (let k = 0; k < 8; k++) {
      const t = dist / speed;
      const vy = (0 - ball.y + 0.5 * G * t * t) / t;
      // height at the net
      const tn = Math.abs(ball.z) / Math.abs(dz / t);
      const hn = ball.y + vy * tn - 0.5 * G * tn * tn;
      if (hn > clearance || k === 7) { ball.vx = dx / t; ball.vz = dz / t; ball.vy = vy; return; }
      speed *= 0.88;
    }
  }

  function serve(p, power) {
    const deuceSide = (sides[0].points + sides[1].points) % 2 === 0 ? 1 : -1;
    const opp = -p.side;
    const tx = -deuceSide * -p.side * (1.2 + Math.random() * 1.8);
    const tz = opp * (4 + Math.random() * 2);
    const fault = !p.human && Math.random() < 0.1;
    ball.x = p.x + 0.3 * -p.side; ball.y = 2.6; ball.z = p.z;
    launch(p, fault ? tx * 2.4 : tx, tz, 20 + power * 10, 1.08);
    ball.serve = true;
    p.swingT = 0.35;
    api.audio.play('hit');
    state = 'rally';
  }

  function pointTo(sideIdx, why) {
    if (state !== 'rally' && state !== 'serve') return;
    state = 'point';
    const w = sides[sideIdx], l = sides[1 - sideIdx];
    w.points++;
    msg = why; msgT = 2; waitT = 2.2;
    api.audio.play(w.human ? 'cheer' : 'aww');
    if (w.points >= 4 && w.points - l.points >= 2) {
      w.games++; w.points = 0; l.points = 0; server = 1 - server;
      msg = `Game ${w.me.name}!`;
      if (w.games >= gamesToWin) { state = 'over'; setTimeout(results, 2000); }
    }
  }
  function scoreText(a, b) {
    if (a.points >= 3 && b.points >= 3) { if (a.points === b.points) return ['Deuce', '']; return a.points > b.points ? ['Adv', ''] : ['', 'Adv']; }
    return [PT[Math.min(3, a.points)], PT[Math.min(3, b.points)]];
  }

  function predictLanding(p) {
    // simulate forward to find where the ball is when it reaches the player's depth
    let x = ball.x, y = ball.y, z = ball.z, vx = ball.vx, vy = ball.vy, vz = ball.vz, b = ball.bounces;
    let bounceZ = null;
    for (let i = 0; i < 300; i++) {
      const h = 0.01;
      vy -= G * h; x += vx * h; y += vy * h; z += vz * h;
      if (y < 0.1) { y = 0.1; vy = -vy * 0.72; vx *= 0.9; vz *= 0.9; b++; if (bounceZ === null) bounceZ = z; }
      if (b >= 1 && y < 1.3 && vy < 0 && Math.sign(z) === p.side) return { x, z, bounceZ };
      if (Math.abs(z) > 14) return { x, z, bounceZ };
    }
    return { x, z, bounceZ };
  }

  function updatePlayers(dt) {
    for (const p of sides) {
      const incoming = ball.live && ball.vz * p.side > 0 && Math.sign(ball.z) * p.side > -1;
      if (state === 'rally' && incoming) {
        const pr = predictLanding(p);
        p.tx = pr.x + 0.6 * p.side * -1 * (pr.x > p.x ? -1 : 1) * 0.5;
        p.tz = p.side * Math.max(6, Math.min(13, Math.abs(pr.z) + 0.3));
      } else if (state === 'rally') { p.tx = p.tx * 0.98; p.tz = p.side * 11.5; }
      const sp = 7.5 * dt;
      p.x += Math.max(-sp, Math.min(sp, p.tx - p.x));
      p.z += Math.max(-sp, Math.min(sp, p.tz - p.z));
      p.fig.position.set(p.x, 0, p.z);
      p.fig.rotation.y = p.side > 0 ? Math.PI : 0;
      const arm = p.fig.userData.arms[1];
      if (p.swingT > 0) {
        p.swingT -= dt;
        const k = 1 - p.swingT / 0.35;
        arm.rotation.set(-1.4, 0, 0); arm.rotateZ((k - 0.5) * 3.2 * p.swingDir);
      } else { arm.rotation.set(-0.9, 0, 0.5); }
      const legs = p.fig.userData.legs;
      const moving = Math.abs(p.tx - p.x) + Math.abs(p.tz - p.z) > 0.1;
      legs[0].rotation.x = moving ? Math.sin(performance.now() / 70) * 0.6 : 0; legs[1].rotation.x = -legs[0].rotation.x;
    }
  }

  function canHit(p) {
    if (!ball.live || Math.sign(ball.z) !== p.side || ball.vz * p.side <= 0) return null;
    if (ball.hitter === p.side) return null;
    const d = (ball.z - p.z) * -p.side;
    if (d < -1.0 || d > 2.4) return null;
    if (Math.abs(ball.x - p.x) > 2.0 || ball.y > 2.8) return null;
    if (ball.bounces === 0 && Math.abs(ball.z) > 4.5) return null; // no volleys from the back
    return d;
  }

  function update(dt) {
    if (state === 'menu') { render(); return; }
    if (msgT > 0) msgT -= dt;
    // swings
    for (const p of sides) {
      if (!p.human) continue;
      const sw = p.human.takeSwing();
      if (!sw) continue;
      p.swingDir = sw.dir || (ball.x > p.x ? 1 : -1) * -p.side;
      if (state === 'serve' && sides[server] === p) { serve(p, sw.power); continue; }
      const d = canHit(p);
      if (d !== null && state === 'rally') hitBall(p, sw.power, Math.max(-1, Math.min(1, (d - 0.7) / 1.3)));
      else { p.swingT = 0.35; api.audio.play('whoosh'); }
    }
    if (state === 'serve') {
      const s = sides[server];
      ball.x = s.x + 0.3 * -s.side; ball.z = s.z - s.side * 0.3; ball.y = 1.2 + Math.abs(Math.sin(performance.now() / 400)) * 1.2;
      if (!s.human) { waitT -= dt; if (waitT <= 0) serve(s, 0.4 + Math.random() * 0.4); }
    }
    if (state === 'point') { waitT -= dt; if (waitT <= 0) startPoint(); }
    if (state === 'rally' || state === 'point') stepBall(dt);
    // CPU hits
    if (state === 'rally') for (const p of sides) {
      if (p.human) continue;
      const d = canHit(p);
      if (d !== null && d < p.cpuHitAt) { hitBall(p, 0.35 + Math.random() * 0.45, (Math.random() - 0.5) * 1.6); p.cpuHitAt = 0.1 + Math.random() * 1.2; }
    }
    updatePlayers(dt);
    render();
  }

  function stepBall(dt) {
    const sub = 3;
    for (let i = 0; i < sub; i++) {
      const h = dt / sub;
      const pz = ball.z;
      ball.vy -= G * h; ball.x += ball.vx * h; ball.y += ball.vy * h; ball.z += ball.vz * h;
      // net
      if (Math.sign(pz) !== Math.sign(ball.z) && ball.y < NET_H && Math.abs(ball.x) < 6 && ball.live) {
        ball.z = pz; ball.vz *= -0.15; ball.vx *= 0.3; api.audio.play('bump');
        if (state === 'rally') pointTo(ball.hitter === sides[0].side ? 1 : 0, 'Net!');
      }
      if (ball.y < 0.1) {
        ball.y = 0.1; ball.vy = -ball.vy * 0.72; ball.vx *= 0.88; ball.vz *= 0.88;
        api.audio.play('bounce');
        if (state !== 'rally') continue;
        const side = Math.sign(ball.z);
        const hitterIdx = ball.hitter === sides[0].side ? 0 : 1;
        if (ball.bounces === 0) {
          const out = Math.abs(ball.x) > HW + 0.05 || Math.abs(ball.z) > HL + 0.05 || side === ball.hitter;
          const serveOut = ball.serve && (Math.abs(ball.z) > 6.45 || Math.abs(ball.x) > HW);
          if (serveOut && !out) {
            faults++;
            if (faults >= 2) { faults = 0; pointTo(1 - hitterIdx, 'Double fault!'); }
            else { msg = 'Fault!'; msgT = 1.2; state = 'serve'; ball.live = false; waitT = 1.4; }
            continue;
          }
          if (out) { faults = 0; pointTo(1 - hitterIdx, 'Out!'); continue; }
          ball.serve = false; faults = 0;
        } else if (ball.bounces >= 1) {
          const recvIdx = side === sides[0].side ? 0 : 1;
          pointTo(1 - recvIdx, sides[1 - recvIdx].human ? 'Nice shot!' : 'Too slow!');
        }
        ball.bounces++;
      }
      if (Math.abs(ball.z) > 18 && state === 'rally') {
        const side = Math.sign(ball.z);
        const recvIdx = side === sides[0].side ? 0 : 1;
        pointTo(1 - recvIdx, 'Winner!');
      }
    }
  }

  function render() {
    const near = sides[0];
    camera.position.set(near.x * 0.35, 4.6, -20.5);
    camera.lookAt(near.x * 0.15, 0.5, 2);
    camera.aspect = root.clientWidth / root.clientHeight; camera.updateProjectionMatrix();
    ballMesh.position.set(ball.x, ball.y, ball.z);
    shadow.position.set(ball.x, 0.01, ball.z);
    renderer.setViewport(0, 0, root.clientWidth, root.clientHeight);
    renderer.render(scene, camera);
    const W = hud.width, H = hud.height;
    hctx.clearRect(0, 0, W, H);
    if (state === 'menu') return;
    const [a, b] = scoreText(sides[0], sides[1]);
    hctx.fillStyle = 'rgba(255,255,255,.9)'; hctx.fillRect(20, 16, 360, 96);
    hctx.font = '800 26px Arial'; hctx.textAlign = 'left';
    sides.forEach((p, i) => {
      hctx.fillStyle = p.color; hctx.fillText((server === i ? '● ' : '  ') + p.me.name.slice(0, 12), 30, 52 + i * 40);
      hctx.fillStyle = '#333'; hctx.fillText(String(p.games), 260, 52 + i * 40); hctx.fillText(i === 0 ? a : b, 300, 52 + i * 40);
    });
    if (msgT > 0) bigText(hctx, msg, W / 2, H * 0.35, H * 0.09, '#fff', '#235');
    if (state === 'serve' && sides[server].human) bigText(hctx, 'Swing to serve!', W / 2, H - 50, H * 0.05, '#fff', '#235');
  }

  function results() {
    const rows = sides.map((p) => ({ name: p.me.name, color: p.color, me: p.me, score: p.games })).sort((x, y) => y.score - x.score);
    import('./common.js').then(({ resultsOverlay }) => {
      const o = resultsOverlay(api, `🎾 ${rows[0].name} wins!`, rows, { again: () => begin(gamesToWin), scoreLabel: 'Games' });
      const back = document.createElement('div'); back.className = 'pill small'; back.textContent = 'Other Sports'; back.dataset.ui = 'x';
      o.querySelector('.g-row').appendChild(back);
      back.addEventListener('click', () => { o.remove(); env.back(); });
    });
  }
  function begin(n) {
    gamesToWin = n;
    for (const p of sides) { p.points = 0; p.games = 0; }
    server = 0; faults = 0;
    startPoint();
  }

  const o = overlay(api, `<h1>🎾 Tennis</h1><p>${humans.length > 1 ? `${humans.length} players: P1 near court vs P2 far court` : 'You vs. CPU Carl'}</p>
    <div class="g-row"><div class="pill" data-ui="n" data-n="1">1 Game</div><div class="pill" data-ui="n" data-n="2">First to 2 Games</div></div>
    <p class="g-hint">Your player runs by itself. Just swing the remote when the ball arrives.<br>Early swing = one side, late swing = the other. Keyboard: Space = swing.</p>`, {
    n: (el) => { o.remove(); begin(+el.dataset.n); },
  });
  o.style.background = 'rgba(255,255,255,.75)';
  for (const p of sides) { p.fig.position.set(p.x, 0, p.z); p.fig.rotation.y = p.side > 0 ? Math.PI : 0; }

  return { update, destroy() { scene.traverse((ob) => { if (ob.geometry) ob.geometry.dispose(); }); } };
}
