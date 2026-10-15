// Woo console — TV side. Menu, pointer UI, remotes, HOME menu, game host.
import { Host } from './net.js';
import { players, BTN, COLORS, settings, saveSettings, beginFrame, endFrame, applyPacket, initKeyboard, activePlayers } from './input.js';
import { audio } from './audio.js';
import { CHANNELS, visibleChannels } from './channels.js';
import { hb, saveHb, cheat } from './cheats.js';
import { getMe, resetMe } from './me.js';

const $ = (s) => document.querySelector(s);
const screenEl = $('#screen');
const layers = { warning: $('#warning'), menu: $('#menu'), channel: $('#channel'), game: $('#game'), panel: $('#panel'), home: $('#home') };

const app = {
  state: 'warning', // warning | menu | channel | game
  page: 0,
  channel: null,
  game: null,       // running game instance
  gameDef: null,
  homeOpen: false,
  panelOpen: null,
  cursorsWanted: true,
  remoteMode: 'pointer',
  lastClicker: players[0],
};
window.woo = app; // handy for debugging

// ---------- networking ----------
const host = new Host({
  onMessage: (link, d) => {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'hello') return join(link, d);
    if (d.t === 'txt') { window.dispatchEvent(new CustomEvent('woo-text', { detail: { text: String(d.v || '').slice(0, 12), link } })); return; }
    const p = players.find((pl) => pl.link === link);
    if (!p) { host.send(link, { t: 'who' }); return; }
    if (d.t === 'bye') { leave(link); return; }
    applyPacket(p, d);
  },
  onClose: (link) => leave(link),
  onStatus: (kind, msg) => {
    if (kind === 'code') { updateCodeUI(); return; }
    document.querySelectorAll('[data-net-status]').forEach((el) => { el.textContent = msg; });
  },
});

function join(link, d) {
  let p = players.find((pl) => pl.link === link);
  // same phone coming back (possibly over another transport) keeps its slot
  if (!p) p = players.find((pl) => pl.clientId && pl.clientId === d.id);
  if (!p) p = players.find((pl) => !pl.link && !pl.clientId);
  if (!p) p = players.find((pl) => !pl.link);
  if (!p) { host.send(link, { t: 'full' }); return; }
  const fresh = p.link !== link;
  p.link = link; p.clientId = d.id; p.remoteName = d.name || ''; p.hasMotion = !!d.mo;
  p.lastInput = performance.now();
  host.send(link, { t: 'slot', n: p.index + 1, color: p.color, name: getMe(p.index).name });
  host.send(link, { t: 'mode', m: currentRemoteMode() });
  if (fresh) {
    toast(`Player ${p.index + 1} connected`);
    audio.play('connect');
    rumble(p.index, 120);
  }
  refreshRemoteUI();
}
function leave(link) {
  const p = players.find((pl) => pl.link === link);
  if (!p) return;
  p.link = null; p.buttons = 0;
  toast(`Player ${p.index + 1} disconnected`);
  audio.play('disconnect');
  refreshRemoteUI();
}
function rumble(i, ms) {
  const p = players[i];
  if (p && p.link) host.send(p.link, { t: 'rum', ms });
}
function currentRemoteMode() { return app.homeOpen || app.state !== 'game' ? 'pointer' : app.remoteMode; }
function broadcastMode() {
  const m = currentRemoteMode();
  for (const p of players) if (p.link) host.send(p.link, { t: 'mode', m });
}

// ---------- UI helpers ----------
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}
function fade(fn) {
  return new Promise((res) => {
    $('#fade').classList.add('on');
    setTimeout(async () => { await fn(); requestAnimationFrame(() => $('#fade').classList.remove('on')); res(); }, 380);
  });
}
function show(name) {
  for (const k of ['warning', 'menu', 'channel', 'game']) layers[k].classList.toggle('hidden', k !== name);
  app.state = name;
  broadcastMode();
}

