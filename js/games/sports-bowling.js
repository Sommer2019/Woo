// Woo Sports: Bowling — classic 10-pin and the ridiculous 100-pin mode.
// D-pad ←/→ move, hold A + ←/→ aim, hold B + swing (release B) to throw; twist for a hook.
// Keyboard: Shift (hold) + Space to throw.
import { buildMe3D } from '../me.js';
import { bigText } from './common.js';

const LANE_LEN = 18.3;
const MODES = {
  classic: { name: '10 Pins', laneW: 0.53, ballR: 0.11, pinScale: 1, spacing: 0.3048, rowDepth: 0.264, layout: [1, 2, 3, 4] },
  hundred: { name: '100 Pins', laneW: 1.5, ballR: 0.17, pinScale: 0.75, spacing: 0.22, rowDepth: 0.19, layout: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 9] },
};

// classic scoring with strikes and spares
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
// 100-pin scoring: pins knocked per frame, +100 bonus for a strike, +50 for a spare
function scoreHundred(frames) {
  let total = 0;
  return frames.map((fr) => {
    const sum = fr.reduce((s, v) => s + v, 0);
    total += sum + (fr[0] === 100 ? 100 : sum === 100 ? 50 : 0);
    return fr.length === 2 || fr[0] === 100 ? total : null;
  });
}
function marks(fr, tenth, max) {
  const X = max === 100 ? '💯' : 'X';
  if (max === 100) return fr[0] === 100 ? X : fr.map((v, k) => (k === 1 && fr[0] + v === 100 ? '/' : v || '-')).join(' ');
  const out = [];
  if (!tenth) {
    if (fr[0] === 10) return X;
    out.push(fr[0] ? String(fr[0]) : '-');
    if (fr.length > 1) out.push(fr[0] + fr[1] === 10 ? '/' : (fr[1] ? String(fr[1]) : '-'));
    return out.join(' ');
  }
  let prev = null;
  for (const r of fr) {
    if (prev == null && r === 10) { out.push(X); continue; }
    if (prev != null && prev + r === 10) { out.push('/'); prev = null; continue; }
    out.push(r ? String(r) : '-');
    prev = prev == null ? r : null;
  }
  return out.join(' ');
}

