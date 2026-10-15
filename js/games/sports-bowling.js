// Woo Sports: Bowling. D-pad ←/→ move, hold A + ←/→ to aim, hold B and swing (release B) to throw.
// Twist the remote while throwing for a hook. Keyboard: Shift (hold) + Space to throw.
import { buildMe3D } from '../me.js';
import { bigText } from './common.js';

const LANE_W = 0.53, LANE_LEN = 18.3, BALL_R = 0.11, PIN_R = 0.065;

function scoreRolls(rolls, nFrames) {
  const out = []; let i = 0, total = 0;
  for (let f = 0; f < nFrames; f++) {
    if (i >= rolls.length) break;
    if (rolls[i] === 10) {
      if (rolls[i + 1] == null || rolls[i + 2] == null) { out.push(null); break; }
      total += 10 + rolls[i + 1] + rolls[i + 2]; out.push(total); i += 1;
    } else {
      if (rolls[i + 1] == null) { out.push(null); break; }
      if (rolls[i] + rolls[i + 1] === 10) {
        if (rolls[i + 2] == null) { out.push(null); break; }
        total += 10 + rolls[i + 2]; out.push(total);
      } else { total += rolls[i] + rolls[i + 1]; out.push(total); }
      i += 2;
    }
  }
  return out;
}
function marks(fr, tenth) {
  const out = [];
  if (!tenth) {
    if (fr[0] === 10) return 'X';
    out.push(fr[0] ? String(fr[0]) : '-');
    if (fr.length > 1) out.push(fr[0] + fr[1] === 10 ? '/' : (fr[1] ? String(fr[1]) : '-'));
    return out.join(' ');
  }
  let prev = null;
  for (const r of fr) {
    if (prev == null && r === 10) { out.push('X'); continue; }
    if (prev != null && prev + r === 10) { out.push('/'); prev = null; continue; }
    out.push(r ? String(r) : '-');
    prev = prev == null ? r : null;
  }
  return out.join(' ');
}