function updateCodeUI() {
  document.querySelectorAll('[data-code]').forEach((el) => { el.textContent = host.code; });
  const url = host.remoteUrl();
  document.querySelectorAll('[data-remote-url]').forEach((el) => { el.textContent = url.replace(/^https?:\/\//, ''); });
  document.querySelectorAll('[data-qr]').forEach((el) => {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url); qr.make();
      el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    } catch (e) { el.textContent = 'QR unavailable'; }
  });
  refreshRemoteUI();
}
function refreshRemoteUI() {
  const hint = $('#remote-hint');
  if (hint) {
    hint.innerHTML = players.map((p) => `<span style="color:${p.link ? p.color : '#c5cad0'}">● P${p.index + 1}</span>`).join(' &nbsp; ') +
      ` &nbsp;·&nbsp; Console code <b>${host.code}</b> &nbsp;·&nbsp; click the ✉ button to connect a phone`;
  }
  if (app.panelOpen === 'connect') openPanel('connect');
  if (app.homeOpen) renderHomeRemotes();
}

// ---------- menu ----------
const grid = $('#channel-grid');
const thumbs = [];
function buildGrid() {
  grid.innerHTML = '';
  thumbs.length = 0;
  for (let i = 0; i < 12; i++) {
    const ch = visibleChannels()[app.page * 12 + i];
    const el = document.createElement('div');
    el.className = 'ch' + (ch ? '' : ' empty');
    if (ch) {
      const c = document.createElement('canvas');
      el.appendChild(c);
      el.dataset.click = 'channel';
      el.dataset.ch = ch.id;
      thumbs.push({ ch, canvas: c });
    }
    grid.appendChild(el);
  }
  $('.page-arrow.left').classList.toggle('hidden', app.page === 0);
  $('.page-arrow.right').classList.toggle('hidden', app.page >= 1);
}
function drawThumbs(t) {
  for (const th of thumbs) {
    const c = th.canvas;
    const w = c.clientWidth, h = c.clientHeight;
    if (!w) continue;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    th.ch.draw(ctx, t, w, h, false);
  }
}
function updateClock() {
  const d = new Date();
  $('#clock-time').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('#clock-date').textContent = d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
}

function openChannel(id) {
  const ch = CHANNELS.find((c) => c.id === id);
  if (!ch) return;
  app.channel = ch;
  audio.play('click');
  fade(() => {
    $('#channel-title').textContent = ch.title;
    show('channel');
    if (ch.music) audio.music(ch.music);
  });
}
function drawBanner(t) {
  const c = $('#banner');
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== w) { c.width = w; c.height = h; }
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  app.channel.draw(ctx, t, w, h, true);
}

async function startGame(ch) {
  audio.play('start');
  await fade(async () => {
    layers.game.innerHTML = '';
    app.gameDef = ch;
    app.remoteMode = 'pointer';
    app.cursorsWanted = true;
    show('game');
    try {
      const mod = await ch.load();
      app.game = mod.create(makeApi(ch));
    } catch (e) {
      console.error(e);
      toast('This channel crashed. Trashy, we know.');
      app.game = null;
      show('menu');
      audio.music('menu');
    }
  });
}
function stopGame() {
  if (app.game && app.game.destroy) { try { app.game.destroy(); } catch (e) { console.error(e); } }
  app.game = null;
  layers.game.innerHTML = '';
}
function backToMenu() {
  fade(() => {
    stopGame();
    show('menu');
    audio.music('menu');
    app.cursorsWanted = true;
  });
}

function makeApi(ch) {
  return {
    root: layers.game,
    players, BTN, COLORS, audio, getMe, settings,
    active: activePlayers,
    exit: () => backToMenu(),
    toast,
    rumble,
    setRemoteMode: (m) => { app.remoteMode = m; broadcastMode(); },
    showCursors: (v) => { app.cursorsWanted = v; },
    music: (n) => audio.music(n),
    channels: CHANNELS,
    launch: (id) => {
      const next = CHANNELS.find((c) => c.id === id);
      if (!next) return;
      stopGame();
      app.channel = next;
      startGame(next);
    },
    clicker: () => app.lastClicker,
    // ask a player's phone to show a text box (answer arrives as a 'woo-text' window event)
    askText: (playerIndex, prompt, value) => { const p = players[playerIndex]; if (p && p.link) host.send(p.link, { t: 'ask', prompt, v: value }); },
    homebrewChanged: () => { applyCheats(); buildGrid(); },
  };
}

