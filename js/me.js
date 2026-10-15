// "Woo Me" avatars — a little character per player slot, used across games.
import { COLORS } from './input.js';
import { cheat } from './cheats.js';

export const SKINS = ['#ffe0c4', '#f6c9a0', '#e0a878', '#b77b52', '#7d4f32'];
export const HAIRS = ['#2b1d14', '#5a3a1e', '#a8652a', '#e8c25a', '#d84a2a', '#7a7f88', '#3f58c9', '#e86fb0'];
export const SHIRTS = ['#2fa8ff', '#ff4a5a', '#36c96b', '#f5b622', '#9b59ff', '#ff8a2a', '#222831', '#f0f0f0'];
const NAMES = ['Bob', 'Ana', 'Kenji', 'Lola', 'Max', 'Zoe', 'Ivo', 'Mia', 'Rex', 'Tia', 'Gus', 'Ida', 'Otto', 'Yuki', 'Pim', 'Nia', 'Hugo', 'Ella'];

export function randomName() { return NAMES[Math.floor(Math.random() * NAMES.length)]; }

function defaults(i) {
  return {
    name: ['Player 1', 'Player 2', 'Player 3', 'Player 4'][i],
    skin: [1, 0, 2, 3][i], hair: [0, 2, 1, 3][i], hairStyle: [0, 1, 2, 3][i],
    eyes: i % 3, mouth: (i + 1) % 3, shirt: i, glasses: false,
  };
}

let profiles;
try { profiles = JSON.parse(localStorage.getItem('woo-me')) || null; } catch (e) { profiles = null; }
if (!Array.isArray(profiles) || profiles.length !== 4) profiles = [0, 1, 2, 3].map(defaults);
export function getMe(i) { return profiles[i]; }
export function setMe(i, me) { profiles[i] = me; try { localStorage.setItem('woo-me', JSON.stringify(profiles)); } catch (e) {} }
export function resetMe() { profiles = [0, 1, 2, 3].map(defaults); try { localStorage.removeItem('woo-me'); } catch (e) {} }

export function randomMe(name) {
  const r = (n) => Math.floor(Math.random() * n);
  return { name: name || randomName(), skin: r(SKINS.length), hair: r(HAIRS.length), hairStyle: r(4), eyes: r(3), mouth: r(3), shirt: r(SHIRTS.length), glasses: Math.random() < 0.25 };
}