export function create(env) {
  const { api, THREE, renderer, hctx, hud, root } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b1f3a);
  scene.fog = new THREE.Fog(0x1b1f3a, 18, 40);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.2));
  const spot = new THREE.DirectionalLight(0xffffff, 1.6);
  spot.position.set(2, 8, 4); spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.camera.left = -3; spot.shadow.camera.right = 3; spot.shadow.camera.top = 22; spot.shadow.camera.bottom = -4;
  spot.target.position.set(0, 0, 9);
  scene.add(spot, spot.target);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);

  // lane
  const woodTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const g = c.getContext('2d');
    for (let i = 0; i < 16; i++) { g.fillStyle = `hsl(32, 55%, ${62 + (i % 3) * 5 + Math.random() * 4}%)`; g.fillRect(i * 16, 0, 16, 512); }
    g.fillStyle = 'rgba(80,40,10,.25)'; for (let i = 0; i < 16; i++) g.fillRect(i * 16, 0, 1, 512);
    g.fillStyle = '#7a3d12';
    for (let i = 0; i < 7; i++) { const x = 32 + i * 32; g.beginPath(); g.moveTo(x, 470); g.lineTo(x - 7, 490); g.lineTo(x + 7, 490); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const lane = new THREE.Mesh(new THREE.BoxGeometry(LANE_W * 2, 0.1, LANE_LEN + 4), new THREE.MeshPhongMaterial({ map: woodTex, shininess: 90 }));
  lane.position.set(0, -0.05, (LANE_LEN + 4) / 2 - 2); lane.receiveShadow = true; scene.add(lane);
  const gutterMat = new THREE.MeshLambertMaterial({ color: 0x555a66 });
  for (const s of [-1, 1]) {
    const gut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, LANE_LEN + 4, 12, 1, true, 0, Math.PI), gutterMat);
    gut.rotation.x = Math.PI / 2; gut.rotation.y = Math.PI; gut.position.set(s * (LANE_W + 0.12), 0.0, (LANE_LEN + 4) / 2 - 2);
    gut.material.side = THREE.DoubleSide; scene.add(gut);
    const side = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, LANE_LEN + 4), new THREE.MeshLambertMaterial({ color: 0x2a3a6a }));
    side.position.set(s * (LANE_W + 0.24 + 0.75), 0, (LANE_LEN + 4) / 2 - 2); scene.add(side);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.2), new THREE.MeshLambertMaterial({ color: 0x111122 }));
  back.position.set(0, 1, LANE_LEN + 1.8); scene.add(back);
  const signTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#ff4fa8'; g.font = '800 80px Arial'; g.textAlign = 'center'; g.fillText('WOO BOWL', 256, 95); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
  sign.position.set(0, 2.2, LANE_LEN + 1.65); sign.rotation.y = Math.PI; scene.add(sign);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0x2b2f55 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.12, 0); scene.add(floor);

  // pins
  const pinProfile = [[0, 0], [0.03, 0], [0.05, 0.05], [0.062, 0.12], [0.055, 0.2], [0.032, 0.27], [0.03, 0.31], [0.038, 0.35], [0.03, 0.38], [0, 0.385]].map(([x, y]) => new THREE.Vector2(x, y));
  const pinGeo = new THREE.LatheGeometry(pinProfile, 16);
  const pinMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 80 });
  const stripeGeo = new THREE.CylinderGeometry(0.0335, 0.033, 0.03, 16, 1, true);
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xe02a2a });
  const pins = [];
  for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) {
    const x = (i - r / 2) * 0.3048, z = LANE_LEN + r * 0.264;
    const g = new THREE.Group();
    const m = new THREE.Mesh(pinGeo, pinMat); m.castShadow = true; g.add(m);
    const st = new THREE.Mesh(stripeGeo, stripeMat); st.position.y = 0.285; g.add(st);
    scene.add(g);
    pins.push({ home: { x, z }, x, z, vx: 0, vz: 0, standing: true, removed: false, tip: 0, tipDir: 0, mesh: g });
  }
  function resetPins(all) {
    for (const p of pins) {
      if (all || !p.removed) {
        if (all) { p.removed = false; p.x = p.home.x; p.z = p.home.z; }
        p.standing = !p.removed; p.vx = p.vz = 0; p.tip = 0;
      }
      p.mesh.visible = !p.removed;
      p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.set(0, 0, 0);
    }
  }

  // ball
  const ballTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 128, 64); gr.addColorStop(0, '#3a1aa0'); gr.addColorStop(0.5, '#a01ac0'); gr.addColorStop(1, '#1a6ac0'); g.fillStyle = gr; g.fillRect(0, 0, 128, 64); g.fillStyle = '#111'; [[56, 20], [70, 20], [63, 34]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 16), new THREE.MeshPhongMaterial({ map: ballTex, shininess: 120 }));
  ballMesh.castShadow = true; scene.add(ballMesh);
  const aimArrow = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 3), new THREE.MeshBasicMaterial({ color: 0x35b6ff, transparent: true, opacity: 0.8 }));
  aimArrow.rotation.x = Math.PI / 2; scene.add(aimArrow);

  // players
  const humans = api.active();
  let nFrames = 10;
  const ps = humans.map((p) => ({ p, me: api.getMe(p.index), frames: [], rolls: [] }));
  let figure = null;

  let state = 'menu'; // menu | aim | roll | settle | between | over
  let cur = 0, frame = 0, ballInFrame = 0;
  let pos = 0, aim = 0, power = 0, spin = 0, msg = '', msgT = 0, settleT = 0;
  const ball = { x: 0, z: 0, vx: 0, vz: 0, y: BALL_R, gutter: false, spinRot: 0 };
  let downBefore = 0, swingPeak = 0, holdingB = false;
  let camPos = new THREE.Vector3(0, 1.6, -3.5), camLook = new THREE.Vector3(0, 0.3, 10);

  function setFigure() {
    if (figure) scene.remove(figure);
    const P = ps[cur];
    figure = buildMe3D(THREE, P.me);
    figure.scale.setScalar(0.95);
    scene.add(figure);
  }

  function beginTurn() {
    state = 'aim'; pos = 0; aim = 0; power = 0; swingPeak = 0; holdingB = false;
    setFigure();
    ball.x = 0; ball.z = -0.6; ball.y = BALL_R; ball.gutter = false;
    msg = `${ps[cur].me.name} — Frame ${frame + 1}${ballInFrame ? ' · Ball ' + (ballInFrame + 1) : ''}`; msgT = 2;
    api.setRemoteMode('pointer');
    api.showCursors(false);
  }

  function throwBall(pw) {
    const p = ps[cur].p;
    power = Math.max(0.12, Math.min(1, pw));
    spin = p.phone && p.hasMotion ? Math.max(-1, Math.min(1, p.steer)) : 0;
    const speed = 4 + power * 8;
    ball.x = pos; ball.z = 0.2;
    ball.vx = Math.sin(aim) * speed; ball.vz = Math.cos(aim) * speed;
    state = 'roll';
    downBefore = pins.filter((pp) => !pp.standing).length;
    api.audio.play('roll');
    api.rumble(p.index, 80);
  }

  function updateAim(dt) {
    const p = ps[cur].p, B = api.BTN;
    if (p.down(B.A)) aim = Math.max(-0.12, Math.min(0.12, aim + p.dirX() * dt * 0.15));
    else pos = Math.max(-0.42, Math.min(0.42, pos + p.dirX() * dt * 0.6));
    ball.x = pos; ball.z = -0.35;
    figure.position.set(pos - 0.25, 0, -0.9);
    figure.rotation.y = aim;
    const arm = figure.userData.arms[1];
    if (p.down(B.B)) {
      holdingB = true;
      arm.rotation.x = Math.sin(performance.now() / 300) * 0.2 - 0.3;
      swingPeak = Math.max(swingPeak, p.mag > 12 ? Math.min(1, (p.mag - 8) / 22) : 0);
    } else arm.rotation.x = -0.2;
    ball.y = 0.55; ball.x = pos - 0.25 + 0.3; ball.z = -0.85;
    aimArrow.visible = true;
    aimArrow.position.set(pos + Math.sin(aim) * 3, 0.03, Math.cos(aim) * 3);
    aimArrow.rotation.z = -aim;
    const sw = p.takeSwing();
    if (sw) { swingPeak = Math.max(swingPeak, sw.power); if (!p.down(B.B)) throwBall(swingPeak); }
    else if (holdingB && p.released(B.B)) {
      if (swingPeak > 0) throwBall(swingPeak);
      holdingB = false;
    }
    // camera behind bowler
    camPos.lerp(new THREE.Vector3(pos * 0.6 + 0.7, 2.1, -4.3), 0.1);
    camLook.lerp(new THREE.Vector3(pos * 0.3 + Math.sin(aim) * 6, 0.2, 10), 0.1);
  }

  function updateRoll(dt) {
    aimArrow.visible = false;
    const sub = 4;
    for (let s = 0; s < sub; s++) {
      const h = dt / sub;
      ball.y = BALL_R;
      if (!ball.gutter) {
        if (ball.z > 6 && ball.z < LANE_LEN) ball.vx += spin * 0.9 * h; // hook on the dry part
        if (Math.abs(ball.x) > LANE_W) { ball.gutter = true; ball.x = Math.sign(ball.x) * (LANE_W + 0.12); ball.vx = 0; api.audio.play('aww'); msg = 'Gutter ball!'; msgT = 1.5; }
      } else ball.y = 0.02;
      ball.x += ball.vx * h; ball.z += ball.vz * h;
      // ball vs pins
      if (!ball.gutter && ball.z < LANE_LEN + 1.2) {
        for (const p of pins) {
          if (p.removed) continue;
          const dx = p.x - ball.x, dz = p.z - ball.z, d = Math.hypot(dx, dz);
          if (d < BALL_R + PIN_R && d > 0) {
            const nx = dx / d, nz = dz / d;
            const sp = Math.hypot(ball.vx, ball.vz);
            p.vx = nx * sp * 0.9 + ball.vx * 0.25; p.vz = nz * sp * 0.9 + ball.vz * 0.25;
            if (p.standing) knock(p);
            ball.vx -= nx * sp * 0.12; ball.vz *= 0.93;
            p.x = ball.x + nx * (BALL_R + PIN_R + 0.001); p.z = ball.z + nz * (BALL_R + PIN_R + 0.001);
          }
        }
      }
      // pins vs pins
      for (const a of pins) {
        if (a.removed) continue;
        const sa = Math.hypot(a.vx, a.vz);
        if (sa < 0.05) continue;
        for (const b of pins) {
          if (b === a || b.removed) continue;
          const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
          if (d < PIN_R * 2.3 && d > 0) {
            const nx = dx / d, nz = dz / d;
            const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
            if (rel > 0) {
              b.vx += nx * rel * 0.85; b.vz += nz * rel * 0.85;
              a.vx -= nx * rel * 0.6; a.vz -= nz * rel * 0.6;
              if (b.standing && rel > 0.3) knock(b);
            }
          }
        }
      }
      for (const p of pins) {
        if (p.removed) continue;
        p.x += p.vx * h; p.z += p.vz * h;
        const sp = Math.hypot(p.vx, p.vz);
        if (sp > 0) { const f = Math.max(0, sp - 2.5 * h) / sp; p.vx *= f; p.vz *= f; }
        if (Math.abs(p.x) > LANE_W + 0.25 || p.z > LANE_LEN + 1.6) { p.vx = p.vz = 0; if (p.standing) knock(p); }
      }
    }
    for (const p of pins) {
      if (p.removed) continue;
      if (!p.standing && p.tip < 1) p.tip = Math.min(1, p.tip + dt * 4);
      p.mesh.position.set(p.x, p.tip * 0.06, p.z);
      p.mesh.rotation.set(0, 0, 0);
      if (p.tip > 0) { p.mesh.rotation.y = p.tipDir; p.mesh.rotateX(p.tip * Math.PI / 2); }
    }
    ball.spinRot += Math.hypot(ball.vx, ball.vz) * dt / BALL_R;
    // camera follows the ball, then watches the pins
    const tz = Math.min(ball.z - 2.8, LANE_LEN - 3.2);
    camPos.lerp(new THREE.Vector3(ball.x * 0.5, 1.0 + Math.max(0, (tz - 10) * 0.03), tz), 0.12);
    camLook.lerp(new THREE.Vector3(ball.x * 0.5, 0.2, Math.min(ball.z + 4, LANE_LEN + 0.5)), 0.12);
    if (ball.z > LANE_LEN + 1.8) { ball.vz = 0; ball.vx = 0; ball.z = LANE_LEN + 1.8; if (state === 'roll') { state = 'settle'; settleT = 1.6; } }
  }
  let pinSoundT = 0;
  function knock(p) {
    p.standing = false;
    p.tipDir = Math.atan2(p.vx, p.vz) || Math.random() * 6;
    if (performance.now() - pinSoundT > 150) { api.audio.play('pins'); pinSoundT = performance.now(); }
  }

  function finishRoll() {
    const P = ps[cur];
    const down = pins.filter((p) => !p.removed && !p.standing).length;
    const knocked = down;
    if (!P.frames[frame]) P.frames[frame] = [];
    const fr = P.frames[frame];
    fr.push(knocked);
    P.rolls.push(knocked);
    const tenth = frame === nFrames - 1;
    let frameDone = false, reset = false;
    if (!tenth) {
      if (fr.length === 1 && knocked === 10) { frameDone = true; msg = 'STRIKE!'; api.audio.play('cheer'); }
      else if (fr.length === 2) { frameDone = true; if (fr[0] + fr[1] === 10) { msg = 'SPARE!'; api.audio.play('cheer'); } else msg = `${fr[0] + fr[1]} pins`; }
      else msg = knocked ? `${knocked} pin${knocked > 1 ? 's' : ''}` : 'Oops!';
    } else {
      if (fr.length === 1) { if (knocked === 10) { reset = true; msg = 'STRIKE!'; api.audio.play('cheer'); } else msg = `${knocked} pins`; }
      else if (fr.length === 2) {
        if (fr[0] === 10) { if (fr[1] === 10) { reset = true; msg = 'STRIKE!'; api.audio.play('cheer'); } else msg = `${knocked} pins`; }
        else if (fr[0] + fr[1] === 10) { reset = true; msg = 'SPARE!'; api.audio.play('cheer'); }
        else { frameDone = true; msg = `${fr[0] + fr[1]} pins`; }
      } else { frameDone = true; msg = knocked === 10 ? 'STRIKE!' : `${knocked} pins`; }
    }
    if (knocked === 10 && frameDone && fr.length === 1) api.rumble(P.p.index, 400);
    msgT = 1.8;
    // remove fallen pins
    for (const p of pins) if (!p.standing) p.removed = true;
    if (frameDone) {
      ballInFrame = 0;
      cur++;
      if (cur >= ps.length) { cur = 0; frame++; }
      if (frame >= nFrames) { state = 'over'; setTimeout(showResults, 1600); return; }
      resetPins(true);
    } else {
      ballInFrame++;
      resetPins(reset);
    }
    state = 'between'; settleT = 1.8;
  }

  function update(dt) {
    if (state === 'menu') { render(); return; }
    if (msgT > 0) msgT -= dt;
    if (state === 'aim') updateAim(dt);
    else if (state === 'roll') updateRoll(dt);
    else if (state === 'settle') { updateRoll(dt); settleT -= dt; if (settleT <= 0) finishRoll(); }
    else if (state === 'between') { settleT -= dt; if (settleT <= 0) beginTurn(); }
    ballMesh.position.set(ball.x, ball.y, ball.z);
    ballMesh.rotation.set(ball.spinRot, 0, 0);
    if (state === 'roll' || state === 'settle') { figure.userData.arms[1].rotation.x = Math.max(-1.6, figure.userData.arms[1].rotation.x - dt * 8); }
    render();
  }

  function render() {
    camera.position.copy(camPos); camera.lookAt(camLook);
    camera.aspect = root.clientWidth / root.clientHeight; camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, root.clientWidth, root.clientHeight);
    renderer.render(scene, camera);
    drawHud();
  }
  function drawHud() {
    const W = hud.width, H = hud.height;
    hctx.clearRect(0, 0, W, H);
    if (state === 'menu') return;
    // scoreboard
    const cw = Math.min(64, (W - 200) / (nFrames + 1)), ch = 46, x0 = 20, y0 = 16;
    hctx.font = `700 ${ch * 0.36}px Arial`;
    ps.forEach((P, k) => {
      const y = y0 + k * (ch + 6);
      hctx.fillStyle = k === cur ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.75)';
      hctx.fillRect(x0, y, 130 + cw * (nFrames + 1), ch);
      hctx.fillStyle = P.p.color; hctx.textAlign = 'left';
      hctx.fillText(P.me.name.slice(0, 10), x0 + 8, y + ch * 0.62);
      const sc = scoreRolls(P.rolls, nFrames);
      for (let f = 0; f < nFrames; f++) {
        const fx = x0 + 130 + f * cw;
        hctx.strokeStyle = '#999'; hctx.strokeRect(fx, y, cw, ch);
        hctx.fillStyle = '#333'; hctx.textAlign = 'center';
        if (P.frames[f]) { hctx.font = `700 ${ch * 0.3}px Arial`; hctx.fillText(marks(P.frames[f], f === nFrames - 1), fx + cw / 2, y + ch * 0.38); }
        if (sc[f] != null) { hctx.font = `800 ${ch * 0.36}px Arial`; hctx.fillText(sc[f], fx + cw / 2, y + ch * 0.85); }
      }
      const total = sc.filter((v) => v != null).pop() || 0;
      hctx.font = `800 ${ch * 0.45}px Arial`; hctx.fillStyle = '#222';
      hctx.fillText(total, x0 + 130 + nFrames * cw + cw / 2, y + ch * 0.68);
    });
    if (msgT > 0 && msg) bigText(hctx, msg, W / 2, H * 0.45, Math.min(W, H) * (msg.length < 10 ? 0.14 : 0.07), msg.includes('STRIKE') ? '#ffd23a' : '#fff', '#223');
    if (state === 'aim') {
      const p = ps[cur].p;
      hctx.textAlign = 'center';
      bigText(hctx, `${ps[cur].me.name}'s turn`, W / 2, H - 90, H * 0.05, p.color, '#fff');
      bigText(hctx, '←/→ move · hold A + ←/→ aim · hold B, swing, release B', W / 2, H - 40, H * 0.032, '#fff', '#223');
    }
  }

  function showResults() {
    const rows = ps.map((P) => ({ name: P.me.name, color: P.p.color, me: P.me, score: scoreRolls(P.rolls, nFrames).filter((v) => v != null).pop() || 0 })).sort((a, b) => b.score - a.score);
    import('./common.js').then(({ resultsOverlay }) => {
      const o = resultsOverlay(api, 'Bowling Results', rows, { again: () => restart(nFrames), scoreLabel: 'Score' });
      const back = document.createElement('div'); back.className = 'pill small'; back.textContent = 'Other Sports'; back.dataset.ui = 'sports';
      o.querySelector('.g-row').appendChild(back);
      back.addEventListener('click', () => { o.remove(); env.back(); });
    });
  }
  function restart(n) {
    nFrames = n;
    ps.forEach((P) => { P.frames = []; P.rolls = []; });
    cur = 0; frame = 0; ballInFrame = 0;
    resetPins(true);
    beginTurn();
  }

  // pick game length
  import('./common.js').then(({ overlay }) => {
    const o = overlay(api, `<h1>🎳 Bowling</h1><p>${ps.length} player(s). How long do you want to suffer?</p>
      <div class="g-row"><div class="pill" data-ui="n" data-n="3">3 Frames</div><div class="pill" data-ui="n" data-n="10">10 Frames</div></div>
      <p class="g-hint">Hold B and swing your phone forward like a bowling ball, then let go of B. Twist your wrist for a curve.<br>Keyboard: hold Shift, press Space.</p>`, {
      n: (el) => { o.remove(); restart(+el.dataset.n); },
    });
    o.style.background = 'rgba(255,255,255,.75)';
  });
  resetPins(true);
  setFigure();
  figure.position.set(-0.25, 0, -0.9);

  return {
    update,
    destroy() { scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