// ---------- panels ----------
function openPanel(kind) {
  app.panelOpen = kind;
  const box = $('#panel-box');
  layers.panel.classList.remove('hidden');
  if (kind === 'connect') {
    box.innerHTML = `
      <h1>✉ Connect Woo Remotes</h1>
      <div class="warn-connect" style="margin:0">
        <div class="qr" data-qr style="width:15em;height:15em"></div>
        <div>
          <div class="warn-step">Scan the code with your phone camera, or open</div>
          <div class="warn-step"><b data-remote-url></b></div>
          <div class="warn-step">and enter console code <b class="code" data-code></b></div>
          <div class="warn-step dim" data-net-status></div>
          <div class="warn-step dim small">Up to 4 phones. Allow motion sensors when asked — that's your pointer & swing.<br>No phone? Mouse = pointer, click = A, right click = B, arrows = D-pad, Z/X = 1/2, Space = swing, H = HOME.</div>
        </div>
      </div>
      <div class="slots">${players.map((p) => `<div class="slot ${p.link ? 'on' : ''}" style="color:${p.link ? p.color : '#b8bec5'}">P${p.index + 1}<br><span class="small">${p.link ? (p.hasMotion ? 'connected · motion ✓' : 'connected · no motion') : 'waiting…'}</span></div>`).join('')}</div>
      <div style="text-align:center"><div class="pill" data-click="panel-close">OK</div></div>`;
    updateCodeUIInPanel();
  } else if (kind === 'board') {
    const d = new Date().toLocaleDateString([], { month: 'numeric', day: 'numeric' });
    box.innerHTML = `
      <h1>✉ Woo Message Board <span class="small dim">${d}</span></h1>
      <div class="letters">
        <div class="letter" data-click="letter" data-l="welcome"><span class="env">✉</span><b>Welcome to Woo!</b><span class="dim">from: Woo</span></div>
        <div class="letter" data-click="connect"><span class="env">📱</span><b>Connect your Woo Remotes</b><span class="dim">from: Woo</span></div>
        <div class="letter" data-click="letter" data-l="tips"><span class="env">✉</span><b>Tips &amp; tricks</b><span class="dim">from: a friend</span></div>
        <div class="letter red" data-click="letterbomb"><span class="env">💣</span><b>${hb.installed ? 'Opened. You know what you did.' : '!!! YOU HAVE WON A FREE CHANNEL !!!'}</b><span class="dim">from: ???</span></div>
      </div>
      <div style="text-align:center;margin-top:2vh"><div class="pill" data-click="panel-close">Close</div></div>`;
  } else if (kind.startsWith('letter:')) {
    const L = {
      welcome: ['Welcome to Woo!', 'Thank you for choosing Woo, the console that is definitely not a copy of anything.<br><br>Point. Swing. Accidentally hit the lamp. We are not liable for the lamp.<br><br>— The Woo Team (one guy and a lot of coffee)'],
      tips: ['Tips & tricks', '• Stand on your friends\' heads in Super Woo Bros.<br>• In Woo Kart, hold B in a corner and let go when the sparks turn orange.<br>• In bowling, twist your wrist while throwing.<br>• Never open red letters from strangers. Seriously. Do not. 👀'],
    }[kind.slice(7)] || ['?', '?'];
    box.innerHTML = `<h1>${L[0]}</h1><p style="line-height:1.6">${L[1]}</p>
      <div style="text-align:center;margin-top:2vh"><div class="pill" data-click="board">Back</div></div>`;
  } else if (kind === 'settings') {
    box.innerHTML = `
      <h1>woo Settings</h1>
      <div class="panel-row"><span class="lbl">Pointer speed</span><div class="pill small" data-click="sens-">−</div><span class="val">${settings.sens.toFixed(1)}</span><div class="pill small" data-click="sens+">+</div></div>
      <div class="panel-row"><span class="lbl">Invert pointer</span><div class="pill small ${settings.invX ? 'sel' : ''}" data-click="invx">Left/Right</div><div class="pill small ${settings.invY ? 'sel' : ''}" data-click="invy">Up/Down</div></div>
      <div class="panel-row"><span class="lbl">Volume</span><div class="pill small" data-click="vol-">−</div><span class="val">${Math.round(settings.vol * 10)}</span><div class="pill small" data-click="vol+">+</div></div>
      <div class="panel-row"><span class="lbl">Music</span><div class="pill small ${settings.music ? 'sel' : ''}" data-click="music">${settings.music ? 'On' : 'Off'}</div></div>
      <div class="panel-row"><span class="lbl">Woo Me data</span><div class="pill small" data-click="reset-me">Reset all Mes</div></div>
      <div class="panel-row"><span class="lbl">About</span><span class="small dim">Woo is a free, fan-made, deliberately trashy browser console. It is not affiliated with, endorsed by or connected to Nintendo or any other company. All games are original knock-offs; no real console games run here.</span></div>
      <div style="text-align:center;margin-top:2vh"><div class="pill" data-click="panel-close">Close</div></div>`;
  }
}
function updateCodeUIInPanel() { updateCodeUI(); app.panelOpen = 'connect'; }
function closePanel() { app.panelOpen = null; layers.panel.classList.add('hidden'); }