// Draw a Me head (and shoulders) centered at x,y with head radius r.
export function drawMe(ctx, me, x, y, r, opts = {}) {
  const skin = SKINS[me.skin], hair = HAIRS[me.hair], shirt = SHIRTS[me.shirt];
  ctx.save();
  ctx.translate(x, y);
  if (opts.body !== false) {
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.ellipse(0, r * 1.75, r * 1.05, r * 0.8, 0, Math.PI, 0);
    ctx.fill();
  }
  // back hair
  ctx.fillStyle = hair;
  if (me.hairStyle === 1) { ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 1.08, r * 1.15, 0, 0, Math.PI * 2); ctx.fill(); }
  // head
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.88, r, 0, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.beginPath(); ctx.arc(-r * 0.88, r * 0.1, r * 0.17, 0, Math.PI * 2); ctx.arc(r * 0.88, r * 0.1, r * 0.17, 0, Math.PI * 2); ctx.fill();
  // hair on top
  ctx.fillStyle = hair;
  ctx.beginPath();
  if (me.hairStyle === 0) { ctx.ellipse(0, -r * 0.45, r * 0.92, r * 0.6, 0, Math.PI * 0.95, Math.PI * 2.05); }
  else if (me.hairStyle === 1) { ctx.ellipse(0, -r * 0.5, r * 0.95, r * 0.6, 0, Math.PI, Math.PI * 2); ctx.rect(-r * 0.95, -r * 0.5, r * 0.25, r * 1.1); ctx.rect(r * 0.7, -r * 0.5, r * 0.25, r * 1.1); }
  else if (me.hairStyle === 2) { for (let i = -2; i <= 2; i++) { ctx.moveTo(i * r * 0.3 - r * 0.2, -r * 0.55); ctx.lineTo(i * r * 0.3, -r * 1.25); ctx.lineTo(i * r * 0.3 + r * 0.2, -r * 0.55); } ctx.ellipse(0, -r * 0.55, r * 0.85, r * 0.35, 0, Math.PI, Math.PI * 2); }
  else { ctx.ellipse(0, -r * 0.62, r * 0.7, r * 0.4, 0, Math.PI, Math.PI * 2); ctx.arc(0, -r * 1.05, r * 0.3, 0, Math.PI * 2); }
  ctx.fill();
  // eyes
  ctx.fillStyle = '#222';
  const ey = r * 0.05, ex = r * 0.32;
  if (me.eyes === 0) { ctx.beginPath(); ctx.ellipse(-ex, ey, r * 0.09, r * 0.15, 0, 0, 7); ctx.ellipse(ex, ey, r * 0.09, r * 0.15, 0, 0, 7); ctx.fill(); }
  else if (me.eyes === 1) { ctx.lineWidth = r * 0.08; ctx.strokeStyle = '#222'; ctx.beginPath(); ctx.arc(-ex, ey + r * 0.05, r * 0.12, Math.PI * 1.1, Math.PI * 1.9); ctx.moveTo(ex + r * 0.12, ey); ctx.arc(ex, ey + r * 0.05, r * 0.12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(-ex, ey, r * 0.13, 0, 7); ctx.arc(ex, ey, r * 0.13, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-ex + r * 0.04, ey - r * 0.04, r * 0.04, 0, 7); ctx.arc(ex + r * 0.04, ey - r * 0.04, r * 0.04, 0, 7); ctx.fill(); }
  if (me.glasses) { ctx.strokeStyle = '#333'; ctx.lineWidth = r * 0.06; ctx.beginPath(); ctx.arc(-ex, ey, r * 0.22, 0, 7); ctx.moveTo(ex + r * 0.22, ey); ctx.arc(ex, ey, r * 0.22, 0, 7); ctx.moveTo(-ex + r * 0.22, ey); ctx.lineTo(ex - r * 0.22, ey); ctx.stroke(); }
  // nose
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.1, r * 0.07, 0, 0, 7); ctx.fill();
  // mouth
  ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
  ctx.beginPath();
  if (me.mouth === 0) ctx.arc(0, r * 0.45, r * 0.22, Math.PI * 0.15, Math.PI * 0.85);
  else if (me.mouth === 1) { ctx.moveTo(-r * 0.18, r * 0.58); ctx.lineTo(r * 0.18, r * 0.58); }
  else { ctx.fillStyle = '#8a3a2a'; ctx.ellipse(0, r * 0.58, r * 0.14, r * 0.1, 0, 0, 7); ctx.fill(); }
  ctx.stroke();
  // blush
  if (opts.color) { ctx.strokeStyle = opts.color; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, 7); ctx.stroke(); }
  ctx.restore();
}

// Build a simple 3D Me figure (THREE passed in to avoid a hard import here).
export function buildMe3D(THREE, me, opts = {}) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const skin = mat(SKINS[me.skin]), hair = mat(HAIRS[me.hair]), shirt = mat(SHIRTS[me.shirt]);
  const pants = mat('#3a3f4a');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.6, 14), shirt);
  body.position.y = 0.95; g.add(body);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.65, 8), pants);
    leg.position.set(0.1 * s, 0.33, 0); g.add(leg); legs.push(leg);
  }
  const head = new THREE.Group();
  head.position.y = 1.5;
  if (cheat('bigHead')) { head.scale.setScalar(2); head.position.y = 1.75; }
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), skin);
  skull.scale.set(0.92, 1.05, 0.95); head.add(skull);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.265, 20, 12, 0, Math.PI * 2, 0, me.hairStyle === 1 ? 1.9 : 1.3), hair);
  hairM.position.y = 0.02; hairM.rotation.x = -0.25; head.add(hairM);
  if (me.hairStyle === 3) { const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), hair); bun.position.set(0, 0.27, -0.06); head.add(bun); }
  if (me.hairStyle === 2) { for (let i = -1; i <= 1; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), hair); sp.position.set(i * 0.1, 0.27, 0); head.add(sp); } }
  const eyeM = mat('#222');
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeM);
    e.scale.y = 1.5; e.position.set(0.085 * s, 0.02, 0.22); head.add(e);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 10, Math.PI), mat('#8a3a2a'));
  mouth.rotation.z = Math.PI; mouth.position.set(0, -0.09, 0.225); head.add(mouth);
  g.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(0.3 * s, 1.18, 0);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), shirt);
    a.position.y = -0.22; arm.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin);
    hand.position.y = -0.5; arm.add(hand);
    arm.rotation.z = 0.15 * s;
    g.add(arm); arms.push(arm);
  }
  if (opts.ring) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: opts.ring }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  }
  g.userData = { head, arms, legs, body };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function playerColor(i) { return COLORS[i]; }
