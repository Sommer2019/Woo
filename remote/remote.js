// Woo Remote — turns a phone into a pointer/motion controller for the Woo console.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const BTN = { A: 1, B: 2, ONE: 4, TWO: 8, PLUS: 16, MINUS: 32, HOME: 64, UP: 128, DOWN: 256, LEFT: 512, RIGHT: 1024 };
  const PREFIX = 'woo-tv-';

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  // per-tab id (survives reloads, so a phone gets its old player slot back)
  let clientId = null;
  try { clientId = sessionStorage.getItem('woo-remote-id'); } catch (e) {}
  if (!clientId) { clientId = Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('woo-remote-id', clientId); } catch (e) {} }
  const opts = Object.assign({ gyro: true, tilt: true, flip: false, haptic: true, sens: 1 }, store.get('woo-remote-opts', {}));

  // ---------- state ----------
  let link = null;           // { send(obj), close() }
  let slot = 0;
  let mode = 'pointer';
  let buttons = 0, edges = 0;
  let dx = 0, dy = 0;        // accumulated pointer degrees
  let steer = 0, pitch = 0, mag = 0;
  let motionSeen = false, signFix = 0, signSamples = [];
  let battery = null;
  let lastSent = 0, lastMsg = 0;
  let wakeLock = null;

  // ---------- connect screen ----------
  const qs = new URLSearchParams(location.search);
  const codeInput = $('#code');
  codeInput.value = (qs.get('c') || store.get('woo-last-code', '') || '').toUpperCase();
  const status = (m) => { $('#status').textContent = m; };
  $('#go').addEventListener('click', () => start());
  codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });

  async function start() {
    const code = codeInput.value.trim().toUpperCase();
    if (code.length < 4) { status('The code has 4 characters.'); return; }
    store.set('woo-last-code', code);
    status('Connecting…');
    await requestSensors();
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
    try { if (navigator.getBattery) { const b = await navigator.getBattery(); battery = b.level; b.addEventListener('levelchange', () => { battery = b.level; }); } } catch (e) {}
    connect(code);
  }

  async function requestSensors() {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        await DeviceMotionEvent.requestPermission();
      }
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        await DeviceOrientationEvent.requestPermission();
      }
    } catch (e) { /* user said no — buttons + touch pointer still work */ }
    window.addEventListener('devicemotion', onMotion);
  }

  function connect(code) {
    // 1) same-browser (another tab) via BroadcastChannel, 2) WebRTC via PeerJS
    let done = false;
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('woo-' + code);
      bc.onmessage = (ev) => {
        const m = ev.data || {};
        if (m.to !== clientId) return;
        if (!done && m.d && m.d.t === 'slot') { done = true; link = { send: (o) => bc.postMessage({ from: clientId, d: o }), close: () => bc.close(), kind: 'local' }; }
        onMsg(m.d);
      };
      bc.postMessage({ from: clientId, d: hello() });
      setTimeout(() => { if (!done) { bc.close(); peerConnect(code); } }, 500);
    } else peerConnect(code);
  }

  let peer = null;
  function peerConnect(code) {
    if (typeof Peer === 'undefined') { status('Could not load the connection library. Check your internet.'); return; }
    if (peer) { try { peer.destroy(); } catch (e) {} }
    peer = new Peer({ debug: 0 });
    const timeout = setTimeout(() => status('Still trying… is the TV page open and showing code ' + code + '?'), 8000);
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      conn.on('open', () => {
        clearTimeout(timeout);
        link = { send: (o) => { try { conn.send(o); } catch (e) {} }, close: () => conn.close(), kind: 'p2p' };
        link.send(hello());
      });
      conn.on('data', onMsg);
      conn.on('close', lost);
      conn.on('error', lost);
    });
    peer.on('error', (err) => {
      clearTimeout(timeout);
      if (err.type === 'peer-unavailable') status('No console with code ' + code + ' found. Check the TV.');
      else status('Connection error: ' + err.type);
      if (link) lost();
    });
  }

  function hello() { return { t: 'hello', id: clientId, name: navigator.platform || '', mo: motionSeen }; }

  function onMsg(d) {
    if (!d) return;
    lastMsg = performance.now();
    switch (d.t) {
      case 'slot':
        slot = d.n;
        document.documentElement.style.setProperty('--p', d.color);
        $('#who').textContent = 'Player ' + d.n + (d.name && !/^Player \d$/.test(d.name) ? ' · ' + d.name : '');
        document.querySelectorAll('.leds').forEach((l) => l.querySelectorAll('i').forEach((i, k) => i.classList.toggle('lit', k === d.n - 1)));
        $('#connect').classList.add('hidden');
        $('#remote').classList.remove('hidden');
        $('#lost').classList.add('hidden');
        buzz([40, 60, 40]);
        layout();
        break;
      case 'mode': mode = d.m; layout(); break;
      case 'rum': buzz(d.ms); break;
      case 'full': status('That console already has 4 remotes connected.'); break;
      case 'who': if (link) link.send(hello()); break;
      default: break;
    }
  }

  function lost() {
    if (!link) return;
    link = null;
    $('#lost').classList.remove('hidden');
  }
  $('#retry').addEventListener('click', () => { $('#lost').classList.add('hidden'); connect(store.get('woo-last-code', '')); });
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try { if ('wakeLock' in navigator && link) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
    }
  });

  function buzz(p) { if (opts.haptic && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

  // ---------- layout / orientation ----------
  function layout() {
    const side = mode === 'sideways';
    $('#body-portrait').classList.toggle('hidden', side);
    const s = $('#body-sideways');
    s.classList.toggle('hidden', !side);
    const landscape = window.innerWidth > window.innerHeight;
    s.classList.toggle('rot', side && !landscape);
    s.classList.toggle('flat', side && landscape);
    document.querySelector('.toolbar').classList.toggle('hidden', side);
  }
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 200));

  // UI-frame axes in device coordinates
  function uiAxes() {
    const landscape = window.innerWidth > window.innerHeight;
    const angle = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
    if (mode === 'sideways') {
      if (!landscape) return { up: [1, 0], right: [0, -1] };       // CSS rotated, phone top to the left
      if (angle === 270 || angle === -90) return { up: [-1, 0], right: [0, 1] };
      return { up: [1, 0], right: [0, -1] };
    }
    if (landscape) {
      if (angle === 270 || angle === -90) return { up: [-1, 0], right: [0, 1] };
      return { up: [1, 0], right: [0, -1] };
    }
    return { up: [0, 1], right: [1, 0] };
  }

  // ---------- motion ----------
  let lastT = 0, grav = [0, 0, 9.8], swing = null, lastSwing = 0;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    const now = performance.now();
    const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0.016;
    lastT = now;
    if (!motionSeen) { motionSeen = true; updateSensorInfo(); if (link) link.send(hello()); }
    let ax = a.x, ay = a.y, az = a.z;
    // Some browsers report gravity inverted; detect once from the first samples (phone held face-up-ish).
    if (!signFix) {
      signSamples.push(ay + az);
      if (signSamples.length > 15) { signFix = signSamples.reduce((s, v) => s + v, 0) >= 0 ? 1 : -1; }
    }
    const sg = (signFix || 1) * (opts.flip ? -1 : 1);
    ax *= sg; ay *= sg; az *= sg;
    // gravity low-pass for a stable "up"
    const k = 0.15;
    grav = [grav[0] + (ax - grav[0]) * k, grav[1] + (ay - grav[1]) * k, grav[2] + (az - grav[2]) * k];
    const gl = Math.hypot(grav[0], grav[1], grav[2]) || 1;
    const up = [grav[0] / gl, grav[1] / gl, grav[2] / gl];

    // linear acceleration (for swings)
    let lx, ly, lz;
    if (e.acceleration && e.acceleration.x != null) { lx = e.acceleration.x; ly = e.acceleration.y; lz = e.acceleration.z; }
    else { lx = ax - grav[0]; ly = ay - grav[1]; lz = az - grav[2]; }
    mag = Math.hypot(lx, ly, lz);
    detectSwing(mag, lx, ly, now);

    // pointer from gyro: yaw about world-up, pitch about device x
    const r = e.rotationRate;
    if (r && r.alpha != null && opts.gyro && mode === 'pointer') {
      const wx = r.beta * (opts.flip ? -1 : 1), wy = r.gamma * (opts.flip ? -1 : 1), wz = r.alpha * (opts.flip ? -1 : 1);
      const yaw = wx * up[0] + wy * up[1] + wz * up[2];
      if (Math.abs(yaw) > 1.2) dx += -yaw * dt * opts.sens;
      if (Math.abs(wx) > 1.2) dy += -wx * dt * opts.sens;
    }

    // tilt
    const ax2 = uiAxes();
    const ux = grav[0] * ax2.right[0] + grav[1] * ax2.right[1];
    const uy = grav[0] * ax2.up[0] + grav[1] * ax2.up[1];
    if (mode === 'sideways') {
      steer = opts.tilt ? clamp(Math.atan2(-ux, Math.max(0.5, Math.abs(uy) + Math.abs(grav[2]) * 0.3)) / 0.75, -1, 1) : 0;
      pitch = clamp(Math.atan2(grav[2], Math.abs(uy) || 0.01) / 1.2, -1, 1);
    } else {
      steer = clamp(Math.atan2(-up[0], Math.hypot(up[1], up[2])) / 0.9, -1, 1);
      pitch = clamp(Math.atan2(up[1], up[2]) / 1.4, -1, 1);
    }
  }
  function detectSwing(m, lx, ly, now) {
    if (!swing) {
      if (m > 13 && now - lastSwing > 260) swing = { peak: m, start: now, x: lx, y: ly };
    } else {
      if (m > swing.peak) { swing.peak = m; swing.x = lx; swing.y = ly; }
      if (m < 6 || now - swing.start > 280) {
        const ax2 = uiAxes();
        const sx = swing.x * ax2.right[0] + swing.y * ax2.right[1];
        sendNow({ t: 'sw', s: clamp((swing.peak - 9) / 26, 0.15, 1), dir: Math.sign(sx) });
        lastSwing = now;
        swing = null;
        buzz(25);
      }
    }
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function updateSensorInfo() {
    $('#sensors').textContent = 'sensors: ' + (motionSeen ? 'motion ✓' : 'no motion data (use touch drag + Swing button)');
    $('#swing').classList.toggle('hidden', motionSeen);
  }
  setTimeout(updateSensorInfo, 2500);

  // ---------- buttons & touch pointer ----------
  const touches = new Map(); // pointerId -> {x, y, pad}
  function recompute() {
    let b = 0;
    document.querySelectorAll('.btn.on').forEach((el) => el.classList.remove('on'));
    for (const t of touches.values()) {
      if (t.pad) continue;
      const el = document.elementFromPoint(t.x, t.y);
      const btn = el && el.closest && el.closest('[data-btn]');
      if (!btn || btn.offsetParent === null) continue;
      btn.classList.add('on');
      const name = btn.dataset.btn;
      if (name === 'POWER') { if (!t.power) { t.power = true; if (confirm('Disconnect this remote?')) { if (link) { link.send({ t: 'bye' }); link.close(); } link = null; location.reload(); } } continue; }
      b |= BTN[name] || 0;
    }
    const newly = b & ~buttons;
    const changed = b !== buttons;
    buttons = b;
    if (newly) { edges |= newly; buzz(10); }
    if (changed) sendNow();
  }
  const remoteEl = $('#remote');
  remoteEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.toolbar, .drawer, .lost')) return;
    const onBtn = !!(e.target.closest && e.target.closest('[data-btn]'));
    const onBody = !!(e.target.closest && e.target.closest('.body.portrait'));
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, pad: !onBtn && (onBody || mode === 'pointer') });
    try { remoteEl.setPointerCapture(e.pointerId); } catch (err) {}
    recompute();
    e.preventDefault();
  });
  remoteEl.addEventListener('pointermove', (e) => {
    const t = touches.get(e.pointerId);
    if (!t) return;
    if (t.pad && mode === 'pointer') {
      const s = 0.12 * opts.sens;
      dx += (e.clientX - t.x) * s; dy += (e.clientY - t.y) * s;
    }
    t.x = e.clientX; t.y = e.clientY;
    if (!t.pad) recompute();
  });
  const up = (e) => { if (touches.delete(e.pointerId)) recompute(); };
  remoteEl.addEventListener('pointerup', up);
  remoteEl.addEventListener('pointercancel', up);
  remoteEl.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  $('#swing').addEventListener('click', () => { mag = 22; setTimeout(() => { mag = 0; }, 200); sendNow({ t: 'sw', s: 0.75, dir: 0 }); });

  // ---------- sending ----------
  function packet() {
    const p = { t: 'in', b: buttons, e: edges, s: +steer.toFixed(3), p: +pitch.toFixed(3), m: +mag.toFixed(1), mo: motionSeen ? 1 : 0 };
    if (dx || dy) { p.d = [+dx.toFixed(3), +dy.toFixed(3)]; dx = 0; dy = 0; }
    if (battery != null) p.bat = battery;
    edges = 0;
    return p;
  }
  function sendNow(extra) {
    if (!link) return;
    if (extra) link.send(extra);
    link.send(packet());
    lastSent = performance.now();
  }
  setInterval(() => {
    if (!link) return;
    const now = performance.now();
    if (dx || dy || edges || now - lastSent > 33 || (mode === 'sideways' && now - lastSent > 16)) sendNow();
  }, 16);

  // ---------- settings drawer ----------
  const bind = (id, key, prop = 'checked') => {
    const el = $(id);
    el[prop] = prop === 'checked' ? !!opts[key] : opts[key];
    el.addEventListener('input', () => { opts[key] = prop === 'checked' ? el.checked : parseFloat(el.value); store.set('woo-remote-opts', opts); });
  };
  bind('#opt-gyro', 'gyro'); bind('#opt-tilt', 'tilt'); bind('#opt-flip', 'flip'); bind('#opt-haptic', 'haptic'); bind('#opt-sens', 'sens', 'value');
  $('#gear').addEventListener('click', () => $('#settings').classList.remove('hidden'));
  $('#close-settings').addEventListener('click', () => $('#settings').classList.add('hidden'));

  if (qs.get('c') && qs.get('auto')) start();
})();