function canvasTex(THREE, w, h, fn, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export function create(env) {
  const { api, THREE, renderer, hctx, hud, root } = env;
  let mode = MODES.classic;
  let scene, camera, pins = [], ballMesh, aimArrow, trail = [], sparks = [];
  let BALL_R = mode.ballR, PIN_R = 0.065 * mode.pinScale, LANE_W = mode.laneW;

  // ---------- scene ----------
  function build() {
    if (scene) scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    BALL_R = mode.ballR; PIN_R = 0.065 * mode.pinScale; LANE_W = mode.laneW;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0f22);
    scene.fog = new THREE.Fog(0x0d0f22, 22, 45);
    camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);

    // glossy reflections from a little neon "room"
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x1a1d3a);
    const neon = (c, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m); };
    neon(0xff4fa8, -6, 4, 0, 4, 1.5); neon(0x35b6ff, 6, 4, 0, 4, 1.5); neon(0xffffff, 0, 8, 0, 10, 2); neon(0xffd23a, 0, 3, 8, 5, 1);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x26213a, 0.9));
    const spot = new THREE.DirectionalLight(0xfff4e0, 2.4);
    spot.position.set(2, 9, 4); spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    Object.assign(spot.shadow.camera, { left: -4, right: 4, top: 24, bottom: -4 });
    spot.target.position.set(0, 0, 9);
    scene.add(spot, spot.target);
    const pinLight = new THREE.PointLight(0xffffff, 18, 9, 1.6);
    pinLight.position.set(0, 2.2, LANE_LEN + 0.6); scene.add(pinLight);

    const woodTex = canvasTex(THREE, 512, 1024, (g, w, h) => {
      const boards = 39;
      for (let i = 0; i < boards; i++) { g.fillStyle = `hsl(${30 + (i % 3)}, ${52 + (i % 4) * 3}%, ${66 + ((i * 7) % 5) * 2}%)`; g.fillRect(i * w / boards, 0, w / boards + 1, h); }
      g.globalAlpha = 0.08; for (let i = 0; i < 300; i++) { g.fillStyle = '#5a2a00'; g.fillRect(Math.random() * w, Math.random() * h, 1, 20 + Math.random() * 60); } g.globalAlpha = 1;
      g.fillStyle = 'rgba(90,40,10,.35)'; for (let i = 0; i < boards; i++) g.fillRect(i * w / boards, 0, 1, h);
      g.fillStyle = '#6a2c0c';
      for (let i = 0; i < 7; i++) { const x = w * (0.2 + i * 0.1); g.beginPath(); g.moveTo(x, 900); g.lineTo(x - 9, 930); g.lineTo(x + 9, 930); g.fill(); }
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(w * (0.1 + i * 0.1), 990, 4, 0, 7); g.fill(); }
    });
    const laneMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.18, metalness: 0.05, envMapIntensity: 1.2 });
    const laneLen = LANE_LEN + 6;
    const mkLane = (x, w) => {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(w * 2, 0.1, laneLen), laneMat);
      lane.position.set(x, -0.05, laneLen / 2 - 2); lane.receiveShadow = true; scene.add(lane);
      const gutterMat = new THREE.MeshStandardMaterial({ color: 0x3a3f50, roughness: 0.3, metalness: 0.6 });
      for (const s of [-1, 1]) {
        const gut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, laneLen, 14, 1, true, 0, Math.PI), gutterMat);
        gut.material.side = THREE.DoubleSide;
        gut.rotation.x = Math.PI / 2; gut.rotation.y = Math.PI; gut.position.set(x + s * (w + 0.12), 0, laneLen / 2 - 2); scene.add(gut);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, laneLen), new THREE.MeshStandardMaterial({ color: 0x252a40, roughness: 0.4 }));
        cap.position.set(x + s * (w + 0.3), 0.02, laneLen / 2 - 2); scene.add(cap);
      }
    };
    mkLane(0, LANE_W);
    // neighbouring lanes for atmosphere
    for (const s of [-1, 1]) mkLane(s * (LANE_W + 1.55 + 0.53), 0.53);
    // carpet floor
    const carpet = canvasTex(THREE, 256, 256, (g, w, h) => {
      g.fillStyle = '#1b1640'; g.fillRect(0, 0, w, h);
      const cols = ['#ff4fa8', '#35b6ff', '#ffd23a', '#3cd16b'];
      for (let i = 0; i < 40; i++) { g.strokeStyle = cols[i % 4]; g.lineWidth = 3; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.arc(x, y, 6 + Math.random() * 10, Math.random() * 6, Math.random() * 6 + 2); g.stroke(); }
    }, [10, 10]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.12, -6); floor.receiveShadow = true; scene.add(floor);
    // pin deck back wall with neon sign + pinsetter hood
    const backZ = LANE_LEN + mode.layout.length * mode.rowDepth + 1.4;
    const back = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 0.2), new THREE.MeshStandardMaterial({ color: 0x0a0a16, roughness: 0.8 }));
    back.position.set(0, 1.4, backZ); scene.add(back);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(LANE_W * 2 + 0.6, 0.9, 2.2), new THREE.MeshStandardMaterial({ color: 0x1c2347, roughness: 0.5, metalness: 0.3 }));
    hood.position.set(0, 2.3, backZ - 1.2); scene.add(hood);
    const signTex = canvasTex(THREE, 1024, 256, (g, w, h) => {
      g.shadowColor = '#ff4fa8'; g.shadowBlur = 30; g.fillStyle = '#ffb3dc'; g.font = '900 120px Arial'; g.textAlign = 'center';
      g.fillText(mode === MODES.hundred ? '100 PIN MANIA' : 'WOO BOWL', w / 2, 180);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
    sign.position.set(0, 2.3, backZ - 2.31); sign.rotation.y = Math.PI; scene.add(sign);
    // ceiling light strips
    for (let z = -2; z < LANE_LEN; z += 3) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(LANE_W * 2 + 2, 0.05, 0.25), new THREE.MeshBasicMaterial({ color: 0xfff6dd }));
      strip.position.set(0, 4, z); scene.add(strip);
    }
    // ball return machine
    const ret = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 6, 14), new THREE.MeshStandardMaterial({ color: 0x35b6ff, roughness: 0.25, metalness: 0.4 }));
    ret.rotation.z = Math.PI / 2; ret.position.set(LANE_W + 1.0, 0.3, -2.6); scene.add(ret);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshStandardMaterial({ color: [0xff4a5a, 0x36c96b, 0xf5b622][i], roughness: 0.15, metalness: 0.2 }));
      b.position.set(LANE_W + 0.75 + i * 0.25, 0.75, -2.6); scene.add(b);
    }

    // pins
    const P = mode.pinScale;
    const prof = [[0, 0], [0.03, 0], [0.05, 0.05], [0.062, 0.12], [0.055, 0.2], [0.032, 0.27], [0.03, 0.31], [0.038, 0.35], [0.03, 0.38], [0, 0.385]].map(([x, y]) => new THREE.Vector2(x * P, y * P));
    const pinGeo = new THREE.LatheGeometry(prof, 20);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0.0 });
    const stripeGeo = new THREE.CylinderGeometry(0.0335 * P, 0.033 * P, 0.03 * P, 16, 1, true);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xe02a2a, roughness: 0.3 });
    pins = [];
    mode.layout.forEach((count, r) => {
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * mode.spacing, z = LANE_LEN + r * mode.rowDepth;
        const g = new THREE.Group();
        const m = new THREE.Mesh(pinGeo, pinMat); m.castShadow = true; g.add(m);
        const st = new THREE.Mesh(stripeGeo, stripeMat); st.position.y = 0.285 * P; g.add(st);
        scene.add(g);
        pins.push({ home: { x, z }, x, z, vx: 0, vz: 0, standing: true, removed: false, tip: 0, tipDir: 0, mesh: g });
      }
    });

    const ballTex = canvasTex(THREE, 256, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#2a10a0'); gr.addColorStop(0.45, '#c01ae0'); gr.addColorStop(1, '#1a8ae0');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.35; for (let i = 0; i < 40; i++) { g.strokeStyle = i % 2 ? '#fff' : '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.bezierCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = '#0a0a0a'; [[112, 40], [140, 40], [126, 66]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); });
    });
    ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 20), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.08, metalness: 0.15, envMapIntensity: 1.6 }));
    ballMesh.castShadow = true; scene.add(ballMesh);
    aimArrow = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.45, 3), new THREE.MeshBasicMaterial({ color: 0x35b6ff, transparent: true, opacity: 0.85 }));
    aimArrow.rotation.x = Math.PI / 2; scene.add(aimArrow);
    trail = [];
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xc8a0ff, transparent: true, opacity: 0.35, depthWrite: false });
    for (let i = 0; i < 18; i++) { const t = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 0.7, 10, 8), trailMat.clone()); t.visible = false; scene.add(t); trail.push(t); }
    sparks = [];
    figure = null;
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

  // ---------- players ----------
  const humans = api.active();
  let nFrames = 10;
  const ps = humans.map((p) => ({ p, me: api.getMe(p.index), frames: [], rolls: [] }));
  let figure = null;

  let state = 'menu'; // menu | aim | roll | settle | between | over
  let cur = 0, frame = 0, ballInFrame = 0;
  let pos = 0, aim = 0, power = 0, spin = 0, msg = '', msgT = 0, settleT = 0;
  const ball = { x: 0, z: 0, vx: 0, vz: 0, y: 0.11, gutter: false, spinRot: 0 };
  let swingPeak = 0, holdingB = false, trailT = 0;
  const camPos = new THREE.Vector3(0, 1.6, -3.5), camLook = new THREE.Vector3(0, 0.3, 10);
  const maxPins = () => pins.length;

  function setFigure() {
    if (figure) scene.remove(figure);
    figure = buildMe3D(THREE, ps[cur].me);
    figure.scale.setScalar(0.95);
    scene.add(figure);
  }

  function beginTurn() {
    state = 'aim'; pos = 0; aim = 0; power = 0; swingPeak = 0; holdingB = false;
    setFigure();
    ball.gutter = false;
    msg = `${ps[cur].me.name} — Frame ${frame + 1}${ballInFrame ? ' · Ball ' + (ballInFrame + 1) : ''}`; msgT = 2;
    api.setRemoteMode('pointer');
    api.showCursors(false);
  }

  function throwBall(pw) {
    const p = ps[cur].p;
    power = Math.max(0.12, Math.min(1, pw));
    spin = p.phone && p.hasMotion ? Math.max(-1, Math.min(1, p.steer)) : 0;
    const speed = 4 + power * 8;
    ball.x = pos; ball.z = 0.2; ball.y = BALL_R;
    ball.vx = Math.sin(aim) * speed; ball.vz = Math.cos(aim) * speed;
    state = 'roll';
    api.audio.play('roll');
    api.rumble(p.index, 80);
  }

  function updateAim(dt) {
    const p = ps[cur].p, B = api.BTN;
    const posMax = LANE_W - BALL_R - 0.05;
    if (p.down(B.A)) aim = Math.max(-0.12, Math.min(0.12, aim + p.dirX() * dt * 0.15));
    else pos = Math.max(-posMax, Math.min(posMax, pos + p.dirX() * dt * (0.6 + LANE_W * 0.4)));
    figure.position.set(pos - 0.25, 0, -0.9);
    figure.rotation.y = aim;
    const arm = figure.userData.arms[1];
    if (p.down(B.B)) {
      holdingB = true;
      arm.rotation.x = Math.sin(performance.now() / 300) * 0.2 - 0.3;
      swingPeak = Math.max(swingPeak, p.mag > 12 ? Math.min(1, (p.mag - 8) / 22) : 0);
    } else arm.rotation.x = -0.2;
    ball.y = 0.55; ball.x = pos + 0.05; ball.z = -0.85;
    aimArrow.visible = true;
    aimArrow.position.set(pos + Math.sin(aim) * 3, 0.03, Math.cos(aim) * 3);
    aimArrow.rotation.z = -aim;
    aimArrow.material.opacity = 0.55 + Math.sin(performance.now() / 200) * 0.3;
    const sw = p.takeSwing();
    if (sw) { swingPeak = Math.max(swingPeak, sw.power); if (!p.down(B.B)) throwBall(swingPeak); }
    else if (holdingB && p.released(B.B)) {
      if (swingPeak > 0) throwBall(swingPeak);
      holdingB = false;
    }
    camPos.lerp(new THREE.Vector3(pos * 0.6 + 0.7, 2.1 + LANE_W * 0.4, -4.3 - LANE_W * 0.6), 0.1);
    camLook.lerp(new THREE.Vector3(pos * 0.3 + Math.sin(aim) * 6, 0.2, 10), 0.1);
  }

  let pinSoundT = 0;
  function knock(p) {
    p.standing = false;
    p.tipDir = Math.atan2(p.vx, p.vz) || Math.random() * 6;
    if (performance.now() - pinSoundT > 120) { api.audio.play('pins'); pinSoundT = performance.now(); }
  }
  function burst(x, y, z, color, n = 30) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.01), new THREE.MeshBasicMaterial({ color: color || new THREE.Color().setHSL(Math.random(), 0.9, 0.6) }));
      m.position.set(x, y, z); scene.add(m);
      sparks.push({ m, vx: (Math.random() - 0.5) * 4, vy: 1.5 + Math.random() * 3, vz: (Math.random() - 0.5) * 3, t: 1.6, r: Math.random() * 10 });
    }
  }

  function updateRoll(dt) {
    aimArrow.visible = false;
    const sub = mode === MODES.hundred ? 3 : 4;
    for (let s = 0; s < sub; s++) {
      const h = dt / sub;
      ball.y = BALL_R;
      if (!ball.gutter) {
        if (ball.z > 6 && ball.z < LANE_LEN) ball.vx += spin * 0.9 * h;
        if (Math.abs(ball.x) > LANE_W) { ball.gutter = true; ball.x = Math.sign(ball.x) * (LANE_W + 0.12); ball.vx = 0; api.audio.play('aww'); msg = 'Gutter ball!'; msgT = 1.5; }
      } else ball.y = 0.02;
      ball.x += ball.vx * h; ball.z += ball.vz * h;
      // ball vs pins
      if (!ball.gutter && ball.z > LANE_LEN - 0.5) {
        for (const p of pins) {
          if (p.removed) continue;
          const dx = p.x - ball.x, dz = p.z - ball.z;
          if (Math.abs(dx) > 0.5 || Math.abs(dz) > 0.5) continue;
          const d = Math.hypot(dx, dz);
          if (d < BALL_R + PIN_R && d > 0) {
            const nx = dx / d, nz = dz / d;
            const sp = Math.hypot(ball.vx, ball.vz);
            p.vx = nx * sp * 0.9 + ball.vx * 0.25; p.vz = nz * sp * 0.9 + ball.vz * 0.25;
            if (p.standing) knock(p);
            ball.vx -= nx * sp * (mode === MODES.hundred ? 0.05 : 0.12); ball.vz *= mode === MODES.hundred ? 0.985 : 0.93;
            p.x = ball.x + nx * (BALL_R + PIN_R + 0.001); p.z = ball.z + nz * (BALL_R + PIN_R + 0.001);
          }
        }
      }
      // pins vs pins (only moving pins push)
      for (const a of pins) {
        if (a.removed) continue;
        const sa = Math.abs(a.vx) + Math.abs(a.vz);
        if (sa < 0.05) continue;
        for (const b of pins) {
          if (b === a || b.removed) continue;
          const dx = b.x - a.x, dz = b.z - a.z;
          if (Math.abs(dx) > PIN_R * 2.4 || Math.abs(dz) > PIN_R * 2.4) continue;
          const d = Math.hypot(dx, dz);
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
        if (Math.abs(p.x) > LANE_W + 0.25 || p.z > LANE_LEN + mode.layout.length * mode.rowDepth + 0.8) { p.vx = p.vz = 0; if (p.standing) knock(p); }
      }
    }
    for (const p of pins) {
      if (p.removed) continue;
      if (!p.standing && p.tip < 1) p.tip = Math.min(1, p.tip + dt * 4);
      p.mesh.position.set(p.x, p.tip * 0.06 * mode.pinScale, p.z);
      p.mesh.rotation.set(0, 0, 0);
      if (p.tip > 0) { p.mesh.rotation.y = p.tipDir; p.mesh.rotateX(p.tip * Math.PI / 2); }
    }
    ball.spinRot += Math.hypot(ball.vx, ball.vz) * dt / BALL_R;
    // trail
    trailT -= dt;
    if (trailT <= 0 && !ball.gutter && ball.vz > 1) {
      trailT = 0.03;
      const t = trail.shift(); t.visible = true; t.position.set(ball.x, BALL_R * 0.7, ball.z); t.userData.life = 0.5; t.scale.setScalar(1); trail.push(t);
    }
    const tz = Math.min(ball.z - 2.8, LANE_LEN - 3.2 - LANE_W * 0.6);
    camPos.lerp(new THREE.Vector3(ball.x * 0.5, 1.0 + LANE_W * 0.4 + Math.max(0, (tz - 10) * 0.03), tz), 0.12);
    camLook.lerp(new THREE.Vector3(ball.x * 0.5, 0.2, Math.min(ball.z + 4, LANE_LEN + 0.5 + mode.layout.length * mode.rowDepth * 0.4)), 0.12);
    const endZ = LANE_LEN + mode.layout.length * mode.rowDepth + 1;
    if (ball.z > endZ) { ball.vz = 0; ball.vx = 0; ball.z = endZ; if (state === 'roll') { state = 'settle'; settleT = mode === MODES.hundred ? 2.2 : 1.6; } }
  }

  function finishRoll() {
    const P = ps[cur];
    const knocked = pins.filter((p) => !p.removed && !p.standing).length;
    if (!P.frames[frame]) P.frames[frame] = [];
    const fr = P.frames[frame];
    fr.push(knocked);
    P.rolls.push(knocked);
    const M = maxPins();
    const tenth = frame === nFrames - 1 && M === 10;
    let frameDone = false, reset = false, celebrate = false;
    const word = (n) => (n ? `${n} pin${n > 1 ? 's' : ''}` : 'Oops!');
    if (M === 100) {
      if (fr.length === 1 && knocked === 100) { frameDone = true; msg = '💯 100-PIN STRIKE!!'; celebrate = true; }
      else if (fr.length === 2) { frameDone = true; if (fr[0] + fr[1] === 100) { msg = 'SPARE!'; celebrate = true; } else msg = `${fr[0] + fr[1]} pins`; }
      else msg = word(knocked);
    } else if (!tenth) {
      if (fr.length === 1 && knocked === 10) { frameDone = true; msg = 'STRIKE!'; celebrate = true; }
      else if (fr.length === 2) { frameDone = true; if (fr[0] + fr[1] === 10) { msg = 'SPARE!'; celebrate = true; } else msg = `${fr[0] + fr[1]} pins`; }
      else msg = word(knocked);
    } else {
      if (fr.length === 1) { if (knocked === 10) { reset = true; msg = 'STRIKE!'; celebrate = true; } else msg = word(knocked); }
      else if (fr.length === 2) {
        if (fr[0] === 10) { if (fr[1] === 10) { reset = true; msg = 'STRIKE!'; celebrate = true; } else msg = word(knocked); }
        else if (fr[0] + fr[1] === 10) { reset = true; msg = 'SPARE!'; celebrate = true; }
        else { frameDone = true; msg = `${fr[0] + fr[1]} pins`; }
      } else { frameDone = true; msg = knocked === 10 ? 'STRIKE!' : word(knocked); celebrate = knocked === 10; }
    }
    if (celebrate) {
      api.audio.play('cheer'); api.rumble(P.p.index, 400);
      for (let i = 0; i < 4; i++) burst((Math.random() - 0.5) * LANE_W * 2, 0.5, LANE_LEN + 0.5, null, M === 100 ? 60 : 30);
    }
    msgT = 2;
    for (const p of pins) if (!p.standing) p.removed = true;
    if (frameDone) {
      ballInFrame = 0;
      cur++;
      if (cur >= ps.length) { cur = 0; frame++; }
      if (frame >= nFrames) { state = 'over'; setTimeout(showResults, 1800); return; }
      resetPins(true);
    } else {
      ballInFrame++;
      resetPins(reset);
    }
    state = 'between'; settleT = 1.9;
  }

  function update(dt) {
    if (state === 'menu') { render(); return; }
    if (msgT > 0) msgT -= dt;
    if (state === 'aim') updateAim(dt);
    else if (state === 'roll') updateRoll(dt);
    else if (state === 'settle') { updateRoll(dt); settleT -= dt; if (settleT <= 0) finishRoll(); }
    else if (state === 'between') { settleT -= dt; if (settleT <= 0) beginTurn(); }
    ballMesh.position.set(ball.x, ball.y, ball.z);
    ballMesh.rotation.set(ball.spinRot, 0, spin * 0.5);
    for (const t of trail) if (t.visible) { t.userData.life -= dt; t.material.opacity = Math.max(0, t.userData.life) * 0.7; t.scale.setScalar(Math.max(0.1, t.userData.life * 2)); if (t.userData.life <= 0) t.visible = false; }
    for (const s of sparks) { s.t -= dt; s.vy -= 6 * dt; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt; s.m.rotation.x += s.r * dt; s.m.rotation.y += s.r * dt; if (s.m.position.y < 0.01) { s.m.position.y = 0.01; s.vy = 0; s.vx *= 0.9; s.vz *= 0.9; } }
    for (const s of sparks) if (s.t <= 0) scene.remove(s.m);
    sparks = sparks.filter((s) => s.t > 0);
    if (figure && (state === 'roll' || state === 'settle')) figure.userData.arms[1].rotation.x = Math.max(-1.6, figure.userData.arms[1].rotation.x - dt * 8);
    render();
  }

  function render() {
    camera.position.copy(camPos); camera.lookAt(camLook);
    camera.aspect = root.clientWidth / root.clientHeight; camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, root.clientWidth, root.clientHeight);
    renderer.render(scene, camera);
    drawHud();
  }
  function frameScores(P) { return maxPins() === 100 ? scoreHundred(P.frames) : scoreRolls(P.rolls, nFrames); }
  function drawHud() {
    const W = hud.width, H = hud.height;
    hctx.clearRect(0, 0, W, H);
    if (state === 'menu') return;
    const M = maxPins();
    const cw = Math.min(M === 100 ? 84 : 64, (W - 200) / (nFrames + 1)), ch = 46, x0 = 20, y0 = 16;
    ps.forEach((P, k) => {
      const y = y0 + k * (ch + 6);
      hctx.fillStyle = k === cur ? 'rgba(255,255,255,.96)' : 'rgba(255,255,255,.72)';
      hctx.beginPath(); hctx.roundRect(x0, y, 130 + cw * (nFrames + 1), ch, 10); hctx.fill();
      hctx.fillStyle = P.p.color; hctx.textAlign = 'left'; hctx.font = `800 ${ch * 0.36}px Arial`;
      hctx.fillText(P.me.name.slice(0, 10), x0 + 10, y + ch * 0.62);
      const sc = frameScores(P);
      for (let f = 0; f < nFrames; f++) {
        const fx = x0 + 130 + f * cw;
        hctx.strokeStyle = '#b8c0c8'; hctx.lineWidth = 1.5; hctx.strokeRect(fx, y + 3, cw, ch - 6);
        hctx.fillStyle = '#333'; hctx.textAlign = 'center';
        if (P.frames[f]) { hctx.font = `700 ${ch * 0.28}px Arial`; hctx.fillText(marks(P.frames[f], f === nFrames - 1, M), fx + cw / 2, y + ch * 0.38); }
        if (sc[f] != null) { hctx.font = `800 ${ch * 0.34}px Arial`; hctx.fillText(sc[f], fx + cw / 2, y + ch * 0.82); }
      }
      const total = sc.filter((v) => v != null).pop() || 0;
      hctx.font = `800 ${ch * 0.42}px Arial`; hctx.fillStyle = '#222';
      hctx.fillText(total, x0 + 130 + nFrames * cw + cw / 2, y + ch * 0.68);
    });
    if (state === 'roll' || state === 'settle' || state === 'between') {
      const standing = pins.filter((p) => !p.removed && p.standing).length;
      hctx.textAlign = 'right'; bigText(hctx, `${standing} standing`, W - 140, H - 40, H * 0.04, '#fff', '#223');
    }
    if (msgT > 0 && msg) bigText(hctx, msg, W / 2, H * 0.45, Math.min(W, H) * (msg.length < 12 ? 0.13 : 0.075), /STRIKE|💯/.test(msg) ? '#ffd23a' : '#fff', '#223');
    if (state === 'aim') {
      const p = ps[cur].p;
      bigText(hctx, `${ps[cur].me.name}'s turn`, W / 2, H - 90, H * 0.05, p.color, '#fff');
      bigText(hctx, '←/→ move · hold A + ←/→ aim · hold B, swing, release B', W / 2, H - 40, H * 0.032, '#fff', '#223');
    }
  }

  function showResults() {
    const rows = ps.map((P) => ({ name: P.me.name, color: P.p.color, me: P.me, score: frameScores(P).filter((v) => v != null).pop() || 0 })).sort((a, b) => b.score - a.score);
    import('./common.js').then(({ resultsOverlay }) => {
      const o = resultsOverlay(api, `${mode === MODES.hundred ? '💯 100-Pin' : '🎳 Bowling'} Results`, rows, { again: () => chooser(), scoreLabel: 'Score' });
      const back = document.createElement('div'); back.className = 'pill small'; back.textContent = 'Other Sports'; back.dataset.ui = 'sports';
      o.querySelector('.g-row').appendChild(back);
      back.addEventListener('click', () => { o.remove(); env.back(); });
    });
  }
  function start(m, n) {
    mode = MODES[m]; nFrames = n;
    build();
    ps.forEach((P) => { P.frames = []; P.rolls = []; });
    cur = 0; frame = 0; ballInFrame = 0;
    resetPins(true);
    beginTurn();
  }

  function chooser() {
    state = 'menu';
    import('./common.js').then(({ overlay }) => {
      const o = overlay(api, `<h1>🎳 Bowling</h1><p>${ps.length} player(s). Pick your poison:</p>
        <div class="g-row">
          <div class="g-card" data-ui="go" data-m="classic" data-n="3"><div class="ico">🎳</div>Classic<br><small style="font-size:2vh">3 frames</small></div>
          <div class="g-card" data-ui="go" data-m="classic" data-n="10"><div class="ico">🎳</div>Classic<br><small style="font-size:2vh">10 frames</small></div>
          <div class="g-card" data-ui="go" data-m="hundred" data-n="3"><div class="ico">💯</div>100 Pins<br><small style="font-size:2vh">3 frames of chaos</small></div>
        </div>
        <p class="g-hint">Hold B and swing your phone forward like a bowling ball, then let go of B. Twist your wrist for a curve.<br>Keyboard: hold Shift, press Space.</p>`, {
        go: (el) => { o.remove(); start(el.dataset.m, +el.dataset.n); },
      });
      o.style.background = 'rgba(10,12,30,.55)';
      o.style.color = '#fff';
      o.querySelector('h1').style.color = '#fff';
    });
  }

  build();
  resetPins(true);
  setFigure();
  figure.position.set(-0.25, 0, -0.9);
  ballMesh.position.set(0.05, 0.55, -0.85);
  chooser();

  return {
    update,
    destroy() { scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