// ---------- Letter Bomb ----------
function letterBomb() {
  if (app.letterBombing) return;
  app.letterBombing = true;
  const el = document.createElement('div');
  el.className = 'letterbomb';
  screenEl.appendChild(el);
  const lines = hb.installed
    ? ['> letterbomb.bin already applied.', '> nothing left to hack. go play outside.', '']
    : ['WOO MESSAGE BOARD v4.3E', '> opening letter from ???', '> parsing envelope… 0xDEADBEEF', '> buffer overflow in sticker renderer (oops)',
       '> injecting payload: boot.elf', '> disabling the fun police… OK', '> downloading Homebrew Channel… ██████████ 100%',
       '> installing secret stuff…', '> done. your warranty is now void (it never existed).', ''];
  let i = 0;
  audio.play('beep');
  const tick = setInterval(() => {
    if (i < lines.length) {
      el.innerHTML += `<div>${lines[i]}</div>`;
      audio.play(i % 3 ? 'hover' : 'beep');
      if (i === 3) { screenEl.classList.add('glitch'); audio.play('break'); for (const p of players) rumble(p.index, 300); }
      i++;
      return;
    }
    clearInterval(tick);
    setTimeout(() => {
      screenEl.classList.remove('glitch');
      el.remove();
      app.letterBombing = false;
      if (!hb.installed) {
        hb.installed = true; saveHb();
        audio.play('powerup');
        toast('Homebrew Channel installed! Check page 1.');
        app.page = 0; buildGrid();
      }
    }, 900);
  }, 420);
}
function applyCheats() { screenEl.classList.toggle('disco', cheat('disco')); }

// ---------- HOME menu ----------
function openHome() {
  if (app.homeOpen) return closeHome();
  app.homeOpen = true;
  layers.home.classList.remove('hidden');
  $('[data-click="home-reset"]').classList.toggle('disabled', app.state !== 'game');
  renderHomeRemotes();
  audio.play('click');
  broadcastMode();
}
function closeHome() {
  app.homeOpen = false;
  layers.home.classList.add('hidden');
  audio.play('back');
  broadcastMode();
}
function renderHomeRemotes() {
  $('#home-remotes').innerHTML = players.map((p) => {
    const lvl = p.battery == null ? 4 : Math.max(1, Math.ceil(p.battery * 4));
    return `<div class="home-remote ${p.connected ? 'on' : ''}"><div class="p" style="color:${p.color}">P${p.index + 1}</div>
      ${p.link ? `<div class="battery">${[0, 1, 2, 3].map((i) => `<i class="${i < lvl ? 'f' : ''}"></i>`).join('')}</div>` : `<div>${p.kbActive ? 'keyboard' : '—'}</div>`}</div>`;
  }).join('');
}

