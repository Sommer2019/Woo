// Woo Weather — live forecast from Open-Meteo (free, no key), with an animated sky.
import { makeCanvas, overlay, bigText } from './common.js';
import { openKeyboard } from './keyboard.js';

const W = 1280, H = 720;
const KEY = 'woo-weather';
const DEFAULT = { name: 'Berlin', country: 'DE', lat: 52.52, lon: 13.41 };

function describe(code) {
  if (code === 0) return ['Clear sky', 'sun'];
  if (code <= 2) return ['Partly cloudy', 'partly'];
  if (code === 3) return ['Overcast', 'cloud'];
  if (code === 45 || code === 48) return ['Foggy', 'fog'];
  if (code >= 51 && code <= 57) return ['Drizzle', 'rain'];
  if (code >= 61 && code <= 67) return ['Rain', 'rain'];
  if (code >= 71 && code <= 77) return ['Snow', 'snow'];
  if (code >= 80 && code <= 82) return ['Rain showers', 'rain'];
  if (code >= 85 && code <= 86) return ['Snow showers', 'snow'];
  if (code >= 95) return ['Thunderstorm', 'storm'];
  return ['Weird weather', 'cloud'];
}
const QUIPS = {
  sun: 'Perfect weather to stay inside and play Woo.', partly: 'Some clouds. They seem friendly.', cloud: 'Grey. Like a disconnected remote.',
  fog: 'Can\'t see the TV? Neither can we.', rain: 'Wet. Keep your remote dry.', snow: 'Snow! Bowling on ice, anyone?', storm: 'Thunder! Unplug nothing, it\'s a browser.',
};

