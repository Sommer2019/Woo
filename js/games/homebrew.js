// Homebrew Channel — unlocked by the red Letter Bomb. Cheats, a secret snake game,
// a sound test, dev notes, and a Konami code.
import { makeCanvas, overlay, bigText } from './common.js';
import { drawHomebrew } from '../channels.js';
import { hb, saveHb, CHEATS } from '../cheats.js';

const KONAMI = ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'B', 'A'];
const TRACKS = ['menu', 'kart', 'bros', 'sports', 'shoot', 'fish', 'win'];
const SFX = ['coin', 'jump', 'powerup', 'die', 'shoot', 'quack', 'boost', 'spin', 'pins', 'punch', 'cheer', 'bell'];

export function create(api) {
  const view = makeCanvas(api, 1280, 720);
  const { ctx } = view;
  let ui = null, mode = 'list', clock = 0;
  let konami = 0;
  let snake = null;
  api.music('shoot');

  const style = `<style>
    .hbc { background: transparent !important; color: #fff; }
    .hbc h1 { color: #fff !important; text-shadow: 0 3px 0 rgba(0,0,0,.25); }
    .hbc p { color: #dcecff; }
    .hb-list { display: flex; flex-direction: column; gap: 1.2vh; width: min(900px, 80vw); }
    .hb-app { display: flex; align-items: center; gap: 1.6vw; padding: 1.4vh 1.6vw; border-radius: 18px; background: rgba(255,255,255,.93); color: #234; text-align: left; border: 3px solid transparent; transition: transform .1s; }
    .hb-app .ic { font-size: 5vh; width: 7vh; text-align: center; }
    .hb-app b { font-size: 2.8vh; display: block; }
    .hb-app small { font-size: 1.9vh; color: #5a6b80; }
    .hb-app.hover { border-color: #ffd23a; transform: scale(1.02); }
    .hb-app.on { background: #e5ffe9; }
    .hb-app .tag { margin-left: auto; font-weight: 800; font-size: 2.4vh; }
    .hb-row { display: flex; flex-wrap: wrap; gap: 1vw; justify-content: center; width: min(1000px, 86vw); }
  </style>`;

  function list() {
    mode = 'list';
    if (ui) ui.remove();
    ui = overlay(api, `${style}
      <h1>Homebrew Channel</h1>
      <p>Totally unofficial. Totally unsupported. Totally fine.</p>
      <div class="hb-list">
        <div class="hb-app" data-ui="cheats"><span class="ic">🧪</span><div><b>Woo Cheat Engine</b><small>Big heads, moon gravity, infinite lives, turbo karts…</small></div></div>
        <div class="hb-app" data-ui="snake"><span class="ic">🐍</span><div><b>Woo Snake</b><small>A secret game for up to 4 players. D-pad only.</small></div></div>
        <div class="hb-app" data-ui="sound"><span class="ic">🎵</span><div><b>Sound Test</b><small>Every jingle and bleep this console can make.</small></div></div>
        <div class="hb-app" data-ui="notes"><span class="ic">📜</span><div><b>dev_notes.txt</b><small>Found on the developer's desk. Do not read.</small></div></div>
        <div class="hb-app" data-ui="uninstall"><span class="ic">🧹</span><div><b>Uninstall Homebrew</b><small>Put everything back the way it was. Cowards only.</small></div></div>
      </div>
      <div class="pill small" data-ui="quit">Woo Menu</div>`, {
      cheats: () => cheats(),
      snake: () => startSnake(),
      sound: () => sound(),
      notes: () => notes(),
      uninstall: () => {
        hb.installed = false; hb.cheats = {}; hb.konami = false; saveHb();
        api.homebrewChanged();
        api.toast('Homebrew removed. The Woo police are satisfied.');
        api.exit();
      },
      quit: () => api.exit(),
    }, 'hbc');
  }

  function cheats() {
    mode = 'cheats';
    if (ui) ui.remove();
    const visible = CHEATS.filter((c) => !c.secret || hb.konami);
    ui = overlay(api, `${style}
      <h1>🧪 Woo Cheat Engine</h1>
      <p>Toggle away. Effects apply the next time a game starts.${hb.konami ? '' : ' (Some cheats are hidden. Remember a certain code?)'}</p>
      <div class="hb-list">${visible.map((c) => `
        <div class="hb-app ${hb.cheats[c.id] ? 'on' : ''}" data-ui="toggle" data-id="${c.id}">
          <span class="ic">${hb.cheats[c.id] ? '✅' : '⬜'}</span><div><b>${c.name}</b><small>${c.desc}</small></div>
          <span class="tag" style="color:${hb.cheats[c.id] ? '#1a9a3a' : '#999'}">${hb.cheats[c.id] ? 'ON' : 'OFF'}</span></div>`).join('')}
      </div>
      <div class="pill small" data-ui="back">Back</div>`, {
      toggle: (el) => { hb.cheats[el.dataset.id] = !hb.cheats[el.dataset.id]; saveHb(); api.homebrewChanged(); cheats(); },
      back: () => list(),
    }, 'hbc');
  }

  function sound() {
    mode = 'sound';
    if (ui) ui.remove();
    ui = overlay(api, `${style}
      <h1>🎵 Sound Test</h1>
      <p>Music</p>
      <div class="hb-row">${TRACKS.map((t) => `<div class="pill small" data-ui="track" data-t="${t}">${t}</div>`).join('')}<div class="pill small" data-ui="stop">⏹ stop</div></div>
      <p>Sound effects</p>
      <div class="hb-row">${SFX.map((s) => `<div class="pill small" data-ui="sfx" data-s="${s}">${s}</div>`).join('')}</div>
      <div class="pill small" data-ui="back">Back</div>`, {
      track: (el) => { api.audio.stopMusic(); api.music(el.dataset.t); },
      stop: () => api.audio.stopMusic(),
      sfx: (el) => api.audio.play(el.dataset.s),
      back: () => { api.music('shoot'); list(); },
    }, 'hbc');
  }

  function notes() {
    mode = 'notes';
    if (ui) ui.remove();
    ui = overlay(api, `${style}
      <h1>📜 dev_notes.txt</h1>
      <div class="hb-app" style="display:block;font-family:'Courier New',monospace;font-size:2.2vh;line-height:1.55;max-width:80vw">
        TODO: make the princess actually exist<br>
        TODO: ducks keep filing complaints with HR<br>
        TODO: CPU Carl has never lost a tennis match on purpose. investigate.<br>
        TODO: someone keeps naming every Me "Bob"<br>
        NOTE: if you press ↑↑↓↓←→←→ B A in here something happens. don't tell anyone.<br>
        NOTE: the kart tracks are made of exactly zero real asphalt<br>
        NOTE: Big Brock is 100% CPU and 0% feelings
      </div>
      <div class="pill small" data-ui="back">Back</div>`, { back: () => list() }, 'hbc');
  }

  // ---------- Woo Snake ----------
  const SC = 40, SW = 32, SH = 18;
  function startSnake() {
    if (ui) { ui.remove(); ui = null; }
    mode = 'snake';
    api.showCursors(false);
    const ps = api.active();
    snake = {
      t: 0, food: [], players: ps.map((p, i) => spawnSnake(p, i)),
    };
    for (let i = 0; i < 3; i++) placeFood();
    api.music('bros');
  }
  function spawnSnake(p, i) {
    const y = 3 + i * 4;
    return { p, body: [[6, y], [5, y], [4, y]], dir: [1, 0], next: [1, 0], dead: 0, score: 0, grow: 0 };
  }
  function placeFood() {
    for (let tries = 0; tries < 200; tries++) {
      const f = [1 + Math.floor(Math.random() * (SW - 2)), 1 + Math.floor(Math.random() * (SH - 2))];
      if (!snake.players.some((s) => s.body.some(([x, y]) => x === f[0] && y === f[1]))) { snake.food.push(f); return; }
    }
  }
  function stepSnake(dt) {
    for (const s of snake.players) {
      const p = s.p, B = api.BTN;
      const want = p.pressed(B.UP) ? [0, -1] : p.pressed(B.DOWN) ? [0, 1] : p.pressed(B.LEFT) ? [-1, 0] : p.pressed(B.RIGHT) ? [1, 0] : null;
      if (want && !(want[0] === -s.dir[0] && want[1] === -s.dir[1])) s.next = want;
      if (p.pressed(B.B) || p.pressed(B.MINUS)) { api.music('shoot'); api.showCursors(true); list(); return; }
    }
    snake.t += dt;
    if (snake.t < 0.11) return;
    snake.t = 0;
    for (const s of snake.players) {
      if (s.dead > 0) { s.dead -= 0.11; if (s.dead <= 0) Object.assign(s, spawnSnake(s.p, s.p.index), { score: s.score }); continue; }
      s.dir = s.next;
      const head = [s.body[0][0] + s.dir[0], s.body[0][1] + s.dir[1]];
      const hit = head[0] < 0 || head[1] < 0 || head[0] >= SW || head[1] >= SH ||
        snake.players.some((o) => o.dead <= 0 && o.body.some(([x, y], k) => x === head[0] && y === head[1] && !(o === s && k === o.body.length - 1)));
      if (hit) { s.dead = 2; api.audio.play('die'); api.rumble(s.p.index, 300); continue; }
      s.body.unshift(head);
      const fi = snake.food.findIndex(([x, y]) => x === head[0] && y === head[1]);
      if (fi >= 0) { snake.food.splice(fi, 1); s.grow += 2; s.score += 10; api.audio.play('coin'); placeFood(); }
      if (s.grow > 0) s.grow--; else s.body.pop();
    }
  }
  function drawSnake() {
    ctx.fillStyle = '#0b1a33'; ctx.fillRect(0, 0, 1280, 720);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    for (let x = 0; x <= SW; x++) { ctx.beginPath(); ctx.moveTo(x * SC, 0); ctx.lineTo(x * SC, 720); ctx.stroke(); }
    for (const [x, y] of snake.food) { bigText(ctx, '🍎', x * SC + SC / 2, y * SC + SC / 2 + 2, 30, '#fff', 'transparent'); }
    for (const s of snake.players) {
      if (s.dead > 0 && Math.floor(s.dead * 8) % 2) continue;
      s.body.forEach(([x, y], k) => {
        ctx.fillStyle = s.p.color; ctx.globalAlpha = s.dead > 0 ? 0.4 : 1 - k / (s.body.length + 6);
        ctx.fillRect(x * SC + 2, y * SC + 2, SC - 4, SC - 4);
      });
      ctx.globalAlpha = 1;
    }
    snake.players.forEach((s, i) => { ctx.fillStyle = s.p.color; ctx.font = '800 26px Arial'; ctx.textAlign = 'left'; ctx.fillText(`P${s.p.index + 1}: ${s.score}`, 20 + i * 200, 36); });
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '700 20px Arial'; ctx.textAlign = 'right'; ctx.fillText('D-pad steer · B = back', 1260, 710);
  }

  // Konami code (any player) unlocks the hidden cheat
  function checkKonami() {
    for (const p of api.active()) {
      for (const name of ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B']) {
        if (!p.pressed(api.BTN[name])) continue;
        konami = name === KONAMI[konami] ? konami + 1 : name === KONAMI[0] ? 1 : 0;
        if (konami === KONAMI.length) {
          konami = 0;
          if (!hb.konami) { hb.konami = true; hb.cheats.disco = true; saveHb(); api.homebrewChanged(); }
          api.audio.play('powerup');
          api.toast('🕺 SECRET UNLOCKED: Disco Mode!');
          if (mode === 'cheats') cheats();
        }
      }
    }
  }

  list();
  return {
    update(dt, t) {
      clock = t;
      view.begin('#000');
      if (mode === 'snake') { stepSnake(dt); if (snake && mode === 'snake') drawSnake(); }
      else { drawHomebrew(ctx, t, 1280, 720, true, true); checkKonami(); }
      view.end();
    },
    resize: view.resize,
    destroy() { if (ui) ui.remove(); },
  };
}
