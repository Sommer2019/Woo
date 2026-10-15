// Super Woo Bros. — co-op side-scroller for up to 4. Remote sideways:
// D-pad move, 2 jump, 1 run, shake = twirl.
import { makeCanvas, overlay, bigText } from './common.js';
import { drawPlumber } from '../channels.js';
import { cheat } from '../cheats.js';

const T = 48;         // tile size
const ROWS = 15;
const VW = 1280, VH = 720;

// tile ids
const E = 0, GROUND = 1, BRICK = 2, QCOIN = 3, QMUSH = 4, USED = 5, SOLID = 6, PIPE_TL = 7, PIPE_TR = 8, PIPE_L = 9, PIPE_R = 10, COIN = 11, QSTAR = 12, PLAT = 13;
const SOLIDS = new Set([GROUND, BRICK, QCOIN, QMUSH, USED, SOLID, PIPE_TL, PIPE_TR, PIPE_L, PIPE_R, QSTAR, PLAT]);

// ---------- level builder ----------
function Level(width, theme, name) {
  const g = Array.from({ length: ROWS }, () => new Array(width).fill(E));
  const L = { g, width, theme, name, ents: [], flag: width - 8, start: 3 };
  L.ground = (x0, x1, h = 2) => { for (let x = x0; x <= x1; x++) for (let y = ROWS - h; y < ROWS; y++) g[y][x] = GROUND; return L; };
  L.row = (x, y, s) => {
    [...s].forEach((c, i) => {
      const t = { B: BRICK, '?': QCOIN, M: QMUSH, S: QSTAR, '#': SOLID, o: COIN, '=': PLAT }[c];
      if (t !== undefined) g[y][x + i] = t;
    });
    return L;
  };
  L.pipe = (x, h) => {
    const top = ROWS - 2 - h;
    g[top][x] = PIPE_TL; g[top][x + 1] = PIPE_TR;
    for (let y = top + 1; y < ROWS - 2; y++) { g[y][x] = PIPE_L; g[y][x + 1] = PIPE_R; }
    return L;
  };
  L.stairs = (x, n, dir) => {
    for (let i = 0; i < n; i++) { const col = dir > 0 ? x + i : x + n - 1 - i; for (let k = 0; k <= i; k++) g[ROWS - 3 - k][col] = SOLID; }
    return L;
  };
  L.e = (x, type, y = null) => { L.ents.push({ x, type, y }); return L; };
  L.coins = (x, y, n) => { for (let i = 0; i < n; i++) g[y][x + i] = COIN; return L; };
  L.ceiling = (x0, x1) => { for (let x = x0; x <= x1; x++) g[0][x] = BRICK; return L; };
  L.setFlag = (x) => { L.flag = x; return L; };
  L.warps = [];
  // a pipe you can enter with ↓: leads to `room` (a level function); you come back out of pipe `ret`
  L.warp = (x, h, room, ret) => { L.pipe(x, h); L.warps.push({ x, room, ret }); return L; };
  L.exitPipe = (x, h) => { L.pipe(x, h); L.warps.push({ x, back: true }); return L; };
  L.secret = null; // { x, top } red flag = secret exit
  L.wall = (x) => { for (let y = 0; y < ROWS; y++) g[y][x] = SOLID; return L; };
  return L;
}

function level1() {
  const L = Level(212, 'day', 'World 1-1');
  L.ground(0, 68).ground(71, 85).ground(89, 150).ground(153, 211);
  L.row(16, 9, '?').row(20, 9, 'B?BMB').row(22, 5, '?');
  L.pipe(28, 2).pipe(38, 3).warp(46, 4, coinRoom, 57).pipe(57, 4);
  L.e(22, 'g').e(40, 'g').e(51, 'g').e(53, 'g');
  L.coins(62, 8, 4);
  L.row(77, 9, 'B?B').row(80, 5, 'BBBBBBBB').row(91, 5, 'BBB?').row(94, 9, 'M');
  L.e(82, 'g', 4).e(84, 'g', 4);
  L.row(100, 9, 'BS').row(106, 9, '?').row(109, 9, '?').row(109, 5, 'M').row(112, 9, '?');
  L.e(98, 'k').e(108, 'g').e(110, 'g');
  L.row(118, 9, 'B').row(121, 5, 'BBB').row(128, 5, 'B??B').row(129, 9, 'BB');
  L.e(124, 'g').e(126, 'g').e(130, 'g').e(132, 'g');
  L.stairs(134, 4, 1).stairs(140, 4, -1).stairs(148, 4, 1).stairs(153, 4, -1);
  L.pipe(163, 2).row(168, 9, 'BB?B').e(170, 'g').e(172, 'g').pipe(179, 2);
  L.coins(166, 6, 5);
  L.stairs(181, 8, 1);
  for (let y = ROWS - 3; y >= ROWS - 10; y--) L.g[y][189] = E; // keep a gap before the flag
  L.setFlag(198);
  return L;
}
function level2() {
  const L = Level(190, 'cave', 'World 1-2');
  L.ground(0, 80).ground(84, 120).ground(124, 189).ceiling(6, 150);
  L.row(10, 9, '?M??').coins(16, 6, 6);
  L.stairs(22, 4, 1).e(30, 'g').e(32, 'g');
  L.row(36, 9, 'BBBBBB').row(36, 5, 'BBB?BB').e(38, 'k');
  for (let x = 44; x < 70; x += 6) { L.row(x, 11, '##'); L.row(x, 10, '##'); }
  L.e(48, 'g').e(54, 'g').e(60, 'k').e(66, 'g');
  L.coins(46, 7, 3).coins(58, 7, 3);
  L.pipe(74, 3).warp(78, 4, secretRoom, 146);
  L.row(86, 9, 'B?B?B').row(88, 5, 'S').e(90, 'g').e(92, 'g').e(96, 'k');
  L.row(100, 8, '########').coins(100, 7, 8).e(103, 'g', 6);
  L.stairs(110, 5, 1).e(118, 'g');
  L.row(126, 9, 'BMB').coins(130, 9, 6).e(134, 'g').e(136, 'g').e(140, 'k');
  L.pipe(146, 2).pipe(152, 3).pipe(158, 4);
  L.stairs(166, 7, 1);
  L.setFlag(180);
  return L;
}
function level3() {
  const L = Level(200, 'sky', 'World 1-3');
  L.ground(0, 14).ground(184, 199);
  const plats = [[17, 11, 5], [25, 9, 4], [32, 7, 6], [41, 10, 5], [49, 8, 3], [55, 11, 7], [65, 8, 4], [72, 6, 5], [80, 9, 6], [90, 11, 4], [97, 8, 5], [105, 10, 6], [114, 7, 4], [121, 9, 5], [129, 11, 8], [140, 8, 4], [147, 6, 5], [155, 9, 6], [164, 11, 5], [172, 9, 6], [179, 12, 4]];
  for (const [x, y, w] of plats) { L.row(x, y, '='.repeat(w)); }
  L.coins(26, 7, 3).coins(33, 5, 5).coins(56, 9, 6).coins(73, 4, 4).coins(98, 6, 4).coins(130, 9, 7).coins(148, 4, 4);
  L.row(44, 6, '?M?').row(108, 7, 'S').row(158, 6, '??M');
  L.e(34, 'g', 6).e(43, 'g', 9).e(58, 'k', 10).e(67, 'g', 7).e(83, 'g', 8).e(99, 'g', 7).e(107, 'k', 9).e(123, 'g', 8).e(131, 'g', 10).e(135, 'g', 10).e(150, 'k', 5).e(158, 'g', 8).e(175, 'g', 8);
  L.stairs(186, 6, 1);
  L.setFlag(195);
  return L;
}
// ---------- bonus rooms (reached through pipes) ----------
function coinRoom() {
  const L = Level(28, 'cave', 'Bonus Room');
  L.isRoom = true; L.flag = 9999; L.start = 3;
  L.ground(0, 27).ceiling(0, 27).wall(0).wall(27);
  for (let r = 3; r <= 10; r += 2) L.coins(5, r, 16);
  L.row(4, 11, '##'); L.row(10, 9, '###');
  L.exitPipe(23, 2);
  return L;
}
function secretRoom() {
  const L = Level(46, 'cave', 'Secret Room');
  L.isRoom = true; L.flag = 9999; L.start = 3;
  L.ground(0, 45).ceiling(0, 45).wall(0).wall(45);
  L.row(9, 10, '===').row(15, 8, '===').row(21, 6, '===').row(27, 8, '===').row(33, 10, '======');
  L.coins(9, 9, 3).coins(15, 7, 3).coins(21, 5, 3).coins(27, 7, 3);
  L.e(16, 'g', 7).e(28, 'k', 7);
  L.exitPipe(5, 2);
  L.secret = { x: 41, top: 3 };
  return L;
}
function levelSecret() {
  const L = Level(150, 'star', 'World ★-1');
  L.ground(0, 20).ground(140, 149);
  const plats = [[23, 11, 4], [30, 9, 4], [37, 7, 4], [44, 9, 3], [50, 11, 6], [60, 8, 4], [67, 6, 4], [74, 9, 5], [83, 11, 4], [90, 8, 4], [97, 10, 6], [107, 7, 4], [114, 9, 4], [121, 11, 5], [130, 9, 6]];
  for (const [x, y, w] of plats) { L.row(x, y, '='.repeat(w)); L.coins(x, y - 2, w); }
  L.row(8, 9, 'SM?S').row(55, 6, 'S').row(100, 6, 'M');
  L.coins(6, 6, 10);
  L.e(52, 'g', 10).e(76, 'k', 8).e(99, 'g', 9).e(123, 'g', 10);
  L.stairs(141, 5, 1);
  L.setFlag(147);
  return L;
}
const SECRET_IDX = 3;
const LEVELS = [level1, level2, level3, levelSecret];

