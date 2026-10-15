// "Woo Me" avatars — a little character per player slot, used across games.
import { COLORS } from './input.js';
import { cheat } from './cheats.js';

export const SKINS = ['#ffe7d1', '#ffd9b8', '#f6c9a0', '#e8b088', '#d29a6c', '#b77b52', '#8d5a3b', '#5e3a24'];
export const HAIRS = ['#1d1410', '#4a2e18', '#7a4a24', '#b07a3a', '#e8c25a', '#f2e6c4', '#c43a1e', '#7a7f88', '#3f58c9', '#e86fb0', '#3cc48a', '#9b59ff'];
export const SHIRTS = ['#2fa8ff', '#ff4a5a', '#36c96b', '#f5b622', '#9b59ff', '#ff8a2a', '#222831', '#f0f0f0', '#ff6fb5', '#20c0c0', '#8a5a2b', '#5a6b8a'];
export const PANTS = ['#3a3f4a', '#2b4a8a', '#5a3a1e', '#1d1d1d', '#7a7f88', '#a0302a'];
export const EYE_COLORS = ['#1d1d1d', '#3a6fd8', '#3aa35a', '#8a5a2b', '#9b59ff', '#c43a1e'];
export const LIPS = ['#a8473a', '#d6455f', '#7a3a2a', '#e86fb0'];

// Everything the editor can change, with labels (order = button order).
export const OPTIONS = {
  face: ['Round', 'Oval', 'Square', 'Heart'],
  hairStyle: ['Short', 'Long', 'Spiky', 'Bun', 'Afro', 'Bald', 'Mohawk', 'Ponytail', 'Curtains'],
  brows: ['Normal', 'Thick', 'Angry', 'Raised', 'None'],
  eyes: ['Dots', 'Happy', 'Big', 'Sleepy', 'Sparkle', 'Wink'],
  nose: ['Button', 'Round', 'Pointy', 'Big'],
  mouth: ['Smile', 'Meh', 'Oh!', 'Grin', 'Tongue', 'Smirk'],
  facial: ['None', 'Mustache', 'Beard', 'Goatee', 'Stubble'],
  glasses: ['None', 'Round', 'Square', 'Shades', 'Star'],
  hat: ['None', 'Cap', 'Beanie', 'Crown', 'Top Hat', 'Party', 'Headband'],
};

const NAMES = ['Bob', 'Ana', 'Kenji', 'Lola', 'Max', 'Zoe', 'Ivo', 'Mia', 'Rex', 'Tia', 'Gus', 'Ida', 'Otto', 'Yuki', 'Pim', 'Nia', 'Hugo', 'Ella', 'Bruno', 'Suki', 'Lars', 'Fifi'];
export function randomName() { return NAMES[Math.floor(Math.random() * NAMES.length)]; }

const BASE = {
  name: 'Player', skin: 2, face: 0, hair: 0, hairStyle: 0, brows: 0, eyes: 0, eyeColor: 0, nose: 0,
  mouth: 0, lips: 0, facial: 0, glasses: 0, hat: 0, hatColor: 1, blush: false, freckles: false,
  shirt: 0, pants: 0, height: 2, build: 2,
};
// Fill in fields that older saves (or hand-written CPU Mes) don't have.
export function normalize(me) {
  const m = Object.assign({}, BASE, me || {});
  if (m.glasses === true) m.glasses = 1;
  if (m.glasses === false) m.glasses = 0;
  return m;
}

function defaults(i) {
  return normalize({
    name: ['Player 1', 'Player 2', 'Player 3', 'Player 4'][i],
    skin: [2, 0, 4, 5][i], hair: [0, 3, 1, 4][i], hairStyle: [0, 1, 2, 3][i],
    eyes: i % 3, mouth: (i + 1) % 3, shirt: i, eyeColor: [0, 1, 3, 2][i], brows: i % 2,
  });
}

