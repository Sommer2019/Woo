// Woo Kart — split-screen kart racer. Hold the remote sideways: 2 = gas, 1 = brake,
// tilt or D-pad = steer, B = drift, D-pad up / A = use item.
import * as THREE from '../lib/three.module.min.js';
import { overlay, ordinal, bigText } from './common.js';
import { buildMe3D, randomMe } from '../me.js';
import { cheat } from '../cheats.js';

const TRACKS = [
  {
    name: 'Woo Circuit', ground: '#58b84a', ground2: '#4fa842', sky: 0x8fd0ff, fog: 0xbfe6ff, deco: 'tree',
    pts: [[0, 0], [80, 0], [140, 20], [160, 80], [130, 130], [80, 120], [50, 150], [60, 210], [120, 230], [170, 210], [200, 240], [180, 300], [100, 320], [20, 300], [-40, 250], [-60, 180], [-30, 120], [-60, 60], [-40, 10]],
  },
  {
    name: 'Dusty Dunes', ground: '#e2c27a', ground2: '#d6b46a', sky: 0xffd9a0, fog: 0xffe6c0, deco: 'cactus',
    pts: [[0, 0], [120, -20], [200, 40], [220, 140], [160, 180], [100, 150], [60, 190], [90, 260], [30, 320], [-80, 300], [-120, 220], [-60, 170], [-120, 110], [-110, 30]],
  },
  {
    name: 'Frosty Loop', ground: '#eef4fa', ground2: '#dfe9f3', sky: 0xbfd8f0, fog: 0xe6f0fa, deco: 'pine',
    pts: [[0, 0], [150, 0], [220, 60], [200, 140], [120, 150], [90, 200], [140, 260], [80, 320], [-40, 310], [-100, 240], [-80, 160], [-140, 100], [-100, 20]],
  },
];
const N = 700;          // track samples
const W = 9;            // road half width
const LAPS = 3;
const KART_COUNT = 6;
const MAX_SPEED = 30;
const ITEM_ICONS = { boost: '🍄', banana: '🍌', shell: '🟢', star: '⭐' };
const CPU_COLORS = ['#9b59ff', '#ff8a2a', '#222831', '#e86fb0', '#20c0c0', '#8a5a2b'];
const CPU_NAMES = ['Bolt', 'Dash', 'Zippy', 'Rusty', 'Nitro', 'Turbo'];

function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

