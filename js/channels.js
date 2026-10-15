// Channel list for the Woo Menu, with procedurally drawn thumbnails/banners.
import { drawMe, getMe } from './me.js';

function title(ctx, text, w, h, big, color = '#fff', stroke = 'rgba(0,0,0,.35)') {
  const size = big ? h * 0.13 : Math.max(11, h * 0.15);
  ctx.font = `800 ${size}px "M PLUS Rounded 1c", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.18;
  ctx.strokeStyle = stroke;
  const y = big ? h * 0.2 : h * 0.82;
  ctx.strokeText(text, w / 2, y);
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, y);
}

function sky(ctx, w, h, a = '#7ec8ff', b = '#d7f0ff') {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
function cloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.arc(x, y, s, 0, 7); ctx.arc(x + s, y - s * 0.4, s * 1.2, 0, 7); ctx.arc(x + s * 2.1, y, s * 0.9, 0, 7);
  ctx.fill();
}

export function drawPlumber(ctx, x, y, s, color, t = 0, facing = 1, big = false) {
  // s = tile size; (x,y) = bottom-center
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  const hgt = big ? 2 : 1;
  const u = s / 16;
  const run = Math.sin(t * 18) * (t ? 1 : 0);
  // legs
  ctx.fillStyle = '#6b3b1a';
  ctx.fillRect(-6 * u + run * 2 * u, -3 * u, 5 * u, 3 * u);
  ctx.fillRect(1 * u - run * 2 * u, -3 * u, 5 * u, 3 * u);
  // overalls
  ctx.fillStyle = '#2d4fd6';
  ctx.fillRect(-6 * u, -9 * u * (big ? 1.6 : 1), 12 * u, 6 * u * (big ? 1.6 : 1) + 1);
  // shirt
  ctx.fillStyle = color;
  const bodyTop = -14 * u * (big ? 1.7 : 1);
  ctx.fillRect(-7 * u, bodyTop, 14 * u, (big ? 9 : 5) * u);
  // head
  const hy = bodyTop - 7 * u;
  ctx.fillStyle = '#ffd2a6';
  ctx.fillRect(-5 * u, hy, 10 * u, 8 * u);
  ctx.fillRect(4 * u, hy + 3 * u, 3 * u, 3 * u); // nose
  // mustache
  ctx.fillStyle = '#3b2210';
  ctx.fillRect(1 * u, hy + 5 * u, 6 * u, 2 * u);
  // eye
  ctx.fillStyle = '#111';
  ctx.fillRect(2 * u, hy + 2 * u, 1.5 * u, 2.4 * u);
  // cap
  ctx.fillStyle = color;
  ctx.fillRect(-6 * u, hy - 3 * u, 11 * u, 4 * u);
  ctx.fillRect(2 * u, hy, 6 * u, 1.6 * u);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-1 * u, hy - 1 * u, 1.6 * u, 0, 7); ctx.fill();
  ctx.restore();
  return hgt;
}

const draws = {
  disc(ctx, t, w, h, big) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    const r = Math.min(w, h) * (big ? 0.3 : 0.32);
    const cx = w / 2, cy = big ? h * 0.55 : h * 0.42;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 2);
    const g = ctx.createConicGradient ? ctx.createConicGradient(0, 0, 0) : null;
    if (g) { ['#dfe6ee', '#ffffff', '#c7e9ff', '#ffe9f6', '#e6ffe6', '#dfe6ee'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c)); ctx.fillStyle = g; }
    else ctx.fillStyle = '#e5ebf2';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b9c2cc'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#8a929b';
    ctx.font = `700 ${big ? h * 0.06 : h * 0.11}px "M PLUS Rounded 1c", Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(big ? 'Spin the disc — we pick a random game for you!' : 'Disc Channel', w / 2, big ? h * 0.13 : h * 0.88);
  },
  me(ctx, t, w, h, big) {
    sky(ctx, w, h, '#e9f7ff', '#ffffff');
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x = w * (0.2 + i * 0.2), y = h * (big ? 0.55 : 0.45) + Math.sin(t * 2 + i) * h * 0.03;
      drawMe(ctx, getMe(i), x, y, h * (big ? 0.13 : 0.14));
    }
    title(ctx, 'Woo Me Channel', w, h, big, '#3aa0ff', '#fff');
  },
  kart(ctx, t, w, h, big) {
    sky(ctx, w, h * 0.5, '#5cb8ff', '#c9ecff');
    ctx.fillStyle = '#5cc04f'; ctx.fillRect(0, h * 0.5, w, h * 0.5);
    // road in perspective
    const hz = h * 0.5;
    ctx.fillStyle = '#62666d';
    ctx.beginPath(); ctx.moveTo(w * 0.47, hz); ctx.lineTo(w * 0.53, hz); ctx.lineTo(w * 0.95, h); ctx.lineTo(w * 0.05, h); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const z = ((i / 8 + t * 0.8) % 1);
      const y0 = hz + (h - hz) * z * z, y1 = hz + (h - hz) * Math.min(1, (z + 0.06)) ** 2;
      ctx.fillStyle = i % 2 ? '#fff' : '#e33';
      const xl0 = w * 0.47 - (w * 0.42) * z * z, xl1 = w * 0.47 - (w * 0.42) * Math.min(1, z + 0.06) ** 2;
      ctx.beginPath(); ctx.moveTo(xl0, y0); ctx.lineTo(xl0 - 4 - z * 10, y0); ctx.lineTo(xl1 - 4 - z * 10, y1); ctx.lineTo(xl1, y1); ctx.fill();
      const xr0 = w - xl0, xr1 = w - xl1;
      ctx.beginPath(); ctx.moveTo(xr0, y0); ctx.lineTo(xr0 + 4 + z * 10, y0); ctx.lineTo(xr1 + 4 + z * 10, y1); ctx.lineTo(xr1, y1); ctx.fill();
    }
    // kart
    const kx = w * 0.5 + Math.sin(t * 1.5) * w * 0.12, ky = h * 0.8;
    const s = h * 0.12;
    ctx.fillStyle = '#222'; ctx.fillRect(kx - s * 1.3, ky - s * 0.1, s * 0.6, s * 0.6); ctx.fillRect(kx + s * 0.7, ky - s * 0.1, s * 0.6, s * 0.6);
    ctx.fillStyle = '#ff4a5a'; ctx.fillRect(kx - s, ky - s * 0.5, s * 2, s * 0.8);
    ctx.fillStyle = '#ffd2a6'; ctx.beginPath(); ctx.arc(kx, ky - s * 0.8, s * 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff4a5a'; ctx.beginPath(); ctx.arc(kx, ky - s * 0.9, s * 0.42, Math.PI, 0); ctx.fill();
    title(ctx, 'Woo Kart', w, h, big);
  },
  bros(ctx, t, w, h, big) {
    sky(ctx, w, h, '#6fb7ff', '#a9dbff');
    cloud(ctx, (w * 0.2 + t * 20) % (w + 60) - 40, h * 0.2, h * 0.06);
    cloud(ctx, (w * 0.7 + t * 12) % (w + 60) - 40, h * 0.3, h * 0.05);
    const s = h / 7;
    ctx.fillStyle = '#5ad15a'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.78, h * 0.25, Math.PI, 0); ctx.fill();
    for (let x = 0; x < w; x += s) {
      ctx.fillStyle = '#c66a2a'; ctx.fillRect(x, h - s * 1.3, s, s * 1.3);
      ctx.fillStyle = '#3cb043'; ctx.fillRect(x, h - s * 1.3, s, s * 0.3);
    }
    // ? block
    const by = h * 0.36 + Math.max(0, Math.sin(t * 3) * 6);
    ctx.fillStyle = '#f8b820'; ctx.fillRect(w * 0.55, by, s, s);
    ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 2; ctx.strokeRect(w * 0.55, by, s, s);
    ctx.fillStyle = '#fff'; ctx.font = `800 ${s * 0.8}px Arial`; ctx.textAlign = 'center'; ctx.fillText('?', w * 0.55 + s / 2, by + s * 0.8);
    const px = w * 0.3 + Math.sin(t) * w * 0.08;
    const jump = Math.max(0, Math.sin(t * 3)) * s * 1.2;
    drawPlumber(ctx, px, h - s * 1.3 - jump, s * 1.1, '#ff4a5a', t, Math.cos(t) > 0 ? 1 : -1);
    drawPlumber(ctx, px - s * 1.5, h - s * 1.3, s * 1.1, '#36c96b', t, Math.cos(t) > 0 ? 1 : -1);
    title(ctx, big ? 'Super Woo Bros.' : 'Super Woo Bros.', w, h, big);
  },
  sports(ctx, t, w, h, big) {
    sky(ctx, w, h, '#8fd3ff', '#e8f7ff');
    ctx.fillStyle = '#62c35a'; ctx.fillRect(0, h * 0.62, w, h * 0.38);
    // tennis ball
    const bx = w * 0.25, by = h * 0.4 + Math.abs(Math.sin(t * 3)) * -h * 0.15 + h * 0.1;
    ctx.fillStyle = '#d8f03a'; ctx.beginPath(); ctx.arc(bx, by, h * 0.08, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx - h * 0.06, by, h * 0.06, -1, 1); ctx.stroke();
    // bowling pin
    const px = w * 0.55, py = h * 0.62;
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.sin(t * 2) * 0.15);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#bbb';
    ctx.beginPath(); ctx.ellipse(0, -h * 0.12, h * 0.07, h * 0.12, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -h * 0.32, h * 0.04, h * 0.07, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e33'; ctx.fillRect(-h * 0.045, -h * 0.25, h * 0.09, h * 0.02);
    ctx.restore();
    // boxing glove
    const gx = w * 0.8 + Math.sin(t * 5) * w * 0.03;
    ctx.fillStyle = '#e52b3a'; ctx.beginPath(); ctx.arc(gx, h * 0.45, h * 0.1, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(gx - h * 0.07, h * 0.52, h * 0.14, h * 0.06);
    title(ctx, 'Woo Sports', w, h, big);
  },
  duck(ctx, t, w, h, big) {
    sky(ctx, w, h, '#5fb4ff', '#d3eeff');
    ctx.fillStyle = '#3c9c3c'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(i * w / 5, h * 0.74, h * 0.1, Math.PI, 0); ctx.fill(); }
    const dx = (t * w * 0.25) % (w + 80) - 40, dy = h * 0.35 + Math.sin(t * 4) * h * 0.06;
    drawDuck(ctx, dx, dy, h * 0.09, t);
    const cx = w * 0.6 + Math.cos(t * 1.3) * w * 0.1, cy = h * 0.4 + Math.sin(t * 1.7) * h * 0.1;
    ctx.strokeStyle = '#ff4a5a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, h * 0.08, 0, 7); ctx.moveTo(cx - h * 0.12, cy); ctx.lineTo(cx + h * 0.12, cy); ctx.moveTo(cx, cy - h * 0.12); ctx.lineTo(cx, cy + h * 0.12); ctx.stroke();
    title(ctx, 'Woo Play: Duck Blaster', w, h, big);
  },
  fish(ctx, t, w, h, big) {
    ctx.fillStyle = '#68b84a'; ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#3db7e6'); g.addColorStop(1, '#1d6fb0');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.45, h * 0.4, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = t * (0.4 + i * 0.1) + i * 2;
      const fx = w / 2 + Math.cos(a) * w * 0.25, fy = h / 2 + Math.sin(a * 1.3) * h * 0.2;
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = 'rgba(0,30,60,.45)'; ctx.beginPath(); ctx.ellipse(0, 0, h * 0.07, h * 0.03, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-h * 0.06, 0); ctx.lineTo(-h * 0.1, -h * 0.03); ctx.lineTo(-h * 0.1, h * 0.03); ctx.fill();
      ctx.restore();
    }
    const bx = w * 0.62, by = h * 0.45 + Math.sin(t * 3) * 3;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, h * 0.03, 0, 7); ctx.fill();
    ctx.fillStyle = '#e33'; ctx.beginPath(); ctx.arc(bx, by, h * 0.03, Math.PI, 0); ctx.fill();
    title(ctx, 'Woo Fishing', w, h, big);
  },
  tanks(ctx, t, w, h, big) {
    ctx.fillStyle = '#d9c08a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b89a5c';
    for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.15 + i * w * 0.15, h * 0.3, w * 0.08, h * 0.08);
    const drawT = (x, y, c, a) => {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#333'; ctx.fillRect(-h * 0.09, -h * 0.07, h * 0.18, h * 0.14);
      ctx.fillStyle = c; ctx.fillRect(-h * 0.07, -h * 0.06, h * 0.14, h * 0.12);
      ctx.rotate(a); ctx.fillRect(0, -h * 0.015, h * 0.12, h * 0.03);
      ctx.beginPath(); ctx.arc(0, 0, h * 0.04, 0, 7); ctx.fill();
      ctx.restore();
    };
    drawT(w * 0.25, h * 0.6, '#2fa8ff', Math.sin(t) * 0.5);
    drawT(w * 0.75, h * 0.55, '#ff4a5a', Math.PI + Math.sin(t * 1.3) * 0.5);
    const bx = w * 0.25 + ((t * 0.4) % 1) * w * 0.5;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, h * 0.58, h * 0.015, 0, 7); ctx.fill();
    title(ctx, 'Woo Tanks!', w, h, big);
  },
};