let profiles;
try { profiles = JSON.parse(localStorage.getItem('woo-me')) || null; } catch (e) { profiles = null; }
if (!Array.isArray(profiles) || profiles.length !== 4) profiles = [0, 1, 2, 3].map(defaults);
profiles = profiles.map(normalize);
export function getMe(i) { return profiles[i]; }
export function setMe(i, me) { profiles[i] = normalize(me); try { localStorage.setItem('woo-me', JSON.stringify(profiles)); } catch (e) {} }
export function resetMe() { profiles = [0, 1, 2, 3].map(defaults); try { localStorage.removeItem('woo-me'); } catch (e) {} }

export function randomMe(name) {
  const r = (n) => Math.floor(Math.random() * n);
  const pick = (k) => r(OPTIONS[k].length);
  return normalize({
    name: name || randomName(), skin: r(SKINS.length), face: pick('face'), hair: r(HAIRS.length), hairStyle: pick('hairStyle'),
    brows: pick('brows'), eyes: pick('eyes'), eyeColor: r(EYE_COLORS.length), nose: pick('nose'), mouth: pick('mouth'), lips: r(LIPS.length),
    facial: Math.random() < 0.3 ? 1 + r(4) : 0, glasses: Math.random() < 0.3 ? 1 + r(4) : 0, hat: Math.random() < 0.3 ? 1 + r(6) : 0,
    hatColor: r(SHIRTS.length), blush: Math.random() < 0.4, freckles: Math.random() < 0.25, shirt: r(SHIRTS.length), pants: r(PANTS.length),
    height: r(5), build: r(5),
  });
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// ---------- 2D portrait ----------
// Draws a Me head (and shoulders) centered at x,y with head radius r.
export function drawMe(ctx, meIn, x, y, r, opts = {}) {
  const me = normalize(meIn);
  const skin = SKINS[me.skin] || SKINS[2], hair = HAIRS[me.hair] || HAIRS[0], shirt = SHIRTS[me.shirt] || SHIRTS[0];
  const hatCol = SHIRTS[me.hatColor] || SHIRTS[1];
  const fw = [0.88, 0.8, 0.92, 0.86][me.face] || 0.88, fh = [1, 1.08, 0.98, 1.02][me.face] || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const outline = 'rgba(40,25,15,.35)';

  if (opts.color) { // player-color halo
    const g = ctx.createRadialGradient(0, r * 0.2, r * 0.4, 0, r * 0.2, r * 1.6);
    g.addColorStop(0, opts.color + '55'); g.addColorStop(1, opts.color + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, r * 0.2, r * 1.6, 0, 7); ctx.fill();
  }
  // shoulders
  if (opts.body !== false) {
    const bw = r * (0.85 + me.build * 0.1);
    const g = ctx.createLinearGradient(0, r * 0.9, 0, r * 2.6);
    g.addColorStop(0, shirt); g.addColorStop(1, shade(shirt, 0.7));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, r * 1.85, bw, r * 0.85, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, r * 0.98, r * 0.25, r * 0.12, 0, 0, 7); ctx.fill(); // neck
  }
  // hair behind the head
  ctx.fillStyle = hair;
  if (me.hairStyle === 1) { ctx.beginPath(); ctx.ellipse(0, r * 0.38, r * 1.08, r * 1.18, 0, 0, 7); ctx.fill(); }
  if (me.hairStyle === 4) { ctx.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ctx.moveTo(Math.cos(a) * r * 1.05, -r * 0.25 + Math.sin(a) * r * 1.0); ctx.arc(Math.cos(a) * r * 1.05, -r * 0.25 + Math.sin(a) * r * 1.0, r * 0.38, 0, 7); } ctx.fill(); }
  if (me.hairStyle === 7) { ctx.beginPath(); ctx.ellipse(r * 0.95, r * 0.25, r * 0.28, r * 0.6, -0.35, 0, 7); ctx.fill(); }

  // ears
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(-r * fw, r * 0.1, r * 0.17, 0, 7); ctx.arc(r * fw, r * 0.1, r * 0.17, 0, 7); ctx.fill();
  // head with soft shading
  const hg = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.15);
  hg.addColorStop(0, shade(skin, 1.06)); hg.addColorStop(1, shade(skin, 0.86));
  ctx.fillStyle = hg;
  ctx.beginPath();
  if (me.face === 2) { roundRect(ctx, -r * fw, -r * fh, r * fw * 2, r * fh * 2, r * 0.45); }
  else if (me.face === 3) { ctx.moveTo(0, r * fh); ctx.bezierCurveTo(-r * 0.75, r * 0.7, -r * fw * 1.05, -r * 0.2, -r * fw, -r * 0.4); ctx.arc(0, -r * 0.4, r * fw, Math.PI, 0); ctx.bezierCurveTo(r * fw * 1.05, -r * 0.2, r * 0.75, r * 0.7, 0, r * fh); }
  else ctx.ellipse(0, 0, r * fw, r * fh, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = r * 0.03; ctx.stroke();

  // freckles + blush
  if (me.freckles) { ctx.fillStyle = 'rgba(140,70,30,.45)'; for (const [fx, fy] of [[-0.42, 0.25], [-0.32, 0.32], [-0.5, 0.33], [0.42, 0.25], [0.32, 0.32], [0.5, 0.33]]) { ctx.beginPath(); ctx.arc(fx * r, fy * r, r * 0.03, 0, 7); ctx.fill(); } }
  if (me.blush) { ctx.fillStyle = 'rgba(255,100,120,.28)'; ctx.beginPath(); ctx.ellipse(-r * 0.5, r * 0.32, r * 0.17, r * 0.1, 0, 0, 7); ctx.ellipse(r * 0.5, r * 0.32, r * 0.17, r * 0.1, 0, 0, 7); ctx.fill(); }
  if (me.facial === 4) { ctx.fillStyle = 'rgba(40,30,25,.18)'; ctx.beginPath(); ctx.ellipse(0, r * 0.6, r * 0.62, r * 0.4, 0, 0, Math.PI); ctx.fill(); }

  // hair on top
  ctx.fillStyle = hair;
  ctx.beginPath();
  switch (me.hairStyle) {
    case 0: ctx.ellipse(0, -r * 0.45, r * 0.94, r * 0.62, 0, Math.PI * 0.95, Math.PI * 2.05); break;
    case 1: ctx.ellipse(0, -r * 0.5, r * 0.97, r * 0.62, 0, Math.PI, Math.PI * 2); ctx.rect(-r * 0.97, -r * 0.5, r * 0.26, r * 1.2); ctx.rect(r * 0.71, -r * 0.5, r * 0.26, r * 1.2); break;
    case 2: for (let i = -2; i <= 2; i++) { ctx.moveTo(i * r * 0.3 - r * 0.22, -r * 0.55); ctx.lineTo(i * r * 0.32, -r * 1.3 + Math.abs(i) * r * 0.1); ctx.lineTo(i * r * 0.3 + r * 0.22, -r * 0.55); } ctx.ellipse(0, -r * 0.55, r * 0.88, r * 0.36, 0, Math.PI, Math.PI * 2); break;
    case 3: ctx.ellipse(0, -r * 0.62, r * 0.75, r * 0.42, 0, Math.PI, Math.PI * 2); ctx.moveTo(r * 0.32, -r * 1.05); ctx.arc(0, -r * 1.05, r * 0.32, 0, 7); break;
    case 4: ctx.ellipse(0, -r * 0.62, r * 0.9, r * 0.5, 0, Math.PI, Math.PI * 2); break;
    case 5: break; // bald
    case 6: ctx.moveTo(-r * 0.16, -r * 0.4); ctx.lineTo(-r * 0.2, -r * 1.35); ctx.lineTo(r * 0.2, -r * 1.35); ctx.lineTo(r * 0.16, -r * 0.4); ctx.ellipse(0, -r * 0.6, r * 0.82, r * 0.3, 0, Math.PI, Math.PI * 2); break;
    case 7: ctx.ellipse(0, -r * 0.48, r * 0.93, r * 0.6, 0, Math.PI * 0.95, Math.PI * 2.05); break;
    case 8: ctx.moveTo(0, -r * 0.95); ctx.quadraticCurveTo(-r * 0.6, -r * 0.6, -r * 0.92, -r * 0.05); ctx.lineTo(-r * 0.95, -r * 0.55); ctx.ellipse(0, -r * 0.5, r * 0.96, r * 0.6, 0, Math.PI, Math.PI * 2); ctx.lineTo(r * 0.92, -r * 0.05); ctx.quadraticCurveTo(r * 0.6, -r * 0.6, 0, -r * 0.95); break;
    default: break;
  }
  ctx.fill();
  if (me.hairStyle === 5) { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.65, r * 0.25, r * 0.12, -0.4, 0, 7); ctx.fill(); }

  // brows
  const ey = r * 0.05, ex = r * 0.32;
  if (me.brows !== 4) {
    ctx.strokeStyle = shade(hair === HAIRS[5] ? HAIRS[3] : hair, 0.9); ctx.lineWidth = r * (me.brows === 1 ? 0.11 : 0.06);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      const by = ey - r * (me.brows === 3 ? 0.36 : 0.26);
      if (me.brows === 2) { ctx.moveTo(s * (ex + r * 0.15), by - r * 0.05); ctx.lineTo(s * (ex - r * 0.12), by + r * 0.06); }
      else { ctx.moveTo(s * (ex + r * 0.15), by + r * 0.03); ctx.quadraticCurveTo(s * ex, by - r * 0.06, s * (ex - r * 0.13), by + r * 0.02); }
      ctx.stroke();
    }
  }
  // eyes
  const ec = EYE_COLORS[me.eyeColor] || EYE_COLORS[0];
  for (const s of [-1, 1]) {
    const cx = s * ex;
    ctx.fillStyle = '#222'; ctx.strokeStyle = '#222'; ctx.lineWidth = r * 0.07;
    const wink = me.eyes === 5 && s > 0;
    if (me.eyes === 1 || wink) { ctx.beginPath(); ctx.arc(cx, ey + r * 0.05, r * 0.12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); continue; }
    if (me.eyes === 3) { ctx.beginPath(); ctx.moveTo(cx - r * 0.12, ey); ctx.lineTo(cx + r * 0.12, ey); ctx.stroke(); ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(cx, ey + r * 0.03, r * 0.07, 0, Math.PI); ctx.fill(); continue; }
    const big = me.eyes === 2 || me.eyes === 4 || me.eyes === 5;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx, ey, r * (big ? 0.15 : 0.11), r * (big ? 0.17 : 0.15), 0, 0, 7); ctx.fill();
    ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(cx, ey + r * 0.02, r * (big ? 0.11 : 0.08), 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, ey + r * 0.02, r * 0.05, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + r * 0.04, ey - r * 0.03, r * 0.035, 0, 7); ctx.fill();
    if (me.eyes === 4) { ctx.beginPath(); ctx.arc(cx - r * 0.04, ey + r * 0.06, r * 0.02, 0, 7); ctx.fill(); }
  }
  // glasses
  if (me.glasses) {
    ctx.strokeStyle = me.glasses === 4 ? '#ff4fa8' : '#2a2a2a'; ctx.lineWidth = r * 0.06;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (me.glasses === 1) ctx.arc(s * ex, ey, r * 0.22, 0, 7);
      else if (me.glasses === 4) { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.12 : r * 0.26; ctx.lineTo(s * ex + Math.cos(a) * rr, ey + Math.sin(a) * rr); } ctx.closePath(); }
      else roundRect(ctx, s * ex - r * 0.23, ey - r * 0.17, r * 0.46, r * 0.32, r * 0.06);
      if (me.glasses === 3) { ctx.fillStyle = 'rgba(15,15,25,.88)'; ctx.fill(); }
      ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-ex + r * 0.22, ey); ctx.quadraticCurveTo(0, ey - r * 0.08, ex - r * 0.22, ey); ctx.stroke();
  }
  // nose
  ctx.fillStyle = shade(skin, 0.8);
  ctx.beginPath();
  if (me.nose === 0) ctx.ellipse(0, r * 0.3, r * 0.08, r * 0.06, 0, 0, 7);
  else if (me.nose === 1) ctx.arc(0, r * 0.28, r * 0.13, 0, 7);
  else if (me.nose === 2) { ctx.moveTo(0, r * 0.08); ctx.lineTo(r * 0.12, r * 0.36); ctx.lineTo(-r * 0.04, r * 0.36); }
  else ctx.ellipse(0, r * 0.28, r * 0.17, r * 0.13, 0, 0, 7);
  ctx.fill();
  // facial hair
  ctx.fillStyle = hair;
  if (me.facial === 1) { ctx.beginPath(); ctx.ellipse(-r * 0.17, r * 0.45, r * 0.2, r * 0.08, 0.2, 0, 7); ctx.ellipse(r * 0.17, r * 0.45, r * 0.2, r * 0.08, -0.2, 0, 7); ctx.fill(); }
  if (me.facial === 2) { ctx.beginPath(); ctx.moveTo(-r * fw * 0.95, r * 0.05); ctx.quadraticCurveTo(-r * 0.7, r * 1.2, 0, r * 1.2); ctx.quadraticCurveTo(r * 0.7, r * 1.2, r * fw * 0.95, r * 0.05); ctx.quadraticCurveTo(r * 0.5, r * 0.55, 0, r * 0.42); ctx.quadraticCurveTo(-r * 0.5, r * 0.55, -r * fw * 0.95, r * 0.05); ctx.fill(); }
  if (me.facial === 3) { ctx.beginPath(); ctx.ellipse(0, r * 0.85, r * 0.16, r * 0.17, 0, 0, 7); ctx.fill(); }
  // mouth
  const lip = LIPS[me.lips] || LIPS[0];
  const my = r * 0.58;
  ctx.strokeStyle = lip; ctx.fillStyle = lip; ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  switch (me.mouth) {
    case 0: ctx.arc(0, r * 0.45, r * 0.22, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); break;
    case 1: ctx.moveTo(-r * 0.18, my); ctx.lineTo(r * 0.18, my); ctx.stroke(); break;
    case 2: ctx.ellipse(0, my, r * 0.12, r * 0.1, 0, 0, 7); ctx.fill(); break;
    case 3: ctx.moveTo(-r * 0.24, r * 0.52); ctx.quadraticCurveTo(0, r * 0.82, r * 0.24, r * 0.52); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-r * 0.18, r * 0.53, r * 0.36, r * 0.07); break;
    case 4: ctx.arc(0, r * 0.45, r * 0.2, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); ctx.fillStyle = '#ff6f8a'; ctx.beginPath(); ctx.ellipse(r * 0.04, r * 0.68, r * 0.08, r * 0.1, 0, 0, 7); ctx.fill(); break;
    case 5: ctx.moveTo(-r * 0.16, my + r * 0.02); ctx.quadraticCurveTo(r * 0.1, my + r * 0.05, r * 0.2, my - r * 0.08); ctx.stroke(); break;
    default: break;
  }
  if (me.facial === 1) { ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(-r * 0.17, r * 0.45, r * 0.2, r * 0.08, 0.2, 0, 7); ctx.ellipse(r * 0.17, r * 0.45, r * 0.2, r * 0.08, -0.2, 0, 7); ctx.fill(); }
  // hats
  drawHat2D(ctx, me.hat, hatCol, r, fw);
  ctx.restore();
}