export function create(api) {
  const view = makeCanvas(api, W, H);
  const { ctx } = view;
  let place = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } })();
  let data = null, error = '', loading = false, unit = 'C', clock = 0, bar = null, picker = null;
  let drops = Array.from({ length: 220 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() }));
  let flash = 0;

  async function load() {
    loading = true; error = '';
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`;
      const r = await fetch(u);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      data = await r.json();
    } catch (e) { error = 'Could not reach the weather satellite (' + e.message + ').'; }
    loading = false;
  }
  function setPlace(p) { place = p; try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} data = null; load(); }
  function locate() {
    if (!navigator.geolocation) { error = 'This browser can\'t tell where you are.'; return; }
    loading = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPlace({ name: 'My location', country: '', lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3) }),
      () => { loading = false; error = 'Location not allowed — pick a city instead.'; },
      { timeout: 10000 },
    );
  }
  function chooseCity() {
    if (bar) bar.remove(); bar = null;
    openKeyboard(api, {
      title: 'Which city?', value: '', max: 24, playerIndex: api.clicker().index,
      onDone: async (q) => {
        if (!q) { buildBar(); return; }
        try {
          const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${(navigator.language || 'en').slice(0, 2)}`);
          const j = await r.json();
          const res = j.results || [];
          if (!res.length) { error = `No city called "${q}". Is it on this planet?`; buildBar(); return; }
          picker = overlay(api, `<h1>Which ${q}?</h1><div class="g-row" style="flex-direction:column">${res.map((c, i) => `<div class="pill" data-ui="pick" data-i="${i}">${c.name}${c.admin1 ? ', ' + c.admin1 : ''} (${c.country_code || ''})</div>`).join('')}</div><div class="pill small" data-ui="cancel">Cancel</div>`, {
            pick: (x) => { const c = res[+x.dataset.i]; picker.remove(); picker = null; setPlace({ name: c.name, country: c.country_code || '', lat: c.latitude, lon: c.longitude }); buildBar(); },
            cancel: () => { picker.remove(); picker = null; buildBar(); },
          });
        } catch (e) { error = 'City search failed.'; buildBar(); }
      },
    });
  }
  function buildBar() {
    if (bar) bar.remove();
    bar = overlay(api, `<div class="wx-bar">
      <div class="pill small" data-ui="city">🔎 Change city</div>
      <div class="pill small" data-ui="here">📍 My location</div>
      <div class="pill small" data-ui="unit">°${unit === 'C' ? 'F' : 'C'}</div>
      <div class="pill small" data-ui="quit">Woo Menu</div></div>`, {
      city: chooseCity, here: locate,
      unit: () => { unit = unit === 'C' ? 'F' : 'C'; buildBar(); },
      quit: () => api.exit(),
    }, 'wx-overlay');
  }

  const T = (c) => (unit === 'C' ? Math.round(c) : Math.round(c * 9 / 5 + 32)) + '°';

  function drawIcon(kind, x, y, s, t) {
    ctx.save(); ctx.translate(x, y);
    const cloud = (cx, cy, k, col = '#fff') => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx - k * 0.5, cy, k * 0.45, 0, 7); ctx.arc(cx, cy - k * 0.25, k * 0.55, 0, 7); ctx.arc(cx + k * 0.55, cy, k * 0.4, 0, 7); ctx.rect(cx - k * 0.5, cy, k * 1.05, k * 0.42); ctx.fill(); };
    if (kind === 'sun' || kind === 'partly') {
      ctx.save(); ctx.translate(kind === 'partly' ? -s * 0.2 : 0, kind === 'partly' ? -s * 0.15 : 0); ctx.rotate(t * 0.3);
      ctx.fillStyle = '#ffd23a'; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(s * 0.45, -s * 0.05, s * 0.2, s * 0.1); }
      ctx.beginPath(); ctx.arc(0, 0, s * 0.36, 0, 7); ctx.fill(); ctx.restore();
    }
    if (kind !== 'sun') cloud(s * 0.05, s * 0.1, s * 0.8, kind === 'storm' || kind === 'rain' ? '#aab6c4' : s < 100 ? '#cfd8e2' : '#fff');
    if (kind === 'rain' || kind === 'storm') { ctx.strokeStyle = '#3aa0ff'; ctx.lineWidth = s * 0.06; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.3, s * 0.6); ctx.lineTo(i * s * 0.3 - s * 0.08, s * 0.85); ctx.stroke(); } }
    if (kind === 'snow') { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#9fc8ef'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * s * 0.3, s * 0.72, s * 0.07, 0, 7); ctx.fill(); ctx.stroke(); } }
    if (kind === 'storm') { ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(0, s * 0.45); ctx.lineTo(-s * 0.15, s * 0.8); ctx.lineTo(s * 0.02, s * 0.75); ctx.lineTo(-s * 0.08, s * 1.05); ctx.lineTo(s * 0.18, s * 0.65); ctx.lineTo(0, s * 0.7); ctx.fill(); }
    if (kind === 'fog') { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = s * 0.07; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.5, s * (0.55 + i * 0.15)); ctx.lineTo(s * 0.5, s * (0.55 + i * 0.15)); ctx.stroke(); } }
    ctx.restore();
  }

  function update(dt, t) {
    clock = t;
    view.begin('#000');
    const cur = data && data.current;
    const kind = cur ? describe(cur.weather_code)[1] : 'partly';
    const day = cur ? cur.is_day : 1;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    const top = !day ? '#0b1030' : kind === 'storm' ? '#2a3040' : kind === 'rain' || kind === 'cloud' || kind === 'fog' ? '#6f8193' : kind === 'snow' ? '#a9bfd4' : '#3f9be8';
    const bot = !day ? '#28345a' : kind === 'storm' ? '#55606e' : kind === 'rain' || kind === 'cloud' || kind === 'fog' ? '#b7c4cf' : kind === 'snow' ? '#e8f0f8' : '#bfe4ff';
    sky.addColorStop(0, top); sky.addColorStop(1, bot);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    if (!day) for (let i = 0; i < 80; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t + i))})`; ctx.fillRect((i * 157) % W, (i * 61) % 380, 2, 2); }
    // sun / moon
    if (kind === 'sun' || kind === 'partly') {
      const g = ctx.createRadialGradient(1050, 140, 10, 1050, 140, 200);
      g.addColorStop(0, day ? 'rgba(255,245,200,.95)' : 'rgba(230,235,255,.9)'); g.addColorStop(0.25, day ? 'rgba(255,230,150,.4)' : 'rgba(200,210,255,.2)'); g.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = g; ctx.fillRect(850, 0, 430, 360);
      ctx.fillStyle = day ? '#fff7d6' : '#eef1ff'; ctx.beginPath(); ctx.arc(1050, 140, 56, 0, 7); ctx.fill();
    }
    // drifting clouds
    const nClouds = kind === 'sun' ? 2 : kind === 'partly' ? 5 : 9;
    for (let i = 0; i < nClouds; i++) {
      const x = ((i * 260 + t * (10 + i * 3)) % (W + 400)) - 200, y = 60 + (i * 47) % 220, k = 70 + (i % 3) * 30;
      ctx.fillStyle = kind === 'storm' ? 'rgba(70,80,95,.85)' : kind === 'rain' ? 'rgba(160,175,190,.9)' : 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(x, y, k * 0.5, 0, 7); ctx.arc(x + k * 0.6, y - k * 0.25, k * 0.6, 0, 7); ctx.arc(x + k * 1.2, y, k * 0.45, 0, 7); ctx.fill();
    }
    // precipitation
    if (kind === 'rain' || kind === 'storm' || kind === 'snow') {
      for (const d of drops) {
        if (kind === 'snow') { d.y += 60 * d.s * dt; d.x += Math.sin(t + d.y * 0.02) * 20 * dt; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(d.x, d.y, 2 + d.s * 2, 0, 7); ctx.fill(); }
        else { d.y += 700 * d.s * dt; d.x -= 120 * dt; ctx.strokeStyle = 'rgba(210,230,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 5, d.y + 16); ctx.stroke(); }
        if (d.y > H) { d.y = -10; d.x = Math.random() * W; } if (d.x < 0) d.x = W;
      }
    }
    if (kind === 'storm') { if (Math.random() < dt * 0.25) { flash = 0.25; api.audio.play('break'); } if (flash > 0) { flash -= dt; ctx.fillStyle = `rgba(255,255,255,${flash * 2.5})`; ctx.fillRect(0, 0, W, H); } }
    if (kind === 'fog') { ctx.fillStyle = 'rgba(230,235,240,.35)'; ctx.fillRect(0, 0, W, H); }
    // ground / town silhouette
    ctx.fillStyle = day ? 'rgba(40,90,60,.85)' : 'rgba(10,20,30,.9)';
    ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 600 - Math.sin(x / 140) * 20); ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = day ? 'rgba(30,60,80,.75)' : 'rgba(5,10,20,.95)';
    for (let i = 0; i < 16; i++) { const bw = 40 + (i * 37) % 50, bh = 50 + (i * 53) % 110, bx = i * 82; ctx.fillRect(bx, 610 - bh, bw, bh); if (!day) { ctx.fillStyle = 'rgba(255,220,120,.7)'; for (let k = 0; k < 4; k++) ctx.fillRect(bx + 8 + (k % 2) * 16, 620 - bh + Math.floor(k / 2) * 22, 8, 10); ctx.fillStyle = 'rgba(5,10,20,.95)'; } }

    // panel
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.roundRect(40, 30, 600, 300, 30); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.font = '800 34px "M PLUS Rounded 1c", Arial';
    ctx.fillText(place ? `${place.name}${place.country ? ', ' + place.country : ''}` : '…', 70, 82);
    if (cur) {
      const [desc] = describe(cur.weather_code);
      ctx.font = '800 150px "M PLUS Rounded 1c", Arial'; ctx.fillText(T(cur.temperature_2m), 64, 230);
      drawIcon(kind, 520, 170, 150, t);
      ctx.font = '700 30px "M PLUS Rounded 1c", Arial'; ctx.fillText(desc, 70, 280);
      ctx.font = '600 22px "M PLUS Rounded 1c", Arial'; ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.fillText(`Feels like ${T(cur.apparent_temperature)} · 💧 ${cur.relative_humidity_2m}% · 💨 ${Math.round(cur.wind_speed_10m)} km/h`, 70, 314);
      // quip
      bigText(ctx, QUIPS[kind], W - 330, 380, 22, '#fff', 'rgba(0,0,0,.5)');
      // hourly graph
      const hours = data.hourly.temperature_2m;
      const now = new Date(data.current.time).getTime();
      const startI = Math.max(0, data.hourly.time.findIndex((ts) => new Date(ts).getTime() >= now));
      const slice = hours.slice(startI, startI + 24);
      const mn = Math.min(...slice), mx = Math.max(...slice);
      const gx = 700, gy = 60, gw = 520, gh = 110;
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.roundRect(gx - 20, gy - 30, gw + 40, gh + 70, 22); ctx.fill();
      ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 4; ctx.beginPath();
      slice.forEach((v, i) => { const x = gx + i / 23 * gw, y = gy + gh - (v - mn) / Math.max(1, mx - mn) * gh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 16px Arial';
      for (let i = 0; i < 24; i += 6) { const x = gx + i / 23 * gw, v = slice[i]; if (v == null) continue; ctx.textAlign = 'center'; ctx.fillText(T(v), x, gy + gh - (v - mn) / Math.max(1, mx - mn) * gh - 10); ctx.fillText(i ? `+${i}h` : 'now', x, gy + gh + 30); }
      // 7 days
      const d = data.daily;
      d.time.forEach((ts, i) => {
        const x = 50 + i * 172, y = 420;
        ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(x, y, 160, 170, 20); ctx.fill();
        ctx.fillStyle = '#4a5560'; ctx.textAlign = 'center'; ctx.font = '800 22px "M PLUS Rounded 1c", Arial';
        ctx.fillText(i === 0 ? 'Today' : new Date(ts).toLocaleDateString([], { weekday: 'short' }), x + 80, y + 32);
        drawIcon(describe(d.weather_code[i])[1], x + 80, y + 75, 60, t + i);
        ctx.font = '800 24px Arial'; ctx.fillStyle = '#e8503a'; ctx.fillText(T(d.temperature_2m_max[i]), x + 50, y + 145);
        ctx.fillStyle = '#3a8ad8'; ctx.fillText(T(d.temperature_2m_min[i]), x + 112, y + 145);
        ctx.fillStyle = '#7a8a9a'; ctx.font = '700 15px Arial'; ctx.fillText(`☔ ${d.precipitation_probability_max[i] ?? 0}%`, x + 80, y + 163);
      });
    } else {
      bigText(ctx, loading ? 'Asking the clouds…' : (error || '…'), W / 2, 420, 36, '#fff', 'rgba(0,0,0,.5)');
    }
    if (error && cur) bigText(ctx, error, W / 2, 360, 24, '#fff', 'rgba(150,0,0,.6)');
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '600 14px Arial'; ctx.textAlign = 'right';
    ctx.fillText('Weather data: Open-Meteo.com · Woo forecast confidence: 12%', W - 20, H - 74);
    view.end();
  }

  api.showCursors(true); api.setRemoteMode('pointer'); api.music('fish');
  if (!place) { place = DEFAULT; }
  load();
  buildBar();
  return { update, resize: view.resize, destroy() { if (bar) bar.remove(); if (picker) picker.remove(); } };
}
