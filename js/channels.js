// Channel list for the Woo Menu, with procedurally drawn thumbnails/banners.
import { drawMe, getMe } from './me.js';
import { hb } from './cheats.js';
import { shop } from './shopdata.js';

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
  // s = tile size; (x,y) = bottom-center. Cartoon plumber with outlines + shading.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  const u = s / 16;
  const run = t ? Math.sin(t * 18) : 0;
  const legTop = big ? -13 * u : -9 * u, torsoTop = big ? -20 * u : -14 * u, hcY = torsoTop - 4.6 * u;
  const ol = 'rgba(25,15,10,.75)';
  ctx.lineWidth = Math.max(1, 0.7 * u); ctx.lineJoin = 'round'; ctx.strokeStyle = ol;
  const blob = (fill, fn) => { ctx.fillStyle = fill; ctx.beginPath(); fn(); ctx.fill(); ctx.stroke(); };
  const rr = (x0, y0, w, h, r) => { ctx.moveTo(x0 + r, y0); ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r); ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r); ctx.arcTo(x0, y0 + h, x0, y0, r); ctx.arcTo(x0, y0, x0 + w, y0, r); ctx.closePath(); };
  // back arm
  blob(shadeCss(color, 0.75), () => ctx.ellipse(-4.5 * u - run * 1.5 * u, torsoTop + 3.5 * u, 1.8 * u, 3 * u, 0.3 + run * 0.4, 0, 7));
  // shoes
  blob('#5a2e12', () => { ctx.ellipse(-2.6 * u + run * 2.2 * u, -1.5 * u, 3.2 * u, 1.7 * u, 0, 0, 7); });
  blob('#6b3b1a', () => { ctx.ellipse(2.8 * u - run * 2.2 * u, -1.5 * u, 3.2 * u, 1.7 * u, 0, 0, 7); });
  // overalls (legs)
  const og = ctx.createLinearGradient(-5 * u, 0, 5 * u, 0); og.addColorStop(0, '#3a5ce8'); og.addColorStop(1, '#1f3aa8');
  blob(og, () => rr(-5 * u, legTop, 10 * u, -legTop - 2.4 * u, 2 * u));
  ctx.strokeStyle = 'rgba(10,20,60,.6)'; ctx.beginPath(); ctx.moveTo(0, legTop + 3 * u); ctx.lineTo(0, -2.6 * u); ctx.stroke(); ctx.strokeStyle = ol;
  // shirt + bib
  const sg = ctx.createLinearGradient(0, torsoTop, 0, legTop + 2 * u); sg.addColorStop(0, shadeCss(color, 1.12)); sg.addColorStop(1, shadeCss(color, 0.82));
  blob(sg, () => rr(-6 * u, torsoTop, 12 * u, legTop - torsoTop + 2.5 * u, 3 * u));
  blob(og, () => rr(-3.6 * u, torsoTop + 2 * u, 7.2 * u, legTop - torsoTop + 1 * u, 1.2 * u));
  ctx.fillStyle = '#ffd23a'; for (const sx of [-2.3, 2.3]) { ctx.beginPath(); ctx.arc(sx * u, torsoTop + 3.4 * u, 0.9 * u, 0, 7); ctx.fill(); }
  // front arm + glove
  blob(shadeCss(color, 1.0), () => ctx.ellipse(4.6 * u + run * 1.5 * u, torsoTop + 3.5 * u, 1.9 * u, 3.1 * u, -0.3 - run * 0.4, 0, 7));
  blob('#ffffff', () => ctx.arc(5.6 * u + run * 2 * u, torsoTop + 6.6 * u, 1.8 * u, 0, 7));
  // head
  const hg = ctx.createRadialGradient(1.5 * u, hcY - 1.5 * u, 0.5 * u, 0.5 * u, hcY, 5.5 * u); hg.addColorStop(0, '#ffe2c4'); hg.addColorStop(1, '#f2b98a');
  blob(hg, () => ctx.arc(0.5 * u, hcY, 5 * u, 0, 7));
  blob('#f2b98a', () => ctx.ellipse(-3.6 * u, hcY + 0.4 * u, 1.3 * u, 1.7 * u, 0, 0, 7));
  // hair tuft + sideburn
  ctx.fillStyle = '#3b2210'; ctx.beginPath(); ctx.ellipse(-3.4 * u, hcY - 1.6 * u, 1.6 * u, 1.4 * u, 0, 0, 7); ctx.fill();
  // eye
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(2.6 * u, hcY - 1.3 * u, 1.15 * u, 1.7 * u, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1d3aa8'; ctx.beginPath(); ctx.ellipse(3.0 * u, hcY - 1.1 * u, 0.6 * u, 1.05 * u, 0, 0, 7); ctx.fill();
  // nose + mustache
  blob('#ffb98a', () => ctx.ellipse(5.1 * u, hcY + 1.0 * u, 2.1 * u, 1.7 * u, 0, 0, 7));
  blob('#3b2210', () => { ctx.ellipse(3.0 * u, hcY + 2.9 * u, 3.0 * u, 1.1 * u, -0.1, 0, 7); });
  // cap
  const cg = ctx.createLinearGradient(0, hcY - 6 * u, 0, hcY - 1 * u); cg.addColorStop(0, shadeCss(color, 1.2)); cg.addColorStop(1, shadeCss(color, 0.85));
  blob(cg, () => { ctx.ellipse(0, hcY - 2 * u, 5.6 * u, 4 * u, 0, Math.PI, 0); ctx.closePath(); });
  blob(shadeCss(color, 0.8), () => ctx.ellipse(4.4 * u, hcY - 2 * u, 3.6 * u, 1 * u, 0.05, 0, 7));
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0.3 * u, hcY - 3.8 * u, 1.55 * u, 0, 7); ctx.fill();
  ctx.fillStyle = color; ctx.font = `900 ${2.2 * u}px Arial`; ctx.textAlign = 'center'; ctx.fillText('W', 0.3 * u, hcY - 3.0 * u);
  ctx.restore();
  return big ? 2 : 1;
}
function shadeCss(c, f) {
  let r, g, b;
  if (c[0] === '#') { const n = parseInt(c.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
  else { const m = /hsl\((\d+\.?\d*),(\d+)%,(\d+)%\)/.exec(c); if (!m) return c; return `hsl(${m[1]},${m[2]}%,${Math.min(95, +m[3] * f)}%)`; }
  const k = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${k(r)},${k(g)},${k(b)})`;
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

export function drawHomebrew(ctx, t, w, h, big, noText) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0b2a5c'); g.addColorStop(1, '#3a8de0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 18; i++) {
    const x = (i * 97.3) % w, r = (3 + (i % 5) * 2) * (big ? 2.5 : 1);
    const y = h - ((t * (20 + (i % 4) * 12) + i * 53) % (h + 40)) + 20;
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = big ? 3 : 1.5;
    ctx.beginPath(); ctx.arc(x + Math.sin(t + i) * 6, y, r, 0, 7); ctx.stroke();
  }
  if (noText) return;
  const size = big ? h * 0.12 : Math.max(11, h * 0.13);
  ctx.font = `800 ${size}px "M PLUS Rounded 1c", Arial`; ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('Homebrew', w / 2, big ? h * 0.45 : h * 0.45);
  ctx.font = `700 ${size * 0.55}px "M PLUS Rounded 1c", Arial`;
  ctx.fillText(big ? 'Unofficial. Unsupported. Unbelievably secret.' : 'Channel', w / 2, big ? h * 0.58 : h * 0.62);
}

export function visibleChannels() { return CHANNELS.filter((c) => (c.secret ? hb.installed : c.shop ? shop.installed.includes(c.id) : true)); }


function grad(ctx, w, h, a, b) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
const draws2 = {
  shop(ctx, t, w, h, big) {
    grad(ctx, w, h, '#dff3ff', '#9fd8ff');
    for (let i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc((i * 97 + t * 20) % (w + 40) - 20, h * 0.15 + (i * 37) % (h * 0.5), 4 + (i % 3) * 3, 0, 7); ctx.fill(); }
    const s = h * (big ? 0.35 : 0.42), x = w / 2, y = h * (big ? 0.55 : 0.42) + Math.sin(t * 2) * 3;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#35b6ff'; ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath(); ctx.roundRect(x - s * 0.5, y - s * 0.3, s, s * 0.8, s * 0.1); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - s * 0.3, s * 0.22, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#35b6ff'; ctx.font = `900 ${s * 0.3}px Arial`; ctx.textAlign = 'center'; ctx.fillText('woo', x, y + s * 0.25);
    title(ctx, 'Woo Shop Channel', w, h, big, '#1594dd', '#fff');
  },
  browser(ctx, t, w, h, big) {
    grad(ctx, w, h, '#ffffff', '#e4ecf4');
    const r = h * (big ? 0.25 : 0.3), x = w / 2, y = h * (big ? 0.55 : 0.42);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#7fd0ff'); g.addColorStop(1, '#1a6ad0');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
    ctx.fillStyle = '#4fc36b'; for (let i = 0; i < 4; i++) { const cx = x + ((i * r * 0.9 + t * r * 0.4) % (r * 3.6)) - r * 1.8; ctx.beginPath(); ctx.ellipse(cx, y + (i % 2 ? -r * 0.3 : r * 0.25), r * 0.35, r * 0.22, i, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(k) * r * 0.4 + 1, r, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - r, y + k * r * 0.35); ctx.lineTo(x + r, y + k * r * 0.35); ctx.stroke(); }
    ctx.restore();
    title(ctx, 'Woo Browser', w, h, big, '#1a6ad0', '#fff');
  },
  weather(ctx, t, w, h, big) {
    grad(ctx, w, h, '#5fb0ff', '#cfeaff');
    const x = w * 0.42, y = h * (big ? 0.5 : 0.4), r = h * (big ? 0.15 : 0.17);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.4); ctx.fillStyle = '#ffd23a';
    for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillRect(r * 1.1, -r * 0.08, r * 0.45, r * 0.16); }
    ctx.restore(); ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    const cx = w * 0.58 + Math.sin(t) * w * 0.03, cy = y + r * 0.5;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, 7); ctx.arc(cx + r * 0.8, cy - r * 0.3, r * 0.85, 0, 7); ctx.arc(cx + r * 1.6, cy, r * 0.65, 0, 7); ctx.fill();
    title(ctx, 'Woo Weather', w, h, big);
  },
  pong(ctx, t, w, h, big) {
    ctx.fillStyle = '#10142a'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke(); ctx.setLineDash([]);
    const bx = w / 2 + Math.sin(t * 2) * w * 0.38, by = h * 0.45 + Math.sin(t * 3.1) * h * 0.25;
    ctx.fillStyle = '#2fa8ff'; ctx.fillRect(w * 0.06, by - h * 0.12, w * 0.025, h * 0.24);
    ctx.fillStyle = '#ff4a5a'; ctx.fillRect(w * 0.915, h * 0.45 - Math.sin(t * 2.4) * h * 0.2 - h * 0.12, w * 0.025, h * 0.24);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, h * 0.035, 0, 7); ctx.fill();
    title(ctx, 'Woo Pong', w, h, big);
  },
  darts(ctx, t, w, h, big) {
    grad(ctx, w, h, '#2b1d14', '#5a3a1e');
    const x = w / 2, y = h * (big ? 0.55 : 0.42), r = h * (big ? 0.3 : 0.32);
    for (let i = 0; i < 20; i++) { ctx.fillStyle = i % 2 ? '#111' : '#f2e6c4'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, i * Math.PI / 10, (i + 1) * Math.PI / 10); ctx.fill(); }
    ctx.strokeStyle = '#d33'; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.arc(x, y, r * 0.95, 0, 7); ctx.stroke(); ctx.strokeStyle = '#2a2'; ctx.beginPath(); ctx.arc(x, y, r * 0.58, 0, 7); ctx.stroke();
    ctx.fillStyle = '#d33'; ctx.beginPath(); ctx.arc(x, y, r * 0.1, 0, 7); ctx.fill();
    const dx = x + Math.cos(t) * r * 0.4, dy = y + Math.sin(t * 1.3) * r * 0.3;
    ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + r * 0.35, dy - r * 0.35); ctx.stroke();
    title(ctx, 'Woo Darts', w, h, big);
  },
  breakout(ctx, t, w, h, big) {
    grad(ctx, w, h, '#1a1040', '#3a1a70');
    const cols = ['#ff4a5a', '#ff8a2a', '#f5b622', '#36c96b', '#2fa8ff'];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) { if ((r * 8 + c + Math.floor(t)) % 7 === 0) continue; ctx.fillStyle = cols[r]; ctx.fillRect(w * 0.06 + c * w * 0.11, h * 0.08 + r * h * 0.07, w * 0.1, h * 0.055); }
    ctx.fillStyle = '#fff'; ctx.fillRect(w / 2 + Math.sin(t) * w * 0.3 - w * 0.08, h * 0.62, w * 0.16, h * 0.03);
    ctx.beginPath(); ctx.arc(w / 2 + Math.sin(t * 1.7) * w * 0.3, h * 0.5 + Math.cos(t * 2) * h * 0.08, h * 0.025, 0, 7); ctx.fill();
    title(ctx, 'Woo Breakout', w, h, big);
  },
  golf(ctx, t, w, h, big) {
    grad(ctx, w, h, '#7fd36b', '#3fa84f');
    ctx.fillStyle = '#5fc35a'; ctx.beginPath(); ctx.roundRect(w * 0.1, h * 0.15, w * 0.8, h * 0.5, h * 0.1); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(w * 0.75, h * 0.35, h * 0.04, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w * 0.75, h * 0.35); ctx.lineTo(w * 0.75, h * 0.12); ctx.stroke();
    ctx.fillStyle = '#ff4a5a'; ctx.beginPath(); ctx.moveTo(w * 0.75, h * 0.12); ctx.lineTo(w * 0.83, h * 0.16); ctx.lineTo(w * 0.75, h * 0.2); ctx.fill();
    const k = (t * 0.5) % 1;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w * (0.25 + k * 0.5), h * (0.5 - k * 0.15), h * 0.03, 0, 7); ctx.fill();
    title(ctx, 'Woo Mini Golf', w, h, big);
  },
};

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
  { id: 'shop', title: 'Woo Shop Channel', music: 'shop', draw: draws2.shop, load: lazy('./games/shop.js') },
  { id: 'browser', title: 'Woo Browser', music: null, draw: draws2.browser, load: lazy('./games/browser.js') },
  { id: 'weather', title: 'Woo Weather', music: 'fish', draw: draws2.weather, load: lazy('./games/weather.js') },
  { id: 'homebrew', title: 'Homebrew Channel', music: 'shoot', draw: (...a) => drawHomebrew(...a), load: lazy('./games/homebrew.js'), secret: true },
  // games you download from the Woo Shop
  { id: 'pong', title: 'Woo Pong', music: 'shoot', draw: draws2.pong, load: lazy('./games/pong.js'), shop: { price: 300, desc: 'Paddles. A ball. Friendship-ending rallies for up to 4.' } },
  { id: 'darts', title: 'Woo Darts', music: 'sports', draw: draws2.darts, load: lazy('./games/darts.js'), shop: { price: 500, desc: 'Point, wobble, flick. Please do not throw the phone.' } },
  { id: 'breakout', title: 'Woo Breakout', music: 'bros', draw: draws2.breakout, load: lazy('./games/breakout.js'), shop: { price: 400, desc: 'Smash bricks together with up to 4 paddles at once.' } },
  { id: 'golf', title: 'Woo Mini Golf', music: 'fish', draw: draws2.golf, load: lazy('./games/golf.js'), shop: { price: 700, desc: '6 holes of windmill-free mini golf. Swing to putt.' } },
];
