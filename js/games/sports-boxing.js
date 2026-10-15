// Woo Sports: Boxing. Swing = punch (left/right from swing direction, else alternating),
// hold B = guard, D-pad ←/→ = dodge. 2 humans = split screen, 1 human = vs CPU.
import { buildMe3D } from '../me.js';
import { bigText, overlay } from './common.js';

export function create(env) {
  const { api, THREE, renderer, hctx, hud, root } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12141f);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 0.9));
  const spot = new THREE.SpotLight(0xffffff, 120, 30, 0.7, 0.4);
  spot.position.set(0, 9, 0); spot.castShadow = true; scene.add(spot);

  // ring
  const ring = new THREE.Mesh(new THREE.BoxGeometry(7, 0.8, 7), new THREE.MeshLambertMaterial({ color: 0x2b5fd9 }));
  ring.position.y = -0.4; ring.receiveShadow = true; scene.add(ring);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 6.6), new THREE.MeshLambertMaterial({ color: 0xe9e4d8 }));
  mat.rotation.x = -Math.PI / 2; mat.position.y = 0.01; mat.receiveShadow = true; scene.add(mat);
  const postMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
  const ropeMats = [0xe23b3b, 0xffffff, 0x2f6fe0].map((c) => new THREE.MeshLambertMaterial({ color: c }));
  for (const [x, z] of [[-3.3, -3.3], [3.3, -3.3], [3.3, 3.3], [-3.3, 3.3]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6), postMat); p.position.set(x, 0.8, z); scene.add(p);
  }
  for (let k = 0; k < 3; k++) {
    for (const [ax, az, len, rot] of [[0, -3.3, 6.6, 0], [0, 3.3, 6.6, 0], [-3.3, 0, 6.6, 1], [3.3, 0, 6.6, 1]]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len), ropeMats[k]);
      r.rotation.z = Math.PI / 2; if (rot) r.rotation.y = Math.PI / 2;
      r.position.set(ax, 0.5 + k * 0.4, az); scene.add(r);
    }
  }
  // crowd
  for (let i = 0; i < 120; i++) {
    const a = Math.random() * Math.PI * 2, d = 7 + Math.random() * 5;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.4, 0.35) }));
    b.position.set(Math.cos(a) * d, 0.3 + Math.random() * 1.5, Math.sin(a) * d); scene.add(b);
  }

  const humans = api.active().slice(0, 2);
  const cpuMe = { name: 'Big Brock', skin: 3, hair: 0, hairStyle: 2, eyes: 2, mouth: 1, shirt: 1, glasses: false };
  const gloveGeo = new THREE.SphereGeometry(0.14, 12, 10);
  const boxers = [0, 1].map((i) => {
    const human = humans[i] || null;
    const me = human ? api.getMe(human.index) : cpuMe;
    const fig = buildMe3D(THREE, me);
    fig.scale.setScalar(1.15);
    const gloveMat = new THREE.MeshLambertMaterial({ color: i === 0 ? 0xe23b3b : 0x2f6fe0 });
    for (const arm of fig.userData.arms) { const g = new THREE.Mesh(gloveGeo, gloveMat); g.position.y = -0.52; arm.add(g); }
    scene.add(fig);
    const mats = []; fig.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
    return {
      i, human, me, fig, mats, color: human ? human.color : '#e23b3b', z: i === 0 ? -0.85 : 0.85, x: 0,
      hp: 100, downs: 0, punch: null, nextHand: 0, guard: false, dodge: 0, dodgeT: 0, stun: 0, hitFlash: 0,
      ai: { t: 1.5, guardT: 0 }, wins: 0, cam: new THREE.PerspectiveCamera(65, 1, 0.05, 100), score: 0,
    };
  });
  let state = 'menu', timer = 90, msg = '', msgT = 0, countT = 0, downed = null;

  function opp(b) { return boxers[1 - b.i]; }
  function throwPunch(b, hand, power) {
    if (b.punch || b.stun > 0 || state !== 'fight') return;
    b.punch = { hand, t: 0, power, hit: false };
    api.audio.play('whoosh');
  }
  function resolvePunch(b) {
    const o = opp(b);
    if (o.dodge && o.dodgeT > 0 && Math.random() < 0.8) { msg = 'Dodged!'; msgT = 0.6; return; }
    const dmg = 5 + b.punch.power * 9;
    if (o.guard) { o.hp -= dmg * 0.12; api.audio.play('block'); if (o.human) api.rumble(o.human.index, 40); return; }
    o.hp -= dmg; o.hitFlash = 0.25; o.stun = 0.25;
    b.score += Math.round(dmg);
    api.audio.play('punch');
    if (o.human) api.rumble(o.human.index, 180);
    if (b.human) api.rumble(b.human.index, 60);
    if (o.hp <= 0) knockDown(o);
  }
  function knockDown(b) {
    b.hp = 0; b.downs++; downed = b; state = 'down'; countT = 0;
    api.audio.play('cheer');
    if (b.downs >= 3) { msg = 'K.O.!'; msgT = 3; setTimeout(() => finish(opp(b)), 3000); state = 'ko'; }
  }

  function controls(b, dt) {
    if (b.human) {
      const p = b.human, B = api.BTN;
      b.guard = p.down(B.B) || p.down(B.ONE);
      const dx = p.dirX();
      if (dx && !b.dodgeT) { b.dodge = dx; b.dodgeT = 0.45; }
      const sw = p.takeSwing();
      if (sw && !b.guard) {
        const hand = sw.dir ? (sw.dir > 0 ? 1 : 0) : b.nextHand;
        b.nextHand = 1 - hand;
        throwPunch(b, hand, sw.power);
      }
      if (p.pressed(B.A) && !b.guard) { throwPunch(b, b.nextHand, 0.45); b.nextHand = 1 - b.nextHand; }
    } else {
      const o = opp(b);
      b.ai.t -= dt;
      if (o.punch && o.punch.t < 0.05 && Math.random() < 0.012 / dt * 0.3) { b.guard = true; b.ai.guardT = 0.6; }
      if (b.ai.guardT > 0) { b.ai.guardT -= dt; if (b.ai.guardT <= 0) b.guard = false; }
      if (b.ai.t <= 0 && !b.guard) {
        throwPunch(b, Math.random() < 0.5 ? 0 : 1, 0.3 + Math.random() * 0.5);
        b.ai.t = 0.5 + Math.random() * 1.1;
        if (Math.random() < 0.15) { b.dodge = Math.random() < 0.5 ? -1 : 1; b.dodgeT = 0.45; }
      }
    }
  }

  function animate(b, dt) {
    if (b.dodgeT > 0) { b.dodgeT -= dt; if (b.dodgeT <= 0) { b.dodgeT = 0; b.dodge = 0; } }
    if (b.stun > 0) b.stun -= dt;
    if (b.hitFlash > 0) b.hitFlash -= dt;
    const faceSign = b.i === 0 ? 1 : -1;
    const lean = b.dodgeT > 0 ? b.dodge * Math.sin((b.dodgeT / 0.45) * Math.PI) * 0.5 : 0;
    // seen from behind, screen-right is world -x for boxer 0 and +x for boxer 1
    b.fig.position.set(b.x - lean * 0.6 * faceSign, 0, b.z - (b.stun > 0 ? 0.15 * faceSign : 0));
    b.fig.rotation.set(0, b.i === 0 ? 0 : Math.PI, lean * 0.4);
    const arms = b.fig.userData.arms;
    for (let h = 0; h < 2; h++) {
      const arm = arms[h];
      let rx = b.guard ? -2.6 : -1.9, rz = b.guard ? (h ? 0.55 : -0.55) : (h ? 0.25 : -0.25);
      if (b.punch && b.punch.hand === h) {
        const k = Math.sin(Math.min(1, b.punch.t / 0.3) * Math.PI);
        rx = -1.9 + (-1.6 + 1.9) * k; rz = rz * (1 - k) + (h ? 0.35 : -0.35) * k;
        arm.position.z = 0.25 * k;
      } else arm.position.z = 0;
      arm.rotation.set(rx, 0, rz);
    }
    if (b.punch) {
      b.punch.t += dt;
      if (!b.punch.hit && b.punch.t > 0.14) { b.punch.hit = true; resolvePunch(b); }
      if (b.punch.t > 0.32) b.punch = null;
    }
    const head = b.fig.userData.head;
    head.rotation.x = b.stun > 0 ? -0.4 : 0;
    for (const m of b.mats) m.emissive && m.emissive.setRGB(b.hitFlash > 0 ? 0.5 : 0, 0, 0);
  }

  function update(dt) {
    if (state === 'menu') { render(); return; }
    if (msgT > 0) msgT -= dt;
    if (state === 'fight') {
      timer -= dt;
      for (const b of boxers) controls(b, dt);
      if (timer <= 0) { timer = 0; state = 'ko'; msg = 'TIME!'; msgT = 3; const w = boxers[0].hp + (3 - boxers[0].downs) * 100 >= boxers[1].hp + (3 - boxers[1].downs) * 100 ? boxers[0] : boxers[1]; setTimeout(() => finish(w), 2500); }
    } else if (state === 'down') {
      countT += dt;
      downed.fig.rotation.x = -Math.min(1.4, countT * 4) * (downed.i === 0 ? 1 : -1);
      downed.fig.position.y = 0;
      if (countT > 4) { downed.hp = 60 - downed.downs * 15; downed.fig.rotation.x = 0; state = 'fight'; msg = 'FIGHT!'; msgT = 1; }
      render(); return;
    } else if (state === 'countdown') {
      countT -= dt;
      if (countT <= 0) { state = 'fight'; msg = 'FIGHT!'; msgT = 1; api.audio.play('bell'); }
    }
    if (state !== 'ko' || !boxers.some((b) => b.hp <= 0)) for (const b of boxers) animate(b, dt);
    render();
  }

  function render() {
    const W = root.clientWidth, H = root.clientHeight;
    const views = humans.length >= 2 ? [{ b: boxers[0], x: 0, w: W / 2 }, { b: boxers[1], x: W / 2, w: W / 2 }] : [{ b: boxers[0], x: 0, w: W }];
    renderer.setScissorTest(true);
    for (const v of views) {
      const b = v.b, o = opp(b), dir = b.i === 0 ? 1 : -1;
      for (const m of b.mats) { m.opacity = 0.3; m.depthWrite = false; }
      for (const m of o.mats) { m.opacity = 1; m.depthWrite = true; }
      b.fig.userData.head.visible = false; o.fig.userData.head.visible = true;
      b.cam.position.set(b.x * 0.5, 2.15, b.z - dir * 1.3);
      b.cam.lookAt(o.fig.position.x, 1.5, o.z);
      b.cam.aspect = v.w / H; b.cam.updateProjectionMatrix();
      renderer.setViewport(v.x, 0, v.w, H); renderer.setScissor(v.x, 0, v.w, H);
      renderer.render(scene, b.cam);
    }
    renderer.setScissorTest(false);
    hctx.clearRect(0, 0, hud.width, hud.height);
    if (state === 'menu') return;
    // health bars
    boxers.forEach((b, k) => {
      const bw = W * 0.38, x = k === 0 ? 20 : W - 20 - bw, y = 20;
      hctx.fillStyle = 'rgba(0,0,0,.5)'; hctx.fillRect(x, y, bw, 34);
      hctx.fillStyle = b.hp > 30 ? '#5be35b' : '#ff5a4a';
      const f = Math.max(0, b.hp) / 100;
      hctx.fillRect(k === 0 ? x + 3 : x + 3 + (bw - 6) * (1 - f), y + 3, (bw - 6) * f, 28);
      hctx.font = '800 22px Arial'; hctx.fillStyle = '#fff'; hctx.textAlign = k === 0 ? 'left' : 'right';
      hctx.fillText(`${b.me.name}  ${'★'.repeat(b.downs)}`, k === 0 ? x : x + bw, y + 60);
    });
    hctx.textAlign = 'center'; hctx.font = '800 40px Arial'; hctx.fillStyle = '#fff';
    hctx.fillText(Math.ceil(timer), W / 2, 52);
    if (humans.length >= 2) { hctx.fillStyle = '#000'; hctx.fillRect(W / 2 - 2, 70, 4, H); }
    if (state === 'down') bigText(hctx, String(Math.min(10, Math.floor(countT * 2) + 1)), W / 2, H / 2, H * 0.25, '#fff', '#c22');
    if (state === 'countdown') bigText(hctx, 'Round 1', W / 2, H / 2, H * 0.14, '#ffd23a', '#000');
    if (msgT > 0) bigText(hctx, msg, W / 2, H * 0.4, H * 0.1, '#fff', '#c22');
    if (state === 'fight' && timer > 85) bigText(hctx, 'Swing = punch · hold B = guard · D-pad ←/→ = dodge', W / 2, H - 40, H * 0.035, '#fff', '#000');
  }

  function finish(w) {
    const rows = boxers.map((b) => ({ name: b.me.name, color: b.color, me: b.me, score: b.score + (b === w ? 100 : 0) })).sort((a, b) => b.score - a.score);
    import('./common.js').then(({ resultsOverlay }) => {
      const o = resultsOverlay(api, `🥊 ${w.me.name} wins!`, rows, { again: begin, scoreLabel: 'Points' });
      const back = document.createElement('div'); back.className = 'pill small'; back.textContent = 'Other Sports'; back.dataset.ui = 'x';
      o.querySelector('.g-row').appendChild(back);
      back.addEventListener('click', () => { o.remove(); env.back(); });
    });
  }
  function begin() {
    for (const b of boxers) Object.assign(b, { hp: 100, downs: 0, punch: null, guard: false, dodge: 0, dodgeT: 0, stun: 0, score: 0 });
    for (const b of boxers) { b.fig.rotation.set(0, b.i === 0 ? 0 : Math.PI, 0); }
    timer = 90; state = 'countdown'; countT = 2;
    api.setRemoteMode('pointer'); api.showCursors(false);
    api.audio.play('bell');
  }

  const o = overlay(api, `<h1>🥊 Boxing</h1><p>${humans.length >= 2 ? 'Player 1 vs Player 2 — split screen!' : 'You vs. Big Brock'}</p>
    <div class="pill" data-ui="go">Ding ding!</div>
    <p class="g-hint">Swing the remote to punch (left/right swings = left/right hands).<br>Hold B to guard, D-pad ←/→ to dodge. 3 knockdowns = K.O.<br>Keyboard: Space punch · Shift guard · ←/→ dodge</p>`, {
    go: () => { o.remove(); begin(); },
  });
  o.style.background = 'rgba(255,255,255,.75)';
  for (const b of boxers) animate(b, 0);

  return { update, destroy() { scene.traverse((ob) => { if (ob.geometry) ob.geometry.dispose(); }); } };
}