// ---------- actions ----------
const actions = {
  channel: (el) => openChannel(el.dataset.ch),
  back: () => { audio.play('back'); fade(() => { show('menu'); audio.music('menu'); }); },
  start: () => startGame(app.channel),
  nextpage: () => { app.page = 1; buildGrid(); audio.play('click'); },
  prevpage: () => { app.page = 0; buildGrid(); audio.play('click'); },
  settings: () => { audio.play('click'); openPanel('settings'); },
  connect: () => { audio.play('click'); openPanel('connect'); },
  board: () => { audio.play('click'); openPanel('board'); },
  letter: (el) => { audio.play('click'); openPanel('letter:' + el.dataset.l); },
  letterbomb: () => { closePanel(); letterBomb(); },
  'panel-close': () => { audio.play('back'); closePanel(); },
  'sens-': () => { settings.sens = Math.max(0.3, settings.sens - 0.1); saveSettings(); openPanel('settings'); },
  'sens+': () => { settings.sens = Math.min(3, settings.sens + 0.1); saveSettings(); openPanel('settings'); },
  invx: () => { settings.invX = !settings.invX; saveSettings(); openPanel('settings'); },
  invy: () => { settings.invY = !settings.invY; saveSettings(); openPanel('settings'); },
  'vol-': () => { settings.vol = Math.max(0, Math.round((settings.vol - 0.1) * 10) / 10); saveSettings(); audio.applySettings(); openPanel('settings'); audio.play('click'); },
  'vol+': () => { settings.vol = Math.min(1, Math.round((settings.vol + 0.1) * 10) / 10); saveSettings(); audio.applySettings(); openPanel('settings'); audio.play('click'); },
  music: () => { settings.music = !settings.music; saveSettings(); audio.applySettings(); openPanel('settings'); },
  'reset-me': () => { resetMe(); toast('All Mes were reset'); },
  'home-close': () => closeHome(),
  'home-menu': () => { app.homeOpen = false; layers.home.classList.add('hidden'); audio.play('back'); if (app.state === 'game') backToMenu(); else if (app.state === 'channel') actions.back(); broadcastMode(); },
  'home-reset': () => {
    if (app.state !== 'game') return;
    app.homeOpen = false; layers.home.classList.add('hidden');
    const ch = app.gameDef;
    stopGame();
    startGame(ch);
  },
};
document.addEventListener('click', (e) => {
  const el = e.target.closest && e.target.closest('[data-click]');
  if (el && actions[el.dataset.click]) actions[el.dataset.click](el);
});

// ---------- pointer UI ----------
const cursorEls = players.map((p) => {
  const el = document.createElement('div');
  el.className = 'cursor';
  el.innerHTML = `<svg viewBox="0 0 48 56"><path d="M14 6a4.5 4.5 0 0 1 9 0v15a4 4 0 0 1 7.5 1.5a4 4 0 0 1 7.5 2a4 4 0 0 1 7 3v12c0 9-6.5 14.5-15 14.5h-5c-6 0-9.5-3-12.5-8l-8-12a4.5 4.5 0 0 1 7-5.5l3.5 4.5z" fill="#fff" stroke="${p.color}" stroke-width="3.2" stroke-linejoin="round"/><text x="29" y="44" text-anchor="middle" font-size="15" font-weight="800" font-family="Arial" fill="${p.color}">${p.index + 1}</text></svg>`;
  $('#cursors').appendChild(el);
  return el;
});
const hovered = players.map(() => null);
const CLICKABLE = '[data-click], [data-ui]';