export function drawDuck(ctx, x, y, s, t, dir = 1, color = '#4a8f3a') {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.2, s * 0.7, 0, 0, 7); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(s * 1.1, -s * 0.5, s * 0.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#f5a623'; ctx.beginPath(); ctx.moveTo(s * 1.5, -s * 0.55); ctx.lineTo(s * 2.1, -s * 0.4); ctx.lineTo(s * 1.5, -s * 0.25); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 1.2, -s * 0.65, s * 0.13, 0, 7); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(s * 1.24, -s * 0.65, s * 0.07, 0, 7); ctx.fill();
  const flap = Math.sin(t * 16) * s * 0.8;
  ctx.fillStyle = '#6b4320'; ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.2); ctx.lineTo(s * 0.4, -s * 0.2); ctx.lineTo(-s * 0.1, -s * 0.3 - flap); ctx.fill();
  ctx.restore();
}

const lazy = (p) => () => import(p);

export const CHANNELS = [
  { id: 'disc', title: 'Disc Channel', music: 'menu', draw: draws.disc, load: lazy('./games/disc.js') },
  { id: 'me', title: 'Woo Me Channel', music: 'fish', draw: draws.me, load: lazy('./games/mechannel.js') },
  { id: 'kart', title: 'Woo Kart', music: 'kart', draw: draws.kart, load: lazy('./games/kart.js') },
  { id: 'bros', title: 'Super Woo Bros.', music: 'bros', draw: draws.bros, load: lazy('./games/bros.js') },
  { id: 'sports', title: 'Woo Sports', music: 'sports', draw: draws.sports, load: lazy('./games/sports.js') },
  { id: 'duck', title: 'Woo Play: Duck Blaster', music: 'shoot', draw: draws.duck, load: lazy('./games/duck.js') },
  { id: 'fish', title: 'Woo Fishing', music: 'fish', draw: draws.fish, load: lazy('./games/fishing.js') },
  { id: 'tanks', title: 'Woo Tanks!', music: 'shoot', draw: draws.tanks, load: lazy('./games/tanks.js') },
];