function canvasTex(w, h, fn, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function create(api) {
  const root = api.root;
  let renderer, scene, hud, hctx;
  let track = null, karts = [], items = [], boxes = [];
  let state = 'setup'; // setup | countdown | race | done
  let countdown = 0, raceTime = 0, doneTimer = 0;
  let trackIndex = 0;
  let ui = null;
  let humans = [];

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'g-full';
  root.appendChild(renderer.domElement);
  hud = document.createElement('canvas');
  hud.className = 'g-full';
  root.appendChild(hud);
  hctx = hud.getContext('2d');

  function resize() {
    const w = root.clientWidth, h = root.clientHeight;
    renderer.setSize(w, h, false);
    hud.width = w; hud.height = h;
  }
  resize();

  // ---------- track building ----------
  function buildTrack(def) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(def.sky);
    scene.fog = new THREE.Fog(def.fog, 90, 420);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x667755, 1.5));
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
    sun.position.set(60, 120, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 300 });
    sun.shadow.bias = -0.0005;
    scene.add(sun, sun.target);
    scene.userData.sun = sun;
    addSky(def);

    const scale = 1.25;
    const curve = new THREE.CatmullRomCurve3(def.pts.map(([x, z]) => new THREE.Vector3(x * scale, 0, z * scale)), true, 'centripetal');
    const P = curve.getSpacedPoints(N).slice(0, N);
    const T = [], Nr = [];
    for (let i = 0; i < N; i++) {
      const a = P[(i - 1 + N) % N], b = P[(i + 1) % N];
      const t = new THREE.Vector3().subVectors(b, a).normalize();
      T.push(t);
      Nr.push(new THREE.Vector3(-t.z, 0, t.x)); // left-hand normal -> we call it "right" consistently below
    }
    const segLen = curve.getLength() / N;

    // ground
    const gtex = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = def.ground; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { c.fillStyle = Math.random() < 0.5 ? def.ground2 : 'rgba(255,255,255,.08)'; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    });
    gtex.repeat.set(80, 80);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ map: gtex }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
    scene.add(ground);

    // road strip
    const roadTex = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#5d6168'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 1500; i++) { const g = 80 + Math.random() * 30; c.fillStyle = `rgb(${g},${g + 2},${g + 6})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      c.fillStyle = '#f2f2f2'; c.fillRect(w / 2 - 3, 0, 6, h / 2);
      c.fillStyle = '#e8e8e8'; c.fillRect(6, 0, 5, h); c.fillRect(w - 11, 0, 5, h);
    });
    const curbTex = canvasTex(32, 64, (c, w, h) => { c.fillStyle = '#e53935'; c.fillRect(0, 0, w, h / 2); c.fillStyle = '#fff'; c.fillRect(0, h / 2, w, h / 2); });
    function strip(offA, offB, y, tex, vScale) {
      const pos = [], uv = [], idx = [];
      let dist = 0;
      for (let i = 0; i <= N; i++) {
        const k = i % N;
        const p = P[k], n = Nr[k];
        pos.push(p.x + n.x * offA, y, p.z + n.z * offA, p.x + n.x * offB, y, p.z + n.z * offB);
        uv.push(0, dist / vScale, 1, dist / vScale);
        dist += segLen;
        if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
      m.receiveShadow = true;
      scene.add(m);
    }
    strip(-W, W, 0.02, roadTex, 18);
    strip(W, W + 1.4, 0.04, curbTex, 4);
    strip(-W - 1.4, -W, 0.04, curbTex, 4);

    // start line
    const chk = canvasTex(64, 16, (c, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 4, y * 4, 4, 4); } }, false);
    chk.magFilter = THREE.NearestFilter;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 2.5), new THREE.MeshBasicMaterial({ map: chk }));
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = Math.atan2(T[0].x, T[0].z) + Math.PI / 2 - Math.PI / 2;
    line.position.set(P[0].x, 0.05, P[0].z);
    line.lookAt(P[0].x, 10, P[0].z); line.rotateZ(-Math.atan2(T[0].x, T[0].z));
    scene.add(line);
    // start arch
    const archMat = new THREE.MeshLambertMaterial({ color: 0x35b6ff });
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(1, 8, 1), archMat);
      post.position.set(P[0].x + Nr[0].x * (W + 2) * s, 4, P[0].z + Nr[0].z * (W + 2) * s);
      scene.add(post);
    }
    const bannerTex = canvasTex(512, 64, (c, w, h) => { c.fillStyle = '#35b6ff'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 44px Arial'; c.textAlign = 'center'; c.fillText('WOO KART  ★  ' + def.name.toUpperCase(), w / 2, 48); }, false);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 5, 2, 0.6), [archMat, archMat, archMat, archMat, new THREE.MeshBasicMaterial({ map: bannerTex }), new THREE.MeshBasicMaterial({ map: bannerTex })]);
    banner.position.set(P[0].x, 8, P[0].z);
    banner.rotation.y = Math.atan2(T[0].x, T[0].z);
    scene.add(banner);

    // decorations (instanced)
    const spots = [];
    for (let tries = 0; tries < 1400 && spots.length < 260; tries++) {
      const i = Math.floor(Math.random() * N);
      const side = Math.random() < 0.5 ? -1 : 1;
      const off = W + 7 + Math.random() * 60;
      const x = P[i].x + Nr[i].x * off * side, z = P[i].z + Nr[i].z * off * side;
      let ok = true;
      for (let j = 0; j < N; j += 3) { const dx = P[j].x - x, dz = P[j].z - z; if (dx * dx + dz * dz < (W + 5) ** 2) { ok = false; break; } }
      if (ok) spots.push([x, z, 0.8 + Math.random() * 0.8]);
    }
    const dummy = new THREE.Object3D();
    function instanced(geo, mat, yOff) {
      const m = new THREE.InstancedMesh(geo, mat, spots.length);
      spots.forEach(([x, z, s], k) => { dummy.position.set(x, yOff * s, z); dummy.scale.set(s, s, s); dummy.rotation.y = k; dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); });
      m.castShadow = true;
      scene.add(m);
    }
    if (def.deco === 'tree') {
      instanced(new THREE.CylinderGeometry(0.4, 0.5, 3, 6), new THREE.MeshLambertMaterial({ color: 0x8a5a2b }), 1.5);
      instanced(new THREE.SphereGeometry(2.6, 8, 6), new THREE.MeshLambertMaterial({ color: 0x2e9e3e }), 4.6);
    } else if (def.deco === 'cactus') {
      instanced(new THREE.CylinderGeometry(0.6, 0.7, 5, 8), new THREE.MeshLambertMaterial({ color: 0x3f9b4a }), 2.5);
      instanced(new THREE.BoxGeometry(3.2, 0.7, 0.7), new THREE.MeshLambertMaterial({ color: 0x3f9b4a }), 3);
    } else {
      instanced(new THREE.CylinderGeometry(0.35, 0.4, 2, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), 1);
      instanced(new THREE.ConeGeometry(2.2, 6, 8), new THREE.MeshLambertMaterial({ color: 0x2f6f4f }), 4.5);
    }

    // item boxes
    boxes = [];
    const boxTex = canvasTex(64, 64, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#ff6ad5'); g.addColorStop(0.5, '#6ad5ff'); g.addColorStop(1, '#ffe66a');
      c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 48px Arial'; c.textAlign = 'center'; c.fillText('?', w / 2, 50);
    }, false);
    const boxMat = new THREE.MeshLambertMaterial({ map: boxTex, transparent: true, opacity: 0.85 });
    const boxGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    for (const f of [0.22, 0.52, 0.8]) {
      const i = Math.floor(f * N);
      for (let k = -1.5; k <= 1.5; k++) {
        const m = new THREE.Mesh(boxGeo, boxMat);
        m.position.set(P[i].x + Nr[i].x * k * 3.6, 1.2, P[i].z + Nr[i].z * k * 3.6);
        scene.add(m);
        boxes.push({ mesh: m, x: m.position.x, z: m.position.z, cool: 0 });
      }
    }
    return { def, P, T, Nr, curve };
  }

  // ---------- karts ----------
  function addSky(def) {
    // gradient sky dome
    const top = new THREE.Color(def.sky).multiplyScalar(0.75), bottom = new THREE.Color(def.fog);
    const skyTex = canvasTex(4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#' + top.getHexString()); g.addColorStop(0.55, '#' + bottom.getHexString()); g.addColorStop(1, '#' + bottom.getHexString()); c.fillStyle = g; c.fillRect(0, 0, w, h); }, false);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -2; scene.add(sky);
    // sun disc
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false }));
    sunDisc.position.set(500, 700, 300); sunDisc.lookAt(0, 0, 0); scene.add(sunDisc);
    // distant mountains
    const mCol = new THREE.Color(def.ground).lerp(new THREE.Color(def.fog), 0.55);
    const snow = def.deco === 'pine' ? 0xffffff : null;
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + Math.random() * 0.1, r = 900 + Math.random() * 300, hgt = 120 + Math.random() * 220;
      const m = new THREE.Mesh(new THREE.ConeGeometry(hgt * (0.9 + Math.random() * 0.6), hgt, 5 + Math.floor(Math.random() * 3)), new THREE.MeshBasicMaterial({ color: mCol.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.08), fog: false }));
      m.position.set(Math.cos(a) * r + 100, hgt / 2 - 10, Math.sin(a) * r + 150); m.rotation.y = Math.random() * 3; scene.add(m);
      if (snow && hgt > 200) { const cap = new THREE.Mesh(new THREE.ConeGeometry(hgt * 0.32, hgt * 0.3, 6), new THREE.MeshBasicMaterial({ color: snow, fog: false })); cap.position.set(m.position.x, hgt * 0.85 - 10, m.position.z); scene.add(cap); }
    }
    // clouds
    const cloudTex = canvasTex(256, 128, (c, w, h) => {
      for (let i = 0; i < 14; i++) { const x = 40 + Math.random() * 176, y = 50 + Math.random() * 40, r = 20 + Math.random() * 30; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    }, false);
    for (let i = 0; i < 26; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, fog: false, depthWrite: false, opacity: 0.9 }));
      const a = Math.random() * Math.PI * 2, r = 300 + Math.random() * 600;
      sp.position.set(Math.cos(a) * r + 100, 180 + Math.random() * 160, Math.sin(a) * r + 150);
      const s = 140 + Math.random() * 160; sp.scale.set(s, s / 2, 1); scene.add(sp);
    }
  }

  function buildKart(color, me) {
    const g = new THREE.Group();
    const col = new THREE.Color(color);
    const paint = new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23252b, roughness: 0.6, metalness: 0.3 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.15, metalness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.6, 6, 14), paint);
    body.rotation.x = Math.PI / 2; body.scale.set(1.35, 1, 0.55); body.position.y = 0.55; g.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.5), dark); nose.position.set(0, 0.35, 1.55); g.add(nose);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 1.2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    stripe.position.set(0, 0.86, 0.75); g.add(stripe);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.25), dark); seat.position.set(0, 0.85, -0.85); seat.rotation.x = -0.15; g.add(seat);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.45), paint); wing.position.set(0, 1.25, -1.3); g.add(wing);
    for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.2), dark); st.position.set(0.6 * s, 1.0, -1.3); g.add(st); }
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.42, 18);
    const tire = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.85 });
    const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.44, 10);
    const wheels = [];
    for (const [x, z] of [[-0.98, 0.95], [0.98, 0.95], [-1.02, -0.95], [1.02, -0.95]]) {
      const w = new THREE.Group(); w.position.set(x, 0.42, z);
      const t = new THREE.Mesh(wheelGeo, tire); t.rotation.z = Math.PI / 2; t.castShadow = true; w.add(t);
      const hub = new THREE.Mesh(hubGeo, chrome); hub.rotation.z = Math.PI / 2; w.add(hub);
      g.add(w); wheels.push(w);
    }
    const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 16), dark); wheelRing.position.set(0, 1.05, 0.25); wheelRing.rotation.x = -0.9; g.add(wheelRing);
    // exhaust + flames
    const flames = [];
    for (const s of [-1, 1]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.35, 10), chrome); pipe.rotation.x = Math.PI / 2; pipe.position.set(0.35 * s, 0.55, -1.45); g.add(pipe);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 10), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, depthWrite: false }));
      fl.rotation.x = -Math.PI / 2; fl.position.set(0.35 * s, 0.55, -2.0); fl.visible = false; g.add(fl); flames.push(fl);
    }
    // driver: the player's Me (or a random CPU Me), seated
    const fig = buildMe3D(THREE, me || randomMe());
    fig.scale.setScalar(0.8);
    fig.position.set(0, 0.2, -0.45);
    for (const l of fig.userData.legs) l.visible = false;
    for (const a of fig.userData.arms) { a.rotation.x = -1.1; }
    g.add(fig);
    // drift sparks
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.9 });
    const sparks = [];
    for (const s of [-1, 1]) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), sparkMat.clone()); sp.position.set(0.95 * s, 0.3, -1.3); sp.visible = false; g.add(sp); sparks.push(sp); }
    g.traverse((o) => { if (o.isMesh && o.material && !o.material.transparent) o.castShadow = true; });
    const inner = new THREE.Group();
    inner.add(g);
    return { root: inner, model: g, wheels, sparks, body, flames, fig };
  }

  function spawnRace() {
    track = buildTrack(TRACKS[trackIndex]);
    humans = api.active();
    karts = []; items = [];
    const total = Math.max(KART_COUNT, humans.length);
    const order = [];
    // humans start at the back, like it should be
    for (let i = 0; i < total - humans.length; i++) order.push({ cpu: i });
    for (const p of humans) order.push({ human: p });
    order.forEach((o, gi) => {
      const row = Math.floor(gi / 2), side = gi % 2 ? 1 : -1;
      const i = (N - 8 - row * 6 + N) % N;
      const P = track.P[i], T = track.T[i], Nr = track.Nr[i];
      const me = o.human ? api.getMe(o.human.index) : null;
      const color = o.human ? o.human.color : CPU_COLORS[o.cpu % CPU_COLORS.length];
      const vis = buildKart(color, me);
      scene.add(vis.root);
      karts.push({
        vis, color, human: o.human || null, name: o.human ? me.name : CPU_NAMES[o.cpu % CPU_NAMES.length],
        x: P.x + Nr.x * 3.5 * side, z: P.z + Nr.z * 3.5 * side, h: Math.atan2(T.x, T.z), speed: 0,
        idx: i, lap: 0, half: true, finished: false, finishTime: 0, place: gi + 1,
        item: null, roulette: 0, spin: 0, boost: 0, star: 0, drift: 0, driftDir: 0, driftCharge: 0,
        ai: { offset: (Math.random() - 0.5) * 6, skill: 0.88 + Math.random() * 0.1, itemDelay: 2 + Math.random() * 3 },
        cam: null, wobble: 0, lastLapTime: 0,
      });
    });
    for (const k of karts) if (k.human) {
      const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 2600);
      k.cam = cam;
      placeCam(k, 1);
    }
    state = 'countdown'; countdown = 3.99; raceTime = 0; lastBeep = 4;
    api.setRemoteMode('sideways');
    api.showCursors(false);
    api.music('kart');
  }

  function forward(k) { return [Math.sin(k.h), Math.cos(k.h)]; }
  function placeCam(k, lerp) {
    const [fx, fz] = forward(k);
    const back = 7 + k.speed * 0.05, height = 3.3;
    const tx = k.x - fx * back, tz = k.z - fz * back;
    const c = k.cam;
    c.position.x += (tx - c.position.x) * lerp;
    c.position.z += (tz - c.position.z) * lerp;
    c.position.y += (height - c.position.y) * lerp;
    c.lookAt(k.x + fx * 5, 1.2, k.z + fz * 5);
    const fov = 70 + (k.boost > 0 || k.star > 0 ? 10 : 0) + k.speed * 0.15;
    c.fov += (fov - c.fov) * 0.1; c.updateProjectionMatrix();
  }

  function nearestIdx(k) {
    const P = track.P;
    let best = k.idx, bd = Infinity;
    for (let d = -25; d <= 40; d++) {
      const i = (k.idx + d + N) % N;
      const dx = P[i].x - k.x, dz = P[i].z - k.z, dd = dx * dx + dz * dz;
      if (dd < bd) { bd = dd; best = i; }
    }
    if (bd > 60 * 60) { // lost? full search
      for (let i = 0; i < N; i++) { const dx = P[i].x - k.x, dz = P[i].z - k.z, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; best = i; } }
    }
    return best;
  }

  function rollItem(k) {
    const pos = k.place / karts.length;
    const r = Math.random();
    if (pos > 0.66) return r < 0.4 ? 'boost' : r < 0.6 ? 'star' : r < 0.85 ? 'shell' : 'banana';
    if (pos > 0.33) return r < 0.35 ? 'boost' : r < 0.6 ? 'shell' : r < 0.9 ? 'banana' : 'star';
    return r < 0.55 ? 'banana' : r < 0.85 ? 'shell' : 'boost';
  }

  const bananaGeo = new THREE.TorusGeometry(0.45, 0.16, 6, 12, Math.PI * 1.2);
  const bananaMat = new THREE.MeshLambertMaterial({ color: 0xffe14a });
  const shellGeo = new THREE.SphereGeometry(0.55, 12, 8);
  const shellMat = new THREE.MeshLambertMaterial({ color: 0x2ecc40 });
  function useItem(k, back) {
    const it = k.item; k.item = null;
    if (!it) return;
    const [fx, fz] = forward(k);
    if (it === 'boost') { k.boost = 1.3; api.audio.play('boost'); }
    else if (it === 'star') { k.star = 6; api.audio.play('powerup'); }
    else if (it === 'banana') {
      const m = new THREE.Mesh(bananaGeo, bananaMat); scene.add(m);
      const d = back ? -3 : 16;
      items.push({ type: 'banana', mesh: m, x: k.x + fx * d, z: k.z + fz * d, vx: 0, vz: 0, life: 60, owner: k, age: 0 });
      api.audio.play('whoosh');
    } else if (it === 'shell') {
      const m = new THREE.Mesh(shellGeo, shellMat); scene.add(m);
      const dir = back ? -1 : 1;
      items.push({ type: 'shell', mesh: m, x: k.x + fx * 2.5 * dir, z: k.z + fz * 2.5 * dir, vx: fx * 48 * dir, vz: fz * 48 * dir, life: 5, owner: k, age: 0 });
      api.audio.play('whoosh');
    }
  }
  function hitKart(k) {
    if (k.star > 0 || k.spin > 0) return false;
    k.spin = 1.2; k.speed *= 0.3; k.drift = 0; k.driftCharge = 0;
    api.audio.play('spin');
    if (k.human) api.rumble(k.human.index, 300);
    return true;
  }

  // ---------- update ----------
  let lastBeep = 4;
  function controls(k) {
    const p = k.human;
    let steer = 0, gas = false, brake = false, drift = false, use = false, back = false;
    if (p) {
      steer = p.dirX();
      if (!steer && p.phone && p.hasMotion) { steer = Math.abs(p.steer) < 0.06 ? 0 : p.steer; }
      gas = p.down(api.BTN.TWO); brake = p.down(api.BTN.ONE);
      drift = p.down(api.BTN.B);
      use = p.pressed(api.BTN.UP) || p.pressed(api.BTN.A);
      back = p.pressed(api.BTN.DOWN);
    } else {
      const ti = (k.idx + 10 + Math.floor(k.speed * 0.35)) % N;
      k.ai.offset += (Math.random() - 0.5) * 0.2; k.ai.offset = Math.max(-5, Math.min(5, k.ai.offset));
      const tp = track.P[ti], tn = track.Nr[ti];
      const tx = tp.x + tn.x * k.ai.offset, tz = tp.z + tn.z * k.ai.offset;
      const desired = Math.atan2(tx - k.x, tz - k.z);
      steer = Math.max(-1, Math.min(1, -wrapAngle(desired - k.h) * 2.6));
      gas = true;
      if (k.item) { k.ai.itemDelay -= 1 / 60; if (k.ai.itemDelay <= 0) { use = true; back = k.item === 'banana' && Math.random() < 0.7; k.ai.itemDelay = 2 + Math.random() * 4; } }
    }
    return { steer, gas, brake, drift, use, back };
  }

  function stepKart(k, dt) {
    const c = state === 'race' && !k.finished ? controls(k) : (k.finished && !k.human ? controls(k) : { steer: 0, gas: k.finished, brake: false, drift: false, use: false, back: false });
    if (k.finished && k.human) { // autopilot after finishing
      const cc = (() => { const save = k.human; k.human = null; const r = controls(k); k.human = save; return r; })();
      c.steer = cc.steer; c.gas = true;
    }
    if (c.use && k.item && k.roulette <= 0) useItem(k, c.back);
    if (c.back && k.item && k.roulette <= 0) useItem(k, true);

    const lateral = latOffset(k);
    const off = Math.abs(lateral) > W + 1.2;
    let max = MAX_SPEED * (k.human ? (cheat('turbo') ? 1.35 : 1) : k.ai.skill);
    if (!k.human) {
      const lead = karts.filter((o) => o.human).reduce((m, o) => Math.max(m, progress(o)), 0);
      if (progress(k) < lead - 60) max *= 1.08; // rubber band
    }
    if (off && k.star <= 0) max *= 0.5;
    if (k.boost > 0) { max *= 1.4; k.boost -= dt; }
    if (k.star > 0) { max *= 1.18; k.star -= dt; }

    if (k.spin > 0) {
      k.spin -= dt;
      k.speed *= Math.pow(0.2, dt);
      k.vis.model.rotation.y += dt * 14;
      if (k.spin <= 0) k.vis.model.rotation.y = 0;
    } else {
      if (k.boost > 0 || k.star > 0) k.speed += 40 * dt;
      else if (c.gas) k.speed += (k.speed < max * 0.6 ? 22 : 12) * dt;
      else if (c.brake) k.speed -= (k.speed > 0 ? 35 : 10) * dt;
      else k.speed -= Math.sign(k.speed) * Math.min(Math.abs(k.speed), 8 * dt);
      if (k.speed > max) k.speed = Math.max(max, k.speed - 30 * dt);
      if (k.speed < -9) k.speed = -9;

      // drifting
      if (c.drift && !k.drift && Math.abs(c.steer) > 0.3 && k.speed > 14) { k.drift = 1; k.driftDir = Math.sign(c.steer); k.driftCharge = 0; api.audio.play('bump'); }
      if (k.drift && (!c.drift || k.speed < 8)) {
        if (k.driftCharge > 1.1 && k.speed > 8) { k.boost = k.driftCharge > 2.2 ? 1.1 : 0.6; api.audio.play('boost'); }
        k.drift = 0; k.driftCharge = 0;
      }
      let steer = c.steer;
      if (k.drift) { steer = k.driftDir * 0.75 + c.steer * 0.45; k.driftCharge += dt * (Math.sign(c.steer) === k.driftDir ? 1.3 : 0.7); }
      const grip = Math.min(1, Math.abs(k.speed) / 8) * Math.sign(k.speed || 1);
      k.h -= steer * (k.drift ? 2.3 : 1.9) * grip * dt;
      k.vis.model.rotation.y += ((k.drift ? -k.driftDir * 0.45 : -steer * 0.12) - k.vis.model.rotation.y) * Math.min(1, dt * 10);
    }
    const [fx, fz] = forward(k);
    k.x += fx * k.speed * dt; k.z += fz * k.speed * dt;

    // invisible wall
    const lat2 = latOffset(k);
    if (Math.abs(lat2) > W + 22) {
      const n = track.Nr[k.idx], push = Math.abs(lat2) - (W + 22);
      k.x -= n.x * push * Math.sign(lat2); k.z -= n.z * push * Math.sign(lat2);
      k.speed *= 0.7;
    }

    // progress / laps
    const ni = nearestIdx(k);
    if (k.idx > N * 0.4 && k.idx < N * 0.6) k.half = true;
    if (k.idx > N - 60 && ni < 60) {
      if (k.half) {
        k.lap++; k.half = false;
        if (k.human && k.lap > 1 && k.lap <= LAPS) { api.audio.play(k.lap === LAPS ? 'bell' : 'beep'); }
        if (k.lap > LAPS && !k.finished) { k.finished = true; k.finishTime = raceTime; if (k.human) { api.audio.play('win'); api.rumble(k.human.index, 400); } }
      }
    } else if (ni > N - 60 && k.idx < 60) { k.lap--; k.half = true; }
    k.idx = ni;

    // visuals
    const r = k.vis.root;
    r.position.set(k.x, 0, k.z);
    r.rotation.y = k.h;
    k.wobble += dt * k.speed;
    k.vis.model.position.y = off ? Math.abs(Math.sin(k.wobble * 2)) * 0.08 : 0;
    for (const w of k.vis.wheels) w.rotation.x += k.speed * dt / 0.42;
    const sparkOn = !!k.drift && k.driftCharge > 0.4;
    for (const s of k.vis.sparks) {
      s.visible = sparkOn && Math.random() < 0.85;
      s.material.color.set(k.driftCharge > 2.2 ? 0xff8a2a : 0x66ccff);
      s.scale.setScalar(0.6 + Math.random() * 0.6);
    }
    k.vis.body.material.emissive = k.vis.body.material.emissive || new THREE.Color();
    if (k.star > 0) k.vis.body.material.emissive.setHSL((raceTime * 3) % 1, 1, 0.4);
    else k.vis.body.material.emissive.setRGB(0, 0, 0);
    const flaming = k.boost > 0 || k.star > 0;
    for (const f of k.vis.flames) {
      f.visible = flaming || (k.speed > MAX_SPEED * 0.85 && Math.random() < 0.3);
      const fl = flaming ? 1 : 0.4;
      f.scale.set(fl * (0.8 + Math.random() * 0.4), fl * (0.7 + Math.random() * 0.8), fl);
      f.material.color.setHSL(0.06 + Math.random() * 0.06, 1, 0.55);
    }
  }
  function latOffset(k) {
    const p = track.P[k.idx], n = track.Nr[k.idx];
    return (k.x - p.x) * n.x + (k.z - p.z) * n.z;
  }
  function progress(k) { return k.lap * N + k.idx + (k.finished ? 100000 - k.finishTime * 10 : 0); }

  function collisions(dt) {
    for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i], b = karts[j];
      const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
      if (d2 < 2.4 * 2.4 && d2 > 0.0001) {
        const d = Math.sqrt(d2), push = (2.4 - d) / 2, nx = dx / d, nz = dz / d;
        a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
        if (a.star > 0 && b.star <= 0) hitKart(b);
        else if (b.star > 0 && a.star <= 0) hitKart(a);
        else { a.speed *= 0.97; b.speed *= 0.97; }
        if (a.human) api.rumble(a.human.index, 40);
        if (b.human) api.rumble(b.human.index, 40);
      }
    }
    // item boxes
    for (const bx of boxes) {
      if (bx.cool > 0) { bx.cool -= dt; bx.mesh.visible = bx.cool <= 0; continue; }
      bx.mesh.rotation.y += dt * 1.5; bx.mesh.rotation.x += dt * 0.7;
      bx.mesh.position.y = 1.2 + Math.sin(raceTime * 3 + bx.x) * 0.2;
      for (const k of karts) {
        const dx = k.x - bx.x, dz = k.z - bx.z;
        if (dx * dx + dz * dz < 2.6 * 2.6) {
          bx.cool = 3; bx.mesh.visible = false;
          if (!k.item && k.roulette <= 0) { k.roulette = 1.1; k.pending = rollItem(k); if (k.human) api.audio.play('item'); }
          break;
        }
      }
    }
    // items
    for (const it of items) {
      it.age += dt; it.life -= dt;
      if (it.type === 'shell') {
        it.x += it.vx * dt; it.z += it.vz * dt;
        // bounce off the outer wall
        let bi = 0, bd = Infinity;
        for (let i = 0; i < N; i += 2) { const dx = track.P[i].x - it.x, dz = track.P[i].z - it.z, d = dx * dx + dz * dz; if (d < bd) { bd = d; bi = i; } }
        const n = track.Nr[bi], lat = (it.x - track.P[bi].x) * n.x + (it.z - track.P[bi].z) * n.z;
        if (Math.abs(lat) > W + 2) { const vn = it.vx * n.x + it.vz * n.z; if (vn * lat > 0) { it.vx -= 2 * vn * n.x; it.vz -= 2 * vn * n.z; api.audio.play('bounce'); } }
        it.mesh.position.set(it.x, 0.55, it.z);
      } else {
        it.mesh.position.set(it.x, 0.35, it.z);
        it.mesh.rotation.y += dt;
      }
      for (const k of karts) {
        if (k === it.owner && it.age < 0.5) continue;
        const dx = k.x - it.x, dz = k.z - it.z;
        if (dx * dx + dz * dz < 1.9 * 1.9) { hitKart(k); it.life = 0; break; }
      }
    }
    for (const it of items) if (it.life <= 0) scene.remove(it.mesh);
    items = items.filter((it) => it.life > 0);
  }

  function update(dt) {
    if (!scene || state === 'setup') { renderSetupBg(); return; }
    if (state === 'countdown') {
      countdown -= dt;
      const n = Math.ceil(countdown);
      if (n !== lastBeep && n > 0) { lastBeep = n; api.audio.play('beep'); }
      if (countdown <= 0) { state = 'race'; api.audio.play('go'); }
    }
    if (state === 'race' || state === 'done') raceTime += dt;
    for (const k of karts) {
      if (k.roulette > 0) { k.roulette -= dt; if (k.roulette <= 0) { k.item = k.pending; } }
      stepKart(k, dt);
    }
    collisions(dt);
    const sorted = [...karts].sort((a, b) => progress(b) - progress(a));
    sorted.forEach((k, i) => { k.place = i + 1; });
    if (state === 'race' && karts.filter((k) => k.human).every((k) => k.finished)) { state = 'done'; doneTimer = 3; api.audio.music(null); api.audio.stopMusic(); api.audio.play('cheer'); }
    if (state === 'done') { doneTimer -= dt; if (doneTimer <= 0 && !ui) showResults(); }
    render();
  }

  // ---------- rendering ----------
  function viewports() {
    const w = root.clientWidth, h = root.clientHeight;
    const hs = karts.filter((k) => k.human);
    const n = hs.length;
    if (n <= 1) return hs.map((k) => ({ k, x: 0, y: 0, w, h }));
    if (n === 2) return hs.map((k, i) => ({ k, x: 0, y: i === 0 ? h / 2 : 0, w, h: h / 2 }));
    return hs.map((k, i) => ({ k, x: (i % 2) * w / 2, y: i < 2 ? h / 2 : 0, w: w / 2, h: h / 2 }));
  }
  function render() {
    const lead = karts.find((k) => k.human) || karts[0];
    const sun = scene.userData.sun;
    if (sun && lead) { sun.position.set(lead.x + 40, 90, lead.z + 25); sun.target.position.set(lead.x, 0, lead.z); }
    const vps = viewports();
    const H = root.clientHeight;
    renderer.setScissorTest(true);
    for (const v of vps) {
      placeCam(v.k, 0.15);
      v.k.cam.aspect = v.w / v.h; v.k.cam.updateProjectionMatrix();
      renderer.setViewport(v.x, v.y, v.w, v.h);
      renderer.setScissor(v.x, v.y, v.w, v.h);
      renderer.render(scene, v.k.cam);
    }
    renderer.setScissorTest(false);
    // HUD (canvas coords: y from top)
    hctx.clearRect(0, 0, hud.width, hud.height);
    for (const v of vps) {
      const top = H - v.y - v.h;
      drawHud(v.k, v.x, top, v.w, v.h);
    }
    if (vps.length > 1) { hctx.fillStyle = '#000'; hctx.fillRect(0, H / 2 - 2, hud.width, 4); if (vps.length > 2) hctx.fillRect(hud.width / 2 - 2, 0, 4, H); }
    drawMinimap(vps.length);
    if (state === 'countdown') {
      const n = Math.ceil(countdown);
      bigText(hctx, n > 3 ? '' : String(n), hud.width / 2, H / 2, H * 0.22, '#ffd23a', '#7a3d00');
    } else if (state === 'race' && raceTime < 1) {
      bigText(hctx, 'GO!', hud.width / 2, H / 2, H * 0.22, '#5be35b', '#0f5a0f');
    }
  }
  function drawHud(k, x, y, w, h) {
    const s = Math.min(w, h * 1.6) / 1000;
    hctx.save();
    // place
    const placeCol = ['#ffd23a', '#d9e3ea', '#e0a060'][k.place - 1] || '#ffffff';
    bigText(hctx, k.finished ? ordinal(k.place) : ordinal(k.place), x + w - 110 * s * 1.4, y + h - 80 * s * 1.4, 120 * s * 1.4, placeCol, '#222');
    // lap + time
    hctx.textAlign = 'left';
    bigText(hctx, `Lap ${Math.max(1, Math.min(LAPS, k.lap))}/${LAPS}`, x + 140 * s * 1.4, y + 50 * s * 1.4, 46 * s * 1.4, '#fff', '#222');
    const t = k.finished ? k.finishTime : raceTime;
    bigText(hctx, fmtTime(t), x + w - 150 * s * 1.4, y + 50 * s * 1.4, 40 * s * 1.4, '#fff', '#222');
    // item slot
    const bxs = 110 * s * 1.4;
    hctx.fillStyle = 'rgba(255,255,255,.85)'; hctx.strokeStyle = '#35b6ff'; hctx.lineWidth = 5 * s * 1.4;
    roundRect(hctx, x + 20 * s * 1.4, y + 90 * s * 1.4, bxs, bxs, 18 * s * 1.4); hctx.fill(); hctx.stroke();
    const icon = k.roulette > 0 ? Object.values(ITEM_ICONS)[Math.floor(raceTime * 14) % 4] : k.item ? ITEM_ICONS[k.item] : '';
    if (icon) { hctx.font = `${bxs * 0.7}px serif`; hctx.textAlign = 'center'; hctx.textBaseline = 'middle'; hctx.fillText(icon, x + 20 * s * 1.4 + bxs / 2, y + 90 * s * 1.4 + bxs / 2 + 4); hctx.textBaseline = 'alphabetic'; }
    // name tag / finish banner
    if (k.finished) bigText(hctx, 'FINISH!', x + w / 2, y + h * 0.35, 110 * s * 1.4, '#fff', k.color);
    if (k.drift && k.driftCharge > 1.1) bigText(hctx, k.driftCharge > 2.2 ? '🔥 SUPER DRIFT' : '✨ DRIFT', x + w / 2, y + h - 40 * s * 1.4, 40 * s * 1.4, '#fff', k.driftCharge > 2.2 ? '#c55' : '#38c');
    hctx.restore();
  }
  function drawMinimap(n) {
    const size = Math.min(hud.width, hud.height) * (n > 1 ? 0.22 : 0.25);
    const x0 = n > 1 ? hud.width / 2 - size / 2 : 20, y0 = n > 1 ? hud.height / 2 - size / 2 : hud.height - size - 20;
    let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
    for (const p of track.P) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z); }
    const sc = size / Math.max(maxx - minx, maxz - minz);
    const mx = (x) => x0 + (x - minx) * sc, mz = (z) => y0 + size - (z - minz) * sc;
    hctx.save();
    hctx.globalAlpha = 0.85;
    hctx.strokeStyle = '#222'; hctx.lineWidth = 9; hctx.lineJoin = 'round';
    hctx.beginPath(); track.P.forEach((p, i) => (i ? hctx.lineTo(mx(-p.x + minx + maxx), mz(p.z)) : hctx.moveTo(mx(-p.x + minx + maxx), mz(p.z)))); hctx.closePath(); hctx.stroke();
    hctx.strokeStyle = '#fff'; hctx.lineWidth = 5; hctx.stroke();
    for (const k of karts) {
      hctx.fillStyle = k.color; hctx.strokeStyle = '#000'; hctx.lineWidth = 2;
      hctx.beginPath(); hctx.arc(mx(-k.x + minx + maxx), mz(k.z), k.human ? 7 : 5, 0, 7); hctx.fill(); hctx.stroke();
    }
    hctx.restore();
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fmtTime(t) { const m = Math.floor(t / 60), s = t % 60; return `${m}'${s.toFixed(2).padStart(5, '0')}`; }

  // setup screen background: slowly orbit the selected track
  let orbit = 0, previewCam = new THREE.PerspectiveCamera(55, 1, 0.1, 2600), previewFor = -1;
  function renderSetupBg() {
    if (previewFor !== trackIndex) { track = buildTrack(TRACKS[trackIndex]); scene.fog = null; previewFor = trackIndex; karts = []; items = []; }
    orbit += 0.003;
    const c = track.P[0];
    let cx = 0, cz = 0; for (const p of track.P) { cx += p.x; cz += p.z; } cx /= N; cz /= N;
    previewCam.position.set(cx + Math.cos(orbit) * 260, 170, cz + Math.sin(orbit) * 260);
    previewCam.lookAt(cx, 0, cz);
    previewCam.aspect = root.clientWidth / root.clientHeight; previewCam.updateProjectionMatrix();
    renderer.setViewport(0, 0, root.clientWidth, root.clientHeight);
    renderer.render(scene, previewCam);
    hctx.clearRect(0, 0, hud.width, hud.height);
    void c;
  }

  // ---------- menus ----------
  function setup() {
    state = 'setup';
    if (ui) ui.remove();
    api.music('kart');
    ui = overlay(api, `
      <h1>Woo Kart</h1>
      <h2>Choose a track</h2>
      <div class="g-row">${TRACKS.map((t, i) => `<div class="pill ${i === trackIndex ? 'sel' : ''}" data-ui="track" data-i="${i}">${t.name}</div>`).join('')}</div>
      <p>${api.active().length} player(s) + CPUs · ${LAPS} laps</p>
      <div class="pill" data-ui="go" style="min-width:30vw">Start Race!</div>
      <p class="g-hint">Hold your remote sideways 📱↔ &nbsp; <b>2</b> gas · <b>1</b> brake · <b>tilt</b> or <b>D-pad</b> steer · <b>B</b> drift · <b>D-pad ↑ / A</b> item (↓ = drop behind)<br>
      Keyboard: X gas · Z brake · ←/→ steer · Shift drift · Enter/↑ item</p>
      <div class="pill small" data-ui="quit">Woo Menu</div>`, {
      track: (el) => { trackIndex = +el.dataset.i; setup(); },
      go: () => { ui.remove(); ui = null; spawnRace(); },
      quit: () => api.exit(),
    }, 'kart-setup');
    ui.style.background = 'rgba(255,255,255,.72)';
  }
  function showResults() {
    const sorted = [...karts].sort((a, b) => progress(b) - progress(a));
    const pts = [15, 12, 10, 8, 6, 4, 2, 1];
    ui = overlay(api, `
      <h1>Race Results</h1>
      <table class="score"><tr><th>#</th><th>Racer</th><th>Time</th><th>Points</th></tr>
      ${sorted.map((k, i) => `<tr style="${k.human ? 'font-weight:800' : ''}"><td>${ordinal(i + 1)}</td><td style="color:${k.color}">${k.name}${k.human ? ` (P${k.human.index + 1})` : ''}</td><td>${k.finished ? fmtTime(k.finishTime) : '--'}</td><td>${pts[i] || 0}</td></tr>`).join('')}
      </table>
      <div class="g-row"><div class="pill" data-ui="again">Race Again</div><div class="pill" data-ui="setup">Change Track</div><div class="pill" data-ui="quit">Woo Menu</div></div>`, {
      again: () => { ui.remove(); ui = null; clearScene(); spawnRace(); },
      setup: () => { ui.remove(); ui = null; clearScene(); previewFor = -1; setup(); },
      quit: () => api.exit(),
    });
    ui.style.background = 'rgba(255,255,255,.8)';
  }
  function clearScene() {
    if (!scene) return;
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    scene = null;
  }

  setup();
  return {
    update,
    resize,
    destroy() { clearScene(); renderer.dispose(); },
  };
}