function pointerUI() {
  const w = screenEl.clientWidth, h = screenEl.clientHeight;
  const uiActive = app.homeOpen || app.panelOpen || app.state !== 'game' || app.cursorsWanted;
  for (const p of players) {
    const el = cursorEls[p.index];
    const vis = p.connected && uiActive && p.cursorVisible;
    el.style.display = vis ? 'block' : 'none';
    if (!vis) { setHover(p, null); continue; }
    const x = Math.max(0, Math.min(1, p.cursor.x)) * w, y = Math.max(0, Math.min(1, p.cursor.y)) * h;
    const roll = p.phone && p.hasMotion && currentRemoteMode() === 'pointer' ? p.steer * 35 : 0;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${roll}deg)`;
    let target = document.elementFromPoint(x, y);
    target = target && target.closest ? target.closest(CLICKABLE) : null;
    // only allow targets in the top-most active layer
    const top = app.homeOpen ? layers.home : app.panelOpen ? layers.panel : layers[app.state];
    if (target && !top.contains(target)) target = null;
    setHover(p, target);
    if (target && p.pressed(BTN.A)) {
      app.lastClicker = p;
      target.classList.add('hover');
      target.click();
    }
  }
}
function setHover(p, el) {
  const prev = hovered[p.index];
  if (prev === el) return;
  hovered[p.index] = el;
  if (prev && !hovered.includes(prev)) prev.classList.remove('hover');
  if (el) {
    el.classList.add('hover');
    audio.play('hover');
    rumble(p.index, 12);
  }
}
app.clickerIndex = () => app.lastClicker.index;

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  beginFrame();

  // stale phone links (mobile browsers often vanish without a close event)
  for (const p of players) if (p.link && now - p.lastInput > 9000) leave(p.link);

  // global buttons
  for (const p of activePlayers()) {
    if (p.pressed(BTN.HOME) && app.state !== 'warning') openHome();
  }
  if (app.state === 'warning') {
    if (players.some((p) => p.pressed(BTN.A))) enterMenu();
  }
  if (app.panelOpen && players.some((p) => p.pressed(BTN.B))) closePanel();

  pointerUI();

  const t = now / 1000;
  if (app.state === 'menu' && !app.panelOpen) drawThumbs(t);
  if (app.state === 'channel') drawBanner(t);
  if (app.state === 'game' && app.game && !app.homeOpen) {
    try { app.game.update(dt, t); } catch (e) { console.error(e); }
  }
  endFrame();
  requestAnimationFrame(frame);
}

function enterMenu() {
  if (app.state !== 'warning') return;
  audio.init();
  audio.play('start');
  fade(() => { buildGrid(); show('menu'); audio.music('menu'); });
}

// ---------- boot ----------
initKeyboard(screenEl);
applyCheats();
layers.warning.addEventListener('mousedown', () => setTimeout(enterMenu, 0));
const unlock = () => {
  audio.init();
  setTimeout(() => $('#sound-hint').classList.toggle('hidden', audio.ready), 100);
};
window.addEventListener('mousedown', unlock);
window.addEventListener('keydown', unlock);
window.addEventListener('touchstart', unlock);
setInterval(() => {
  if (app.state !== 'warning') $('#sound-hint').classList.toggle('hidden', !!audio.ready);
}, 1000);
host.start();
updateCodeUI();
updateClock();
setInterval(updateClock, 1000);
window.addEventListener('resize', () => { if (app.game && app.game.resize) app.game.resize(); });
// keep phones alive / informed
setInterval(() => { for (const p of players) if (p.link) host.send(p.link, { t: 'ping' }); }, 2000);
requestAnimationFrame(frame);

// ?skip=1 jumps straight to the menu; ?game=<id> straight into a game (dev helpers)
const qs = new URLSearchParams(location.search);
if (qs.get('skip') || qs.get('game')) {
  buildGrid(); show('menu'); audio.music('menu');
  if (qs.get('game')) { const ch = CHANNELS.find((c) => c.id === qs.get('game')); if (ch) { app.channel = ch; startGame(ch); } }
}
