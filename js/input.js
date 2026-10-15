// Players + input state. Up to 4 phone remotes; the TV's own keyboard/mouse
// also drives Player 1 so everything is testable without a phone.

export const BTN = {
  A: 1, B: 2, ONE: 4, TWO: 8, PLUS: 16, MINUS: 32, HOME: 64,
  UP: 128, DOWN: 256, LEFT: 512, RIGHT: 1024,
};
export const COLORS = ['#2fa8ff', '#ff4a5a', '#36c96b', '#f5b622'];
export const COLOR_NAMES = ['Blue', 'Red', 'Green', 'Yellow'];

export const settings = Object.assign(
  { sens: 1, invX: false, invY: false, vol: 0.7, music: true },
  (() => { try { return JSON.parse(localStorage.getItem('woo-settings')) || {}; } catch (e) { return {}; } })()
);
export function saveSettings() {
  try { localStorage.setItem('woo-settings', JSON.stringify(settings)); } catch (e) {}
}

class Player {
  constructor(i) {
    this.index = i;
    this.color = COLORS[i];
    this.link = null;        // network link id
    this.clientId = null;
    this.remoteName = '';
    this.hasMotion = false;
    this.battery = null;
    this.buttons = 0;        // phone buttons
    this.kbButtons = 0;      // keyboard buttons (P1 only)
    this.edges = 0;          // presses since last frame
    this.prevAll = 0;
    this.now = 0;
    this.cursor = { x: 0.5 + (i - 1.5) * 0.08, y: 0.5 };
    this.cursorVisible = true;
    this.steer = 0;          // -1..1 tilt steering (sideways) or roll (pointer)
    this.pitch = 0;          // -1..1
    this.mag = 0;            // linear acceleration magnitude (m/s²)
    this.swings = [];
    this.lastInput = 0;
    this.kbActive = false;
  }
  get connected() { return !!this.link || this.kbActive; }
  get phone() { return !!this.link; }
  down(b) { return (this.now & b) !== 0; }
  pressed(b) { return ((this.edges | (this.now & ~this.prevAll)) & b) !== 0; }
  released(b) { return (this.prevAll & b) !== 0 && (this.now & b) === 0; }
  takeSwing() {
    const s = this.swings.shift();
    return s || null;
  }
  // D-pad as vector
  dirX() { return (this.down(BTN.RIGHT) ? 1 : 0) - (this.down(BTN.LEFT) ? 1 : 0); }
  dirY() { return (this.down(BTN.DOWN) ? 1 : 0) - (this.down(BTN.UP) ? 1 : 0); }
}

export const players = [0, 1, 2, 3].map((i) => new Player(i));
export function activePlayers() {
  const a = players.filter((p) => p.connected);
  if (!a.length) a.push(players[0]);
  return a;
}

// Called at the start of each frame.
export function beginFrame() {
  for (const p of players) p.now = p.buttons | p.kbButtons;
}
// Called at the end of each frame.
export function endFrame() {
  const t = performance.now();
  for (const p of players) {
    p.prevAll = p.now;
    p.edges = 0;
    p.swings = p.swings.filter((s) => t - s.time < 400);
  }
}

// ---------- phone packets ----------
export function applyPacket(p, d) {
  p.lastInput = performance.now();
  if (d.t === 'in') {
    const nb = d.b | 0;
    p.edges |= (d.e | 0) | (nb & ~p.buttons);
    p.buttons = nb;
    if (d.d) {
      const sx = settings.invX ? -1 : 1, sy = settings.invY ? -1 : 1;
      p.cursor.x += (d.d[0] / 38) * settings.sens * sx;
      p.cursor.y += (d.d[1] / 24) * settings.sens * sy;
      p.cursor.x = Math.max(-0.02, Math.min(1.02, p.cursor.x));
      p.cursor.y = Math.max(-0.02, Math.min(1.02, p.cursor.y));
    }
    if (typeof d.s === 'number') p.steer = d.s;
    if (typeof d.p === 'number') p.pitch = d.p;
    if (typeof d.m === 'number') p.mag = d.m;
    if (typeof d.bat === 'number') p.battery = d.bat;
    if (d.mo !== undefined) p.hasMotion = !!d.mo;
  } else if (d.t === 'sw') {
    p.swings.push({ power: Math.max(0.15, Math.min(1, d.s || 0.5)), dir: d.dir || 0, time: performance.now() });
  }
}

// ---------- keyboard + mouse for player 1 ----------
const KEYMAP = {
  ArrowUp: BTN.UP, ArrowDown: BTN.DOWN, ArrowLeft: BTN.LEFT, ArrowRight: BTN.RIGHT,
  KeyW: BTN.UP, KeyS: BTN.DOWN, KeyA: BTN.LEFT, KeyD: BTN.RIGHT,
  Enter: BTN.A, KeyE: BTN.A, ShiftLeft: BTN.B, ShiftRight: BTN.B, KeyQ: BTN.B,
  KeyZ: BTN.ONE, KeyJ: BTN.ONE, KeyX: BTN.TWO, KeyK: BTN.TWO,
  Equal: BTN.PLUS, NumpadAdd: BTN.PLUS, KeyP: BTN.PLUS, Minus: BTN.MINUS, NumpadSubtract: BTN.MINUS,
  KeyH: BTN.HOME, Escape: BTN.HOME, Home: BTN.HOME,
};

// While something on the TV wants typed text (e.g. a Me name), keys go there instead of acting as buttons.
export const textInput = { handler: null };

export function initKeyboard(screenEl) {
  const p = players[0];
  const activate = () => { p.kbActive = true; };
  window.addEventListener('keydown', (e) => {
    if (textInput.handler) {
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Escape') { textInput.handler(e.key); e.preventDefault(); }
      return;
    }
    if (e.code === 'Space') {
      if (!e.repeat) p.swings.push({ power: 0.75, dir: 0, time: performance.now(), kb: true });
      p.mag = 22;
      setTimeout(() => { p.mag = 0; }, 180);
      e.preventDefault(); activate(); return;
    }
    const b = KEYMAP[e.code];
    if (b) {
      if (!(p.kbButtons & b)) p.edges |= b;
      p.kbButtons |= b; e.preventDefault(); activate();
    }
  });
  window.addEventListener('keyup', (e) => {
    const b = KEYMAP[e.code];
    if (b) p.kbButtons &= ~b;
  });
  window.addEventListener('blur', () => { p.kbButtons = 0; });
  screenEl.addEventListener('mousemove', (e) => {
    const r = screenEl.getBoundingClientRect();
    p.cursor.x = (e.clientX - r.left) / r.width;
    p.cursor.y = (e.clientY - r.top) / r.height;
    activate();
  });
  screenEl.addEventListener('mousedown', (e) => {
    const b = e.button === 2 ? BTN.B : BTN.A;
    p.edges |= b; p.kbButtons |= b; activate();
  });
  window.addEventListener('mouseup', (e) => {
    const b = e.button === 2 ? BTN.B : BTN.A;
    p.kbButtons &= ~b;
  });
  screenEl.addEventListener('contextmenu', (e) => e.preventDefault());
  // Real mouse clicks must not double-fire: the pointer system clicks for us.
  document.addEventListener('click', (e) => { if (e.isTrusted) { e.stopPropagation(); e.preventDefault(); } }, true);
}