function drawHat2D(ctx, hat, col, r, fw) {
  if (!hat) return;
  ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  if (hat === 1) { ctx.ellipse(0, -r * 0.55, r * 0.95, r * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(r * 0.45, -r * 0.55, r * 0.7, r * 0.13, 0.05, 0, 7); ctx.fill(); ctx.stroke(); }
  else if (hat === 2) { ctx.ellipse(0, -r * 0.5, r * 0.97, r * 0.72, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillStyle = shade(col, 0.8); ctx.fillRect(-r * 0.97, -r * 0.62, r * 1.94, r * 0.22); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -r * 1.25, r * 0.17, 0, 7); ctx.fill(); }
  else if (hat === 3) { ctx.fillStyle = '#ffd23a'; ctx.moveTo(-r * 0.6, -r * 0.6); for (let i = 0; i <= 4; i++) { ctx.lineTo(-r * 0.6 + i * r * 0.3, -r * (i % 2 ? 1.0 : 1.25)); } ctx.lineTo(r * 0.6, -r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e33'; ctx.beginPath(); ctx.arc(0, -r * 0.8, r * 0.07, 0, 7); ctx.fill(); }
  else if (hat === 4) { ctx.fillStyle = '#1d1d24'; ctx.fillRect(-r * 0.55, -r * 1.55, r * 1.1, r * 0.95); ctx.beginPath(); ctx.ellipse(0, -r * 0.6, r * 0.95, r * 0.13, 0, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.fillRect(-r * 0.55, -r * 0.82, r * 1.1, r * 0.14); }
  else if (hat === 5) { ctx.moveTo(-r * 0.4, -r * 0.65); ctx.lineTo(0, -r * 1.6); ctx.lineTo(r * 0.4, -r * 0.65); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -r * 1.6, r * 0.1, 0, 7); ctx.arc(-r * 0.15, -r * 0.95, r * 0.06, 0, 7); ctx.arc(r * 0.12, -r * 1.2, r * 0.06, 0, 7); ctx.fill(); }
  else if (hat === 6) { ctx.fillRect(-r * fw, -r * 0.62, r * fw * 2, r * 0.18); ctx.fillStyle = '#fff'; ctx.fillRect(-r * fw, -r * 0.56, r * fw * 2, r * 0.04); }
}
function roundRect(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// ---------- 3D figure ----------
// THREE passed in to avoid a hard import here.
export function buildMe3D(THREE, meIn, opts = {}) {
  const me = normalize(meIn);
  const g = new THREE.Group();
  const mat = (c, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.02 }, extra));
  const skin = mat(SKINS[me.skin] || SKINS[2], { roughness: 0.55 }), hair = mat(HAIRS[me.hair] || HAIRS[0], { roughness: 0.75 });
  const shirt = mat(SHIRTS[me.shirt] || SHIRTS[0]), pants = mat(PANTS[me.pants] || PANTS[0], { roughness: 0.8 });
  const hatM = mat(SHIRTS[me.hatColor] || SHIRTS[1]);
  const H = 0.88 + me.height * 0.06, Bw = 0.8 + me.build * 0.1;

  const body = new THREE.Group(); body.scale.set(Bw, H, Bw); g.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.36, 6, 14), shirt);
  torso.position.y = 0.98; torso.scale.z = 0.8; body.add(torso);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0.1 * s, 0.68, 0); body.add(leg);
    const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.5, 4, 10), pants); l.position.y = -0.32; leg.add(l);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat('#2b2b33')); shoe.scale.set(1, 0.6, 1.5); shoe.position.set(0, -0.64, 0.05); leg.add(shoe);
    legs.push(leg);
  }
  const head = new THREE.Group();
  head.position.y = 1.5 * H;
  const fw = [0.92, 0.85, 0.98, 0.9][me.face], fh = [1.05, 1.15, 1.02, 1.08][me.face];
  const skull = new THREE.Mesh(me.face === 2 ? new THREE.BoxGeometry(0.46, 0.5, 0.46, 3, 3, 3) : new THREE.SphereGeometry(0.25, 24, 18), skin);
  if (me.face === 2) { const p = skull.geometry.attributes.position; const v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize().multiplyScalar(0.27); v.lerp(n, 0.45); p.setXYZ(i, v.x, v.y, v.z); } skull.geometry.computeVertexNormals(); }
  else skull.scale.set(fw, fh, 0.95);
  head.add(skull);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin); ear.position.set(0.235 * fw * s, 0, 0); ear.scale.z = 0.6; head.add(ear); }
  // hair
  const hs = me.hairStyle;
  if (hs !== 5) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.268, 24, 14, 0, Math.PI * 2, 0, hs === 1 || hs === 8 ? 1.95 : 1.35), hair);
    cap.scale.set(fw, fh, 1); cap.position.y = 0.02; cap.rotation.x = -0.28;
    if (hs !== 6) head.add(cap);
  }
  if (hs === 2) for (let i = -2; i <= 2; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), hair); sp.position.set(i * 0.09, 0.27 - Math.abs(i) * 0.02, -0.02); sp.rotation.z = -i * 0.25; head.add(sp); }
  if (hs === 3) { const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), hair); bun.position.set(0, 0.28, -0.06); head.add(bun); }
  if (hs === 4) { const afro = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 2), hair); afro.position.set(0, 0.13, -0.1); afro.scale.set(1.05, 0.9, 0.75); head.add(afro); }
  if (hs === 6) { const mh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.42), hair); mh.position.set(0, 0.27, -0.02); head.add(mh); }
  if (hs === 7) { const pt = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 4, 8), hair); pt.position.set(0, -0.02, -0.28); pt.rotation.x = 0.4; head.add(pt); }
  // face
  const ec = EYE_COLORS[me.eyeColor] || EYE_COLORS[0];
  const white = mat('#ffffff', { roughness: 0.3 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(0.085 * s, 0.025, 0.215); head.add(eye);
    if (me.eyes === 1 || (me.eyes === 5 && s > 0)) { const arc = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 4, 10, Math.PI), mat('#222')); eye.add(arc); }
    else {
      const big = me.eyes === 2 || me.eyes === 4 || me.eyes === 5;
      const w = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.045 : 0.036, 12, 10), white); w.scale.set(1, 1.2, 0.5); eye.add(w);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.031 : 0.024, 10, 8), mat(ec, { roughness: 0.2 })); iris.position.z = 0.016; iris.scale.z = 0.5; eye.add(iris);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat('#0b0b0b')); pupil.position.z = 0.025; eye.add(pupil);
      if (me.eyes === 3) { const lid = new THREE.Mesh(new THREE.SphereGeometry(0.047, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.position.z = 0.003; eye.add(lid); }
    }
    if (me.brows !== 4) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.075, me.brows === 1 ? 0.024 : 0.013, 0.015), hair);
      brow.position.set(0.085 * s, me.brows === 3 ? 0.11 : 0.085, 0.228); brow.rotation.z = me.brows === 2 ? 0.35 * s : -0.08 * s; head.add(brow);
    }
  }
  const noseSize = [0.026, 0.04, 0.03, 0.055][me.nose];
  const nose = new THREE.Mesh(me.nose === 2 ? new THREE.ConeGeometry(0.03, 0.08, 8) : new THREE.SphereGeometry(noseSize, 10, 8), skin);
  nose.position.set(0, -0.035, 0.245); if (me.nose === 2) nose.rotation.x = Math.PI / 2; head.add(nose);
  const lipM = mat(LIPS[me.lips] || LIPS[0]);
  let mouth;
  if (me.mouth === 2) { mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat('#5a1f1a')); mouth.scale.z = 0.4; }
  else if (me.mouth === 1) mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.01), lipM);
  else if (me.mouth === 3) { mouth = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), white); mouth.rotation.x = -0.2; mouth.scale.z = 0.4; }
  else { mouth = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 4, 12, Math.PI), lipM); mouth.rotation.z = Math.PI; }
  mouth.position.set(0, -0.1, 0.226); head.add(mouth);
  if (me.mouth === 4) { const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat('#ff6f8a')); tongue.position.set(0.01, -0.13, 0.23); head.add(tongue); }
  if (me.blush) for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), new THREE.MeshBasicMaterial({ color: 0xff7a8a, transparent: true, opacity: 0.45 })); b.position.set(0.13 * s, -0.05, 0.215); b.rotation.y = 0.5 * s; head.add(b); }
  // facial hair
  if (me.facial === 1) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.08, 4, 8), hair); m.rotation.z = Math.PI / 2; m.position.set(0, -0.075, 0.24); head.add(m); }
  if (me.facial === 2) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), hair); b.scale.set(fw * 1.02, fh * 1.05, 1.02); head.add(b); }
  if (me.facial === 3) { const gt = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), hair); gt.position.set(0, -0.2, 0.2); head.add(gt); }
  // glasses
  if (me.glasses) {
    const frame = mat(me.glasses === 4 ? '#ff4fa8' : '#222', { metalness: 0.4, roughness: 0.3 });
    for (const s of [-1, 1]) {
      const ring = me.glasses === 2 || me.glasses === 3 ? new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.01), me.glasses === 3 ? mat('#111', { roughness: 0.1, metalness: 0.5 }) : frame) : new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.008, 6, 16), frame);
      ring.position.set(0.085 * s, 0.025, 0.25); head.add(ring);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), frame); bridge.position.set(0, 0.035, 0.25); head.add(bridge);
  }
  // hats (lifted when sitting on an afro)
  const hatLift = hs === 4 ? 0.14 : 0;
  const hatStart = head.children.length;
  if (me.hat === 1) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.275, 20, 10, 0, Math.PI * 2, 0, 1.4), hatM); c.rotation.x = -0.2; c.position.y = 0.03; head.add(c); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.015, 16, 1, false, -Math.PI / 2, Math.PI), hatM); brim.position.set(0, 0.07, 0.24); head.add(brim); }
  if (me.hat === 2) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 12, 0, Math.PI * 2, 0, 1.5), hatM); c.position.y = 0.03; c.rotation.x = -0.15; head.add(c); const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat('#fff')); p.position.y = 0.31; head.add(p); }
  if (me.hat === 3) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.14, 10, 1, true), mat('#ffd23a', { metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide })); c.position.y = 0.27; head.add(c); }
  if (me.hat === 4) { const top = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 20), mat('#1d1d24')); top.position.y = 0.36; head.add(top); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 24), mat('#1d1d24')); brim.position.y = 0.21; head.add(brim); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.163, 0.163, 0.05, 20), hatM); band.position.y = 0.25; head.add(band); }
  if (me.hat === 5) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.35, 16), hatM); c.position.y = 0.38; head.add(c); }
  if (me.hat === 6) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.025, 6, 24), hatM); b.rotation.x = Math.PI / 2 - 0.2; b.position.y = 0.1; head.add(b); }
  for (let i = hatStart; i < head.children.length; i++) head.children[i].position.y += hatLift;
  if (cheat('bigHead')) { head.scale.setScalar(2); head.position.y += 0.25; }
  g.add(head);

  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set((0.28 * Bw + 0.04) * s, 1.18 * H, 0);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.38, 4, 10), shirt);
    a.position.y = -0.22; arm.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), skin);
    hand.position.y = -0.5; arm.add(hand);
    arm.rotation.z = 0.15 * s;
    g.add(arm); arms.push(arm);
  }
  if (opts.ring) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: opts.ring }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  }
  g.userData = { head, arms, legs, body: torso };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function playerColor(i) { return COLORS[i]; }