const THEMES = {
  day: { sky: ['#5fb0ff', '#bfe4ff'], hill: '#5ad15a', hill2: '#3fb34f', ground: '#c66a2a', grass: '#3cb043', brick: '#c0602a' },
  cave: { sky: ['#0c0d1a', '#1d1f36'], hill: '#1f2240', hill2: '#272a4f', ground: '#3b5bb5', grass: '#5675d6', brick: '#3b6fc0' },
  star: { sky: ['#2a1060', '#c050c0'], hill: '#7a3ab0', hill2: '#5a2a90', ground: '#7a4ad8', grass: '#ffd23a', brick: '#a050e0' },
  sky: { sky: ['#ffb36b', '#ffe3b5'], hill: '#ffffff', hill2: '#ffeede', ground: '#c66a2a', grass: '#3cb043', brick: '#c0602a' },
};

export function create(api) {
  const view = makeCanvas(api, VW, VH);
  const { ctx } = view;
  let L, grid, theme;
  let levelIdx = 0;
  let plist = [], enemies = [], items = [], parts = [], pops = [];
  let camX = 0, time = 300, lives = 5, state = 'title', stateT = 0, clock = 0;
  let stack = null, warpTo = null, secretClear = false, secretsFound = 0;
  let ui = null;
  const tileCache = {};

  // ---------- setup ----------
  function startLevel(idx) {
    levelIdx = idx;
    stack = null; warpTo = null; secretClear = false;
    L = LEVELS[idx]();
    grid = L.g; theme = THEMES[L.theme];
    enemies = []; items = []; parts = []; pops = [];
    for (const e of L.ents) spawnEnemy(e);
    const humans = api.active();
    plist = plist.length ? plist : humans.map((p) => ({ p, score: 0, coins: 0 }));
    plist.forEach((pl, i) => Object.assign(pl, {
      x: (L.start + i * 1.2) * T, y: (ROWS - 2) * T - 42, vx: 0, vy: 0, w: 30, h: 42, big: pl.big || false,
      onGround: false, facing: 1, dead: false, deadT: 0, inv: 0, star: 0, twirl: false, jumpHeld: false, anim: 0, respawn: 0,
    }));
    plist.forEach((pl) => { if (pl.big) { pl.h = 80; pl.y -= 38; } });
    camX = 0; time = 300; state = 'intro'; stateT = 2;
    tileCache.theme = null;
    api.setRemoteMode('sideways');
    api.showCursors(false);
    api.music('bros');
  }
  function spawnEnemy(e) {
    let y;
    if (e.y != null) y = (e.y + 1) * T - 40;
    else { y = 0; for (let r = 0; r < ROWS; r++) if (SOLIDS.has(grid[r][e.x])) { y = r * T - 40; break; } }
    enemies.push({ type: e.type, x: e.x * T + 4, y, w: 40, h: 40, vx: -70, vy: 0, active: false, dead: false, deadT: 0, shell: false, kicked: false, flat: false });
  }

  // ---------- physics ----------
  const tileAt = (px, py) => {
    const c = Math.floor(px / T), r = Math.floor(py / T);
    if (c < 0 || c >= L.width) return SOLID;
    if (r < 0 || r >= ROWS) return E;
    return grid[r][c];
  };
  const solidAt = (px, py) => SOLIDS.has(tileAt(px, py));

  function moveBody(b, dt, onHead) {
    // X
    b.x += b.vx * dt;
    const hitX = () => {
      for (let yy = b.y + 2; yy < b.y + b.h - 2; yy += T / 2) {
        if (b.vx > 0 && (solidAt(b.x + b.w, yy) || solidAt(b.x + b.w, b.y + b.h - 2))) return 1;
        if (b.vx < 0 && (solidAt(b.x, yy) || solidAt(b.x, b.y + b.h - 2))) return -1;
      }
      return 0;
    };
    const hx = hitX();
    if (hx > 0) { b.x = Math.floor((b.x + b.w) / T) * T - b.w - 0.01; b.wallHit = true; }
    else if (hx < 0) { b.x = Math.floor(b.x / T + 1) * T + 0.01; b.wallHit = true; }
    else b.wallHit = false;
    // Y
    b.y += b.vy * dt;
    b.onGround = false;
    if (b.vy > 0) {
      if (solidAt(b.x + 3, b.y + b.h) || solidAt(b.x + b.w - 3, b.y + b.h)) {
        b.y = Math.floor((b.y + b.h) / T) * T - b.h; b.vy = 0; b.onGround = true;
      }
    } else if (b.vy < 0) {
      const lx = b.x + 4, rx = b.x + b.w - 4, cx = b.x + b.w / 2;
      if (solidAt(lx, b.y) || solidAt(rx, b.y)) {
        // bump the tile closest to the center
        const col = solidAt(cx, b.y) ? Math.floor(cx / T) : solidAt(lx, b.y) ? Math.floor(lx / T) : Math.floor(rx / T);
        const row = Math.floor(b.y / T);
        b.y = (row + 1) * T + 0.01; b.vy = 40;
        if (onHead) onHead(col, row);
      }
    }
  }

  function bumpTile(pl, c, r) {
    const t = grid[r] && grid[r][c];
    if (t === undefined) return;
    if (t === BRICK) {
      if (pl.big) {
        grid[r][c] = E; api.audio.play('break');
        for (let i = 0; i < 4; i++) parts.push({ x: c * T + 24, y: r * T + 24, vx: (i % 2 ? 1 : -1) * (120 + Math.random() * 80), vy: -500 - (i < 2 ? 200 : 0), t: 1.5, kind: 'brick' });
        pl.score += 50;
      } else { api.audio.play('bump'); pops.push({ c, r, t: 0.15 }); }
    } else if (t === QCOIN || t === QMUSH || t === QSTAR) {
      grid[r][c] = USED; pops.push({ c, r, t: 0.15 });
      if (t === QCOIN) { pl.coins++; pl.score += 200; api.audio.play('coin'); parts.push({ x: c * T + 24, y: r * T - 10, vx: 0, vy: -600, t: 0.5, kind: 'coin' }); }
      else { items.push({ type: t === QSTAR ? 'star' : 'mush', x: c * T + 6, y: r * T - 36, w: 36, h: 36, vx: 120, vy: -200, emerge: 0.4 }); api.audio.play('item'); }
    } else api.audio.play('bump');
    // knock enemies standing on it
    for (const e of enemies) if (!e.dead && e.x + e.w > c * T && e.x < c * T + T && Math.abs(e.y + e.h - r * T) < 6) killEnemy(e, pl, true);
  }

  function killEnemy(e, pl, flip) {
    e.dead = true; e.deadT = flip ? 2 : 0.5; e.flat = !flip; e.vy = flip ? -500 : 0;
    if (pl) { pl.score += 100; }
    api.audio.play(flip ? 'hit' : 'stomp');
  }
  function hurt(pl) {
    if (pl.inv > 0 || pl.star > 0 || pl.dead) return;
    if (pl.big) { pl.big = false; pl.y += pl.h - 42; pl.h = 42; pl.inv = 2; api.audio.play('shrink'); api.rumble(pl.p.index, 200); }
    else die(pl);
  }
  function enterPipe(w) {
    state = 'warp'; stateT = 0.8; warpTo = w;
    const px = w.x * T + T;
    for (const o of plist) { o.vx = 0; o.vy = 0; if (!o.dead) { o.x = px - o.w / 2 + (o.p.index - (plist.length - 1) / 2) * 8; } }
    api.audio.play('shrink');
  }
  function finishWarp() {
    const w = warpTo; warpTo = null;
    if (w.back && stack) {
      ({ L, grid, theme, enemies, items } = stack);
      const ret = stack.ret; stack = null;
      const top = grid.findIndex((row) => row[ret] === PIPE_TL);
      plist.forEach((pl, i) => { Object.assign(pl, { x: ret * T + T - pl.w / 2 + (i - (plist.length - 1) / 2) * 8, y: top * T - pl.h - 2, vx: 0, vy: -650, dead: false, inv: 1 }); });
      camX = Math.max(0, Math.min(L.width * T - VW, ret * T - VW * 0.4));
    } else {
      stack = { L, grid, theme, enemies, items, ret: w.ret };
      L = w.room(); grid = L.g; theme = THEMES[L.theme];
      enemies = []; items = [];
      for (const e of L.ents) spawnEnemy(e);
      plist.forEach((pl, i) => Object.assign(pl, { x: (L.start + i * 1.2) * T, y: 2 * T, vx: 0, vy: 0, dead: false }));
      camX = 0;
      api.toast(L.secret ? '🤫 A secret room…' : '💰 Bonus room!');
    }
    tileCache.theme = null;
    parts = []; pops = [];
    state = 'play';
    api.audio.play('powerup');
  }

  function die(pl) {
    if (pl.dead) return;
    pl.dead = true; pl.deadT = 0; pl.vy = -800; pl.vx = 0; pl.big = false; pl.h = 42;
    api.audio.play('die'); api.rumble(pl.p.index, 500);
  }

  function updatePlayer(pl, dt) {
    const p = pl.p, B = api.BTN;
    if (pl.dead) {
      pl.deadT += dt; pl.vy += 1800 * dt; pl.y += pl.vy * dt;
      if (pl.deadT > 3 && plist.some((o) => !o.dead)) {
        // respawn above the most advanced living buddy
        const buddy = plist.filter((o) => !o.dead).sort((a, b) => b.x - a.x)[0];
        Object.assign(pl, { dead: false, x: buddy.x, y: Math.max(0, buddy.y - 140), vx: 0, vy: 0, inv: 2.5, h: 42, big: false });
        api.audio.play('powerup');
      }
      return;
    }
    if (pl.inv > 0) pl.inv -= dt;
    if (pl.star > 0) pl.star -= dt;
    const dir = p.dirX();
    const run = p.down(B.ONE) || p.down(B.B);
    const max = run ? 430 : 260;
    const acc = pl.onGround ? 1500 : 950;
    if (dir) { pl.vx += dir * acc * dt; pl.facing = dir; if (Math.sign(pl.vx) !== dir && pl.onGround) pl.vx += dir * 1500 * dt; }
    else if (pl.onGround) { const f = 1700 * dt; pl.vx = Math.abs(pl.vx) < f ? 0 : pl.vx - Math.sign(pl.vx) * f; }
    pl.vx = Math.max(-max, Math.min(max, pl.vx));

    const jumpBtn = p.down(B.TWO) || p.down(B.A);
    const jumpPress = p.pressed(B.TWO) || p.pressed(B.A);
    if (jumpPress && pl.onGround) { pl.vy = -860 - Math.abs(pl.vx) * 0.15; pl.onGround = false; pl.twirl = false; api.audio.play('jump'); }
    const sw = p.takeSwing();
    if (sw) {
      if (pl.onGround) { pl.vy = -700; pl.twirl = true; pl.twirlT = 0.6; api.audio.play('spin'); }
      else if (!pl.twirl) { pl.twirl = true; pl.twirlT = 0.6; pl.vy = Math.min(pl.vy, -250); api.audio.play('spin'); }
    }
    if (pl.twirlT > 0) pl.twirlT -= dt;
    const rising = pl.vy < 0;
    const grav = (rising && (jumpBtn || pl.twirlT > 0) ? 1500 : 3000) * (cheat('moon') ? 0.42 : 1);
    pl.vy = Math.min(900, pl.vy + grav * dt);
    if (pl.twirlT > 0 && pl.vy > 120) pl.vy = 120;

    moveBody(pl, dt, (c, r) => bumpTile(pl, c, r));
    // stand on other players' heads
    for (const o of plist) {
      if (o === pl || o.dead || pl.vy < 0) continue;
      if (pl.x + pl.w > o.x + 4 && pl.x < o.x + o.w - 4 && pl.y + pl.h > o.y && pl.y + pl.h < o.y + 18) {
        pl.y = o.y - pl.h; pl.vy = 0; pl.onGround = true;
      }
    }
    if (pl.onGround) pl.twirl = false;
    // camera bounds
    if (pl.x < camX + 4) { pl.x = camX + 4; if (pl.vx < 0) pl.vx = 0; }
    if (pl.x + pl.w > camX + VW - 4) { pl.x = camX + VW - 4 - pl.w; if (pl.vx > 0) pl.vx = 0; }
    if (pl.y > ROWS * T + 60) die(pl);
    pl.anim += Math.abs(pl.vx) * dt / 60;
    if (pl.onGround && Math.abs(pl.vx) > 330 && Math.random() < dt * 14) parts.push({ x: pl.x + pl.w / 2 - Math.sign(pl.vx) * 10, y: pl.y + pl.h - 4, vx: -pl.vx * 0.1, vy: -60, t: 0.4, kind: 'dust' });
    if (pl.onGround && !pl.wasGround) for (let k = 0; k < 4; k++) parts.push({ x: pl.x + pl.w / 2, y: pl.y + pl.h - 4, vx: (k - 1.5) * 90, vy: -80, t: 0.35, kind: 'dust' });
    pl.wasGround = pl.onGround;
    // pipes: stand on a warp pipe and press ↓
    if (state === 'play' && pl.onGround && p.down(B.DOWN) && L.warps.length) {
      const c = Math.floor((pl.x + pl.w / 2) / T), r = Math.floor((pl.y + pl.h + 4) / T);
      const tile = grid[r] && grid[r][c];
      if (tile === PIPE_TL || tile === PIPE_TR) {
        const w = L.warps.find((wp) => wp.x === (tile === PIPE_TL ? c : c - 1));
        if (w) enterPipe(w);
      }
    }
    // secret exit (red flag)
    if (L.secret && state === 'play' && pl.x + pl.w > L.secret.x * T + 20 && pl.y < (ROWS - 2) * T) {
      state = 'clear'; stateT = 4; secretClear = true; secretsFound++;
      pl.score += 5000;
      api.audio.stopMusic(); api.audio.play('win'); api.audio.play('cheer');
      for (const o of plist) api.rumble(o.p.index, 400);
    }
    // coins
    for (const [cx, cy] of [[pl.x + 4, pl.y + 4], [pl.x + pl.w - 4, pl.y + 4], [pl.x + 4, pl.y + pl.h - 4], [pl.x + pl.w - 4, pl.y + pl.h - 4], [pl.x + pl.w / 2, pl.y + pl.h / 2]]) {
      const c = Math.floor(cx / T), r = Math.floor(cy / T);
      if (grid[r] && grid[r][c] === COIN) { grid[r][c] = E; pl.coins++; pl.score += 100; api.audio.play('coin'); }
    }
    if (pl.coins >= 100) { pl.coins -= 100; lives++; api.audio.play('powerup'); }
    // flag
    if (pl.x + pl.w > L.flag * T + 20 && state === 'play') {
      state = 'clear'; stateT = 4;
      const h = Math.max(0, (ROWS - 2) * T - pl.y);
      pl.score += Math.round(h / 10) * 100 + Math.ceil(time) * 10;
      api.audio.stopMusic(); api.audio.play('win');
      for (const o of plist) api.rumble(o.p.index, 300);
    }
  }

  function updateEnemy(e, dt) {
    if (!e.active) { if (e.x < camX + VW + 60) e.active = true; else return; }
    if (e.dead) {
      e.deadT -= dt;
      if (!e.flat) { e.vy += 1800 * dt; e.y += e.vy * dt; }
      return;
    }
    if (e.shell && !e.kicked) e.vx = 0;
    e.vy = Math.min(900, e.vy + 2200 * dt);
    moveBody(e, dt);
    if (e.wallHit) e.vx = -e.vx;
    if (e.y > ROWS * T + 100) { e.dead = true; e.deadT = 0; }
    if (e.x < camX - 300) { e.dead = true; e.deadT = 0; }
    // moving shell knocks enemies
    if (e.kicked) for (const o of enemies) {
      if (o === e || o.dead || !o.active) continue;
      if (overlap(e, o)) { killEnemy(o, null, true); }
    }
    // players
    for (const pl of plist) {
      if (pl.dead || !overlap(pl, e)) continue;
      if (pl.star > 0) { killEnemy(e, pl, true); continue; }
      const stomp = pl.vy > 60 && pl.y + pl.h - e.y < 26;
      if (stomp) {
        const p = pl.p;
        pl.vy = (p.down(api.BTN.TWO) || p.down(api.BTN.A)) ? -820 : -520;
        api.rumble(p.index, 60);
        if (e.type === 'k') {
          if (!e.shell) { e.shell = true; e.kicked = false; e.h = 34; e.y += 6; e.vx = 0; api.audio.play('stomp'); pl.score += 100; }
          else if (e.kicked) { e.kicked = false; e.vx = 0; api.audio.play('stomp'); }
          else { e.kicked = true; e.vx = (pl.x + pl.w / 2 < e.x + e.w / 2 ? 1 : -1) * 620; api.audio.play('hit'); }
        } else killEnemy(e, pl, false);
      } else if (e.shell && !e.kicked) {
        e.kicked = true; e.vx = (pl.x + pl.w / 2 < e.x + e.w / 2 ? 1 : -1) * 620; e.x += Math.sign(e.vx) * 12; api.audio.play('hit'); pl.inv = Math.max(pl.inv, 0.25);
      } else hurt(pl);
    }
  }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function updateItem(it, dt) {
    if (it.emerge > 0) { it.emerge -= dt; it.y -= 90 * dt; return; }
    it.vy = Math.min(900, it.vy + 2000 * dt);
    moveBody(it, dt);
    if (it.wallHit) it.vx = -it.vx;
    if (it.type === 'star' && it.onGround) it.vy = -700;
    for (const pl of plist) {
      if (pl.dead || !overlap(pl, it)) continue;
      it.gone = true; pl.score += 1000;
      if (it.type === 'mush') { if (!pl.big) { pl.big = true; pl.y -= 38; pl.h = 80; } api.audio.play('powerup'); }
      else { pl.star = 9; api.audio.play('powerup'); }
      api.rumble(pl.p.index, 150);
    }
    if (it.y > ROWS * T + 100) it.gone = true;
  }

  function update(dt, t) {
    clock = t;
    if (state === 'title') { draw(); return; }
    if (state === 'intro') { stateT -= dt; if (stateT <= 0) state = 'play'; draw(); return; }
    if (state === 'gameover') { draw(); return; }
    if (state === 'play') {
      time -= dt * 2.2;
      if (time <= 0) { time = 0; plist.forEach((pl) => die(pl)); }
    }
    if (state === 'warp') {
      stateT -= dt;
      for (const pl of plist) if (!pl.dead) pl.y += 70 * dt;
      if (stateT <= 0) finishWarp();
      draw(); return;
    }
    if (state === 'clear') {
      stateT -= dt;
      for (const pl of plist) if (!pl.dead) { pl.vx = 200; pl.vy = Math.min(900, pl.vy + 2500 * dt); moveBody(pl, dt); pl.anim += dt * 3; }
      if (stateT <= 0) {
        let next = secretClear ? SECRET_IDX : levelIdx === SECRET_IDX ? 2 : levelIdx + 1;
        if (next === SECRET_IDX && !secretClear) next = LEVELS.length;
        if (next < LEVELS.length) startLevel(next);
        else victory();
      }
      draw(); return;
    }
    for (const pl of plist) updatePlayer(pl, dt);
    for (const e of enemies) updateEnemy(e, dt);
    enemies = enemies.filter((e) => !(e.dead && e.deadT <= 0));
    for (const it of items) updateItem(it, dt);
    items = items.filter((it) => !it.gone);
    for (const pa of parts) { pa.t -= dt; pa.vy += (pa.kind === 'dust' ? 0 : 1800) * dt; pa.x += pa.vx * dt; pa.y += pa.vy * dt; }
    parts = parts.filter((pa) => pa.t > 0);
    for (const po of pops) po.t -= dt;
    pops = pops.filter((po) => po.t > 0);

    // all dead?
    if (plist.every((pl) => pl.dead && pl.deadT > 2)) {
      if (!cheat('infLives')) lives--;
      if (lives <= 0) { gameOver(); return; }
      plist.forEach((pl) => { pl.big = false; });
      startLevel(levelIdx);
    }
    // camera follows the average of the living
    const alive = plist.filter((pl) => !pl.dead);
    if (alive.length) {
      const avg = alive.reduce((s, pl) => s + pl.x, 0) / alive.length;
      const maxX = Math.max(...alive.map((pl) => pl.x)), minX = Math.min(...alive.map((pl) => pl.x));
      let target = avg - VW * 0.4;
      target = Math.max(target, maxX - VW + 200);
      target = Math.min(target, minX - 60);
      target = Math.max(0, Math.min(L.width * T - VW, target));
      camX += (target - camX) * Math.min(1, dt * 6);
    }
    draw();
  }

  // ---------- drawing ----------
  function tileSprite(t) {
    if (tileCache.theme !== theme) { for (const k in tileCache) delete tileCache[k]; tileCache.theme = theme; }
    if (tileCache[t]) return tileCache[t];
    const c = document.createElement('canvas'); c.width = T; c.height = T;
    const g = c.getContext('2d');
    const bevel = (fill, light, dark, r = 6) => {
      g.fillStyle = dark; g.beginPath(); g.roundRect(1, 1, T - 2, T - 2, r); g.fill();
      g.fillStyle = light; g.beginPath(); g.roundRect(1, 1, T - 4, T - 4, r); g.fill();
      g.fillStyle = fill; g.beginPath(); g.roundRect(4, 4, T - 8, T - 8, r - 2); g.fill();
    };
    switch (t) {
      case GROUND: {
        const gr = g.createLinearGradient(0, 0, 0, T); gr.addColorStop(0, theme.ground); gr.addColorStop(1, shadeHex(theme.ground, 0.8));
        g.fillStyle = gr; g.fillRect(0, 0, T, T);
        for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.1)'; g.beginPath(); g.ellipse((i * 17) % T, (i * 23) % T, 4 + (i % 3) * 2, 3, 0, 0, 7); g.fill(); }
        break;
      }
      case BRICK: {
        g.fillStyle = shadeHex(theme.brick, 0.55); g.fillRect(0, 0, T, T);
        for (let y = 0; y < 4; y++) for (let x = -1; x < 3; x++) {
          const bx = x * 24 + (y % 2) * 12 + 1.5, by = y * 12 + 1.5;
          const gr = g.createLinearGradient(0, by, 0, by + 9); gr.addColorStop(0, shadeHex(theme.brick, 1.25)); gr.addColorStop(1, theme.brick);
          g.fillStyle = gr; g.beginPath(); g.roundRect(bx, by, 21, 9, 2); g.fill();
        }
        break;
      }
      case QCOIN: case QMUSH: case QSTAR: {
        bevel('#f8b820', '#ffe08a', '#a86a00', 7);
        const gr = g.createLinearGradient(0, 0, T, T); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(4, 4, T - 8, T - 8);
        g.font = '900 32px Arial'; g.textAlign = 'center'; g.fillStyle = '#a86a00'; g.fillText('?', T / 2 + 2, 37); g.fillStyle = '#fff'; g.fillText('?', T / 2, 35);
        g.fillStyle = '#a86a00'; [[8, 8], [T - 10, 8], [8, T - 10], [T - 10, T - 10]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); });
        break;
      }
      case USED: bevel('#a0703a', '#c79a62', '#5a3a1a', 7); break;
      case SOLID: bevel('#b07a4a', '#e0ab78', '#6a4422', 5); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(10, 22, 28, 4); break;
      case PLAT: {
        g.fillStyle = '#fff6ec'; g.fillRect(0, 12, T, T - 12);
        g.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 3; i++) g.fillRect(8 + i * 14, 20, 4, T);
        const gr = g.createLinearGradient(0, 0, 0, 16); gr.addColorStop(0, '#9ce87e'); gr.addColorStop(1, '#4fb33f');
        g.fillStyle = gr; g.beginPath(); g.roundRect(0, 0, T, 16, 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(4, 3, T - 8, 3);
        break;
      }
      case PIPE_TL: case PIPE_TR: case PIPE_L: case PIPE_R: {
        const top = t === PIPE_TL || t === PIPE_TR, left = t === PIPE_TL || t === PIPE_L;
        // cylinder shading across the 2-tile-wide pipe
        const x0 = left ? 0 : -T, inset = top ? 0 : 5;
        const gr = g.createLinearGradient(x0 + inset, 0, x0 + 2 * T - inset, 0);
        gr.addColorStop(0, '#1a7a2c'); gr.addColorStop(0.25, '#7aec8a'); gr.addColorStop(0.45, '#3ccf55'); gr.addColorStop(1, '#14682a');
        g.fillStyle = gr; g.fillRect(left ? inset : 0, 0, T - inset, T);
        g.fillStyle = '#0f4f1f';
        if (top) { g.fillRect(0, 0, T, 3); g.fillRect(0, T - 4, T, 4); if (left) g.fillRect(0, 0, 3, T); else g.fillRect(T - 3, 0, 3, T); }
        else { if (left) g.fillRect(inset, 0, 3, T); else g.fillRect(T - inset - 3, 0, 3, T); }
        break;
      }
      default: break;
    }
    tileCache[t] = c;
    return c;
  }
  function shadeHex(hex, f) {
    const n = parseInt(hex.slice(1), 16), k = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
  }

  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, theme.sky[0]); g.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    if (L.theme !== 'cave') {
      // sun with glow
      const sx = 1040 - camX * 0.02, sy = 120;
      const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 160); sg.addColorStop(0, 'rgba(255,250,220,.95)'); sg.addColorStop(0.25, 'rgba(255,240,180,.5)'); sg.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 160, 0, 7); ctx.fill();
      ctx.fillStyle = '#fffbe6'; ctx.beginPath(); ctx.arc(sx, sy, 42, 0, 7); ctx.fill();
      // far mountains
      ctx.fillStyle = L.theme === 'sky' ? 'rgba(255,220,200,.6)' : 'rgba(150,190,230,.7)';
      ctx.beginPath(); ctx.moveTo(0, VH);
      for (let x = -40; x <= VW + 40; x += 160) { const wx = x + ((camX * 0.08) % 160); const h = 200 + ((Math.floor((x + camX * 0.08) / 160) * 37) % 5) * 30; ctx.lineTo(wx - ((camX * 0.08) % 160) * 2 + 80, 470 - h); ctx.lineTo(wx - ((camX * 0.08) % 160) * 2 + 160, 470); }
      ctx.lineTo(VW, VH); ctx.fill();
      // clouds (soft, shaded)
      for (let i = 0; i < 8; i++) {
        const x = ((i * 380 - camX * 0.3) % (VW + 400) + VW + 400) % (VW + 400) - 200, y = 80 + (i * 53) % 180;
        ctx.fillStyle = 'rgba(200,215,235,.9)';
        ctx.beginPath(); ctx.arc(x + 4, y + 8, 30, 0, 7); ctx.arc(x + 39, y - 6, 38, 0, 7); ctx.arc(x + 79, y + 8, 28, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.arc(x + 35, y - 14, 38, 0, 7); ctx.arc(x + 75, y, 28, 0, 7); ctx.fill();
      }
    } else {
      for (let i = 0; i < 60; i++) { const x = ((i * 137 - camX * 0.1) % VW + VW) % VW, tw = 0.3 + 0.7 * Math.abs(Math.sin(clock * 2 + i)); ctx.fillStyle = `rgba(180,200,255,${tw * 0.6})`; ctx.fillRect(x, (i * 71) % 420, 2, 2); }
      // stalactites
      ctx.fillStyle = '#1a1c38';
      for (let i = 0; i < 14; i++) { const x = ((i * 113 - camX * 0.3) % (VW + 120) + VW + 120) % (VW + 120) - 60; ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x, 60 + (i * 29) % 80); ctx.lineTo(x + 30, 0); ctx.fill(); }
    }
    // parallax hills with highlights
    for (const [layer, col, amp, base, par] of [[0, theme.hill2, 90, 520, 0.2], [1, theme.hill, 60, 590, 0.4]]) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, VH);
      for (let x = 0; x <= VW; x += 16) { const wx = x + camX * par; ctx.lineTo(x, base - Math.abs(Math.sin(wx / (260 + layer * 90))) * amp); }
      ctx.lineTo(VW, VH); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 4; ctx.beginPath();
      for (let x = 0; x <= VW; x += 16) { const wx = x + camX * par; const yy = base - Math.abs(Math.sin(wx / (260 + layer * 90))) * amp + 4; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
      ctx.stroke();
    }
    // bushes in front
    if (L.theme === 'day') {
      for (let i = 0; i < 10; i++) {
        const x = ((i * 290 - camX * 0.7) % (VW + 300) + VW + 300) % (VW + 300) - 150;
        ctx.fillStyle = '#2e9e3e'; ctx.beginPath(); ctx.arc(x, 630, 34, Math.PI, 0); ctx.arc(x + 40, 630, 44, Math.PI, 0); ctx.arc(x + 82, 630, 30, Math.PI, 0); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(x + 30, 605, 10, 0, 7); ctx.fill();
      }
    }
  }

  function draw() {
    view.begin('#000');
    if (!L) { drawTitleBg(); view.end(); return; }
    drawBg();
    ctx.save();
    ctx.translate(-Math.round(camX), 0);
    const c0 = Math.max(0, Math.floor(camX / T)), c1 = Math.min(L.width - 1, Math.ceil((camX + VW) / T));
    for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
      const t = grid[r][c];
      if (t === E) continue;
      if (t === COIN) {
        const sx = Math.abs(Math.cos(clock * 4 + c * 0.3));
        const ccx = c * T + T / 2, ccy = r * T + T / 2;
        const cg = ctx.createLinearGradient(ccx - 14, ccy - 18, ccx + 14, ccy + 18); cg.addColorStop(0, '#fff3a0'); cg.addColorStop(0.5, '#ffd23a'); cg.addColorStop(1, '#d99a00');
        ctx.fillStyle = cg; ctx.strokeStyle = '#9a6a00'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(ccx, ccy, 14 * sx + 2, 18, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(ccx - 2 * sx, ccy - 10, 3 * sx + 1, 20);
        continue;
      }
      const pop = pops.find((p) => p.c === c && p.r === r);
      const oy = pop ? -Math.sin((pop.t / 0.15) * Math.PI) * 12 : 0;
      ctx.drawImage(tileSprite(t), c * T, r * T + oy);
      if (t === GROUND && (r === 0 || grid[r - 1][c] !== GROUND) && L.theme !== 'cave') {
        ctx.fillStyle = theme.grass; ctx.fillRect(c * T, r * T, T, 11);
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(c * T, r * T + 2, T, 3);
        ctx.fillStyle = theme.grass; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(c * T + k * 12 + 2, r * T + 10); ctx.lineTo(c * T + k * 12 + 6, r * T + 16); ctx.lineTo(c * T + k * 12 + 10, r * T + 10); ctx.fill(); }
      }
    }
    // flag
    const groundY = (ROWS - 2) * T;
    // pipe hints
    for (const w of L.warps) {
      const top = grid.findIndex((row) => row[w.x] === PIPE_TL);
      if (top < 0) continue;
      const near = plist.some((pl) => !pl.dead && Math.abs(pl.x + pl.w / 2 - (w.x + 1) * T) < 3 * T);
      if (near) bigText(ctx, '▼', (w.x + 1) * T, top * T - 70 + Math.sin(clock * 6) * 6, 30, '#fff', '#1a8a30');
    }
    if (L.secret) {
      const sx = L.secret.x * T + 20, sTop = L.secret.top * T;
      ctx.fillStyle = '#ddd'; ctx.fillRect(sx, sTop, 8, groundY - sTop);
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(sx + 4, sTop, 12, 0, 7); ctx.fill();
      const sy = state === 'clear' && secretClear ? sTop + 20 + (1 - Math.max(0, stateT - 2) / 2) * (groundY - sTop - 80) : sTop + 20;
      ctx.fillStyle = '#ff3b4a'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 60, sy + 25 + Math.sin(clock * 5) * 4); ctx.lineTo(sx, sy + 50); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 20px Arial'; ctx.fillText('★', sx - 24, sy + 33);
    }
    if (L.flag < L.width) {
    const fx = L.flag * T + 20;
    ctx.fillStyle = '#ddd'; ctx.fillRect(fx, groundY - 9 * T, 8, 9 * T);
    ctx.fillStyle = '#3cd16b'; ctx.beginPath(); ctx.arc(fx + 4, groundY - 9 * T, 12, 0, 7); ctx.fill();
    const flagY = state === 'clear' ? groundY - 9 * T + 20 + (1 - Math.max(0, stateT - 2) / 2) * (8 * T - 40) : groundY - 9 * T + 20;
    ctx.fillStyle = '#35b6ff'; ctx.beginPath(); ctx.moveTo(fx, flagY); ctx.lineTo(fx - 60, flagY + 25); ctx.lineTo(fx, flagY + 50); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 18px Arial'; ctx.fillText('W', fx - 22, flagY + 32);
    ctx.fillStyle = '#9a6a3a'; ctx.fillRect(fx - 10, groundY - 20, 28, 20);
    // castle
    const cx = (L.flag + 5) * T;
    ctx.fillStyle = '#b06a3a'; ctx.fillRect(cx, groundY - 4 * T, 5 * T, 4 * T); ctx.fillRect(cx + T, groundY - 6 * T, 3 * T, 2 * T);
    for (let i = 0; i < 5; i++) ctx.fillRect(cx + i * T + 6, groundY - 4 * T - 16, 30, 16);
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(cx + 2.5 * T, groundY - T, 30, Math.PI, 0); ctx.fillRect(cx + 2.5 * T - 30, groundY - T, 60, T); ctx.fill();

    }
    for (const it of items) drawItem(it);
    for (const e of enemies) drawEnemy(e);
    for (const pl of plist) drawPl(pl);
    for (const pa of parts) {
      if (pa.kind === 'coin') { ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.ellipse(pa.x, pa.y, 10, 16, 0, 0, 7); ctx.fill(); }
      else if (pa.kind === 'dust') { ctx.fillStyle = `rgba(255,255,255,${pa.t * 1.6})`; ctx.beginPath(); ctx.arc(pa.x, pa.y, 6 + (0.4 - pa.t) * 20, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = theme.brick; ctx.fillRect(pa.x - 10, pa.y - 10, 20, 20); }
    }
    ctx.restore();
    const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VH * 1.0);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    drawHud();
    if (state === 'intro') {
      ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(0, 0, VW, VH);
      bigText(ctx, L.name, VW / 2, VH / 2 - 40, 80, '#fff', '#000');
      bigText(ctx, `× ${lives}`, VW / 2, VH / 2 + 60, 50, '#ffd23a', '#000');
    }
    if (state === 'clear') bigText(ctx, secretClear ? '★ SECRET EXIT! ★' : 'COURSE CLEAR!', VW / 2, VH / 2 - 80, 90, secretClear ? '#ff6b9a' : '#ffd23a', '#7a3d00');
    if (state === 'warp') { ctx.fillStyle = `rgba(0,0,0,${1 - stateT / 0.8})`; ctx.fillRect(0, 0, VW, VH); }
    view.end();
  }
  function drawPl(pl) {
    if (pl.inv > 0 && Math.floor(pl.inv * 15) % 2 && !pl.dead) return;
    const color = pl.star > 0 ? `hsl(${(clock * 720) % 360},90%,55%)` : pl.p.color;
    ctx.save();
    const bx = pl.x + pl.w / 2, by = pl.y + pl.h;
    if (pl.twirlT > 0) { ctx.translate(bx, by - pl.h / 2); ctx.scale(Math.cos(clock * 30), 1); ctx.translate(-bx, -(by - pl.h / 2)); }
    if (pl.dead) { ctx.translate(bx, by - 20); ctx.rotate(Math.PI); ctx.translate(-bx, -(by - 20)); }
    drawPlumber(ctx, bx, by, pl.big ? 36 : 30, color, Math.abs(pl.vx) > 10 && pl.onGround ? pl.anim : 0, pl.facing, pl.big);
    ctx.restore();
    ctx.fillStyle = pl.p.color; ctx.font = '800 16px Arial'; ctx.textAlign = 'center';
    ctx.fillText('P' + (pl.p.index + 1), bx, pl.y - 10);
  }
  function drawEnemy(e) {
    if (!e.active) return;
    ctx.save();
    const cx = e.x + e.w / 2, by = e.y + e.h;
    if (e.dead && !e.flat) { ctx.translate(cx, by - 20); ctx.scale(1, -1); ctx.translate(-cx, -(by - 20)); }
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(30,15,5,.8)'; ctx.lineJoin = 'round';
    if (e.type === 'g') {
      const sq = e.flat ? 0.35 : 1;
      const step = Math.sin(clock * 12 + e.x) * 5;
      ctx.fillStyle = '#2a1608';
      ctx.beginPath(); ctx.ellipse(cx - 10 + step, by - 4, 9, 5, 0, 0, 7); ctx.ellipse(cx + 10 - step, by - 4, 9, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f2d2a2'; ctx.beginPath(); ctx.roundRect(cx - 12, by - 14 * sq, 24, 10 * sq, 4); ctx.fill(); ctx.stroke();
      const hg = ctx.createRadialGradient(cx - 6, by - 30 * sq, 2, cx, by - 20 * sq, 30); hg.addColorStop(0, '#c0703a'); hg.addColorStop(1, '#6a3410');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.moveTo(cx - 24, by - 10 * sq); ctx.quadraticCurveTo(cx - 26, by - 40 * sq, cx, by - 42 * sq); ctx.quadraticCurveTo(cx + 26, by - 40 * sq, cx + 24, by - 10 * sq); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (!e.flat) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx - 7, by - 26, 5, 7, 0, 0, 7); ctx.ellipse(cx + 7, by - 26, 5, 7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx - 6, by - 24, 3, 0, 7); ctx.arc(cx + 6, by - 24, 3, 0, 7); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx - 14, by - 36); ctx.lineTo(cx - 3, by - 31); ctx.moveTo(cx + 14, by - 36); ctx.lineTo(cx + 3, by - 31); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - 9, by - 15); ctx.lineTo(cx - 6, by - 19); ctx.lineTo(cx - 3, by - 15); ctx.moveTo(cx + 3, by - 15); ctx.lineTo(cx + 6, by - 19); ctx.lineTo(cx + 9, by - 15); ctx.fill();
      }
    } else {
      const dir = e.vx > 0 ? 1 : e.vx < 0 ? -1 : 1;
      if (!e.shell) {
        ctx.fillStyle = '#ffd36b';
        ctx.beginPath(); ctx.ellipse(cx - 8, by - 3, 6, 4, 0, 0, 7); ctx.ellipse(cx + 8, by - 3, 6, 4, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx + dir * 19, by - 30, 10, 12, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx + dir * 22, by - 34, 4, 5.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx + dir * 23.5, by - 33, 2.2, 0, 7); ctx.fill();
      }
      const sg = ctx.createRadialGradient(cx - 6, by - 24, 2, cx, by - 14, 24); sg.addColorStop(0, '#7af08a'); sg.addColorStop(1, '#1e9a34');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx, by - 14, 21, 17, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(10,70,20,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 10, by - 14); ctx.lineTo(cx - 6, by - 26); ctx.lineTo(cx + 6, by - 26); ctx.lineTo(cx + 10, by - 14); ctx.stroke();
      ctx.fillStyle = '#fff3c4'; ctx.strokeStyle = 'rgba(30,15,5,.8)'; ctx.beginPath(); ctx.roundRect(cx - 20, by - 11, 40, 6, 3); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  function drawItem(it) {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    if (it.type === 'mush') {
      ctx.fillStyle = '#f2e2c2'; ctx.fillRect(cx - 10, cy, 20, 18);
      ctx.fillStyle = '#ff4a5a'; ctx.beginPath(); ctx.arc(cx, cy + 2, 18, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - 7, cy - 6, 5, 0, 7); ctx.arc(cx + 8, cy - 4, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(cx - 6, cy + 5, 3, 7); ctx.fillRect(cx + 3, cy + 5, 3, 7);
    } else {
      ctx.fillStyle = `hsl(${(clock * 400) % 360},90%,60%)`;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 8 : 19; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      ctx.fill();
    }
  }
  function drawHud() {
    ctx.save();
    plist.forEach((pl, i) => {
      const x = 30 + i * 310;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 10, 12, 290, 56);
      ctx.fillStyle = pl.p.color; ctx.font = '800 26px Arial'; ctx.textAlign = 'left';
      ctx.fillText(`P${pl.p.index + 1} ${String(pl.score).padStart(7, '0')}`, x, 48);
      ctx.fillStyle = '#ffd23a'; ctx.fillText(`●×${String(pl.coins).padStart(2, '0')}`, x + 190, 48);
    });
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = '800 26px Arial';
    ctx.fillText(`${L.name}   ⏱ ${Math.ceil(time)}   ♥×${lives}`, VW - 24, VH - 20);
    ctx.restore();
  }
  function drawTitleBg() {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#5fb0ff'); g.addColorStop(1, '#bfe4ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#c66a2a'; ctx.fillRect(0, VH - 96, VW, 96); ctx.fillStyle = '#3cb043'; ctx.fillRect(0, VH - 96, VW, 12);
    api.active().forEach((p, i) => drawPlumber(ctx, 420 + i * 140, VH - 96, 60, p.color, clock, 1));
  }

  // ---------- menus ----------
  function title() {
    state = 'title'; L = null;
    if (ui) ui.remove();
    ui = overlay(api, `
      <h1 style="color:#e33;text-shadow:0 4px 0 #7a1010">Super Woo Bros.</h1>
      <p>${api.active().length} player co-op · 3 worlds of questionable quality</p>
      <div class="pill" data-ui="go" style="min-width:30vw">Start!</div>
      <p class="g-hint">Hold the remote sideways 📱↔ &nbsp; <b>D-pad</b> move · <b>2</b> jump · <b>1</b> run · <b>shake</b> twirl<br>
      Stand on your friends' heads. Bonk blocks. Grab the flag.<br>Keyboard: ←/→ move · X jump · Z run · Space twirl</p>
      <div class="pill small" data-ui="quit">Woo Menu</div>`, {
      go: () => { ui.remove(); ui = null; plist = []; lives = 5; startLevel(0); },
      quit: () => api.exit(),
    });
    ui.style.background = 'rgba(255,255,255,.6)';
  }
  function gameOver() {
    state = 'gameover';
    api.audio.stopMusic(); api.audio.play('lose');
    ui = overlay(api, `<h1>GAME OVER</h1><p>Even plumbers have bad days.</p>
      <div class="g-row"><div class="pill" data-ui="retry">Try Again</div><div class="pill" data-ui="quit">Woo Menu</div></div>`, {
      retry: () => { ui.remove(); ui = null; plist = []; lives = 5; startLevel(0); },
      quit: () => api.exit(),
    });
  }
  function victory() {
    state = 'gameover';
    const rows = [...plist].sort((a, b) => b.score - a.score);
    api.audio.play('cheer');
    ui = overlay(api, `<h1>🏰 You saved… someone!</h1>${secretsFound ? '<h2>★ Secret exits found: ' + secretsFound + '</h2>' : '<p>Psst… there might be a secret exit somewhere underground.</p>'}<p>The princess is in another castle. Probably. We ran out of budget.</p>
      <table class="score"><tr><th>Player</th><th>Score</th><th>Coins</th></tr>${rows.map((pl) => `<tr><td style="color:${pl.p.color};font-weight:800">P${pl.p.index + 1} ${api.getMe(pl.p.index).name}</td><td>${pl.score}</td><td>${pl.coins}</td></tr>`).join('')}</table>
      <div class="g-row"><div class="pill" data-ui="retry">Play Again</div><div class="pill" data-ui="quit">Woo Menu</div></div>`, {
      retry: () => { ui.remove(); ui = null; plist = []; lives = 5; startLevel(0); },
      quit: () => api.exit(),
    });
  }

  if (new URLSearchParams(location.search).has('debug')) {
    window.__bros = { start: (i) => { plist = []; startLevel(i); }, tp: (x, y) => { camX = Math.max(0, Math.min(L.width * T - VW, x * T - VW * 0.4)); for (const pl of plist) { pl.x = x * T; pl.y = y * T; pl.vy = 0; } }, get state() { return state; }, get level() { return L && L.name; } };
  }
  title();
  return { update, resize: view.resize, destroy() {} };
}
