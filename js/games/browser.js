// Woo Browser — a tiny "internet channel": Wikipedia search/articles, a fake news site, and real
// web pages in a frame (many sites refuse to be framed; that's the internet, not us).
import { overlay } from './common.js';
import { openKeyboard } from './keyboard.js';

const LANG = (navigator.language || 'en').slice(0, 2) === 'de' ? 'de' : 'en';
const WIKI = `https://${LANG}.wikipedia.org/w/api.php`;
const NEWS = [
  ['Local man points phone at TV, TV does nothing', 'Experts say he forgot to scan the QR code.'],
  ['Ducks file complaint against Duck Blaster', 'A spokesduck called the game "rectangular and hurtful".'],
  ['Plumber still searching for princess', '"She was in another castle again," he sighed, stepping on a Grumpy.'],
  ['Study: 9 out of 10 bowling pins prefer the 100-pin mode', 'The tenth pin was unavailable for comment, having fallen over.'],
  ['CPU Carl wins 400th tennis match in a row', 'Opponents accuse him of "being a computer".'],
  ['Woo Shop announces Woo Points can now be exchanged for nothing', 'Fans call it "exactly what we expected".'],
];

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

export function create(api) {
  const history = [];
  let current = null, zoom = 1, el = null;

  el = overlay(api, `
    <div class="br-top">
      <div class="pill small" data-ui="back">◀</div>
      <div class="pill small" data-ui="home">🏠</div>
      <div class="br-addr" data-ui="addr"><span id="br-url">woo://home</span></div>
      <div class="pill small" data-ui="search">🔍</div>
      <div class="pill small" data-ui="zin">A+</div>
      <div class="pill small" data-ui="zout">A−</div>
      <div class="pill small" data-ui="quit">✕</div>
    </div>
    <div class="br-page" id="br-page"></div>
    <div class="br-side"><div class="pill small" data-ui="up">▲</div><div class="pill small" data-ui="down">▼</div></div>`, {
    back: () => { history.pop(); const prev = history.pop(); go(prev || { kind: 'home' }); },
    home: () => go({ kind: 'home' }),
    addr: () => ask('Search Wikipedia or type a web address'),
    search: () => ask('Search Wikipedia'),
    zin: () => { zoom = Math.min(1.8, zoom + 0.15); applyZoom(); },
    zout: () => { zoom = Math.max(0.7, zoom - 0.15); applyZoom(); },
    up: () => page().scrollBy({ top: -page().clientHeight * 0.7, behavior: 'smooth' }),
    down: () => page().scrollBy({ top: page().clientHeight * 0.7, behavior: 'smooth' }),
    quit: () => api.exit(),
    wiki: (x) => go({ kind: 'article', title: x.dataset.t }),
    ext: (x) => go({ kind: 'url', url: x.dataset.u }),
    random: () => go({ kind: 'random' }),
    news: () => go({ kind: 'news' }),
    weather: () => api.launch('weather'),
    qsearch: (x) => go({ kind: 'search', q: x.dataset.q }),
  }, 'br-root');
  const page = () => el.querySelector('#br-page');
  const applyZoom = () => { page().style.fontSize = (2.3 * zoom) + 'vh'; };
  applyZoom();

  function ask(title) {
    openKeyboard(api, {
      title, value: '', max: 40, playerIndex: api.clicker().index,
      onDone: (q) => {
        if (!q) return;
        if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(q) && !/\s/.test(q)) go({ kind: 'url', url: /^https?:/i.test(q) ? q : 'https://' + q });
        else go({ kind: 'search', q });
      },
    });
  }
  function setUrl(u) { el.querySelector('#br-url').textContent = u; }
  function render(html) { page().innerHTML = html; page().scrollTop = 0; }

  async function go(loc) {
    current = loc; history.push(loc);
    if (loc.kind === 'home') return home();
    if (loc.kind === 'news') return news();
    if (loc.kind === 'url') return frame(loc.url);
    render('<div class="br-loading">🌐 Loading… <span class="dim">(the internet is a series of tubes)</span></div>');
    try {
      if (loc.kind === 'search') await search(loc.q);
      else if (loc.kind === 'random') {
        const j = await (await fetch(`${WIKI}?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`)).json();
        const t = j.query.random[0].title; current = { kind: 'article', title: t }; history[history.length - 1] = current; await article(t);
      } else if (loc.kind === 'article') await article(loc.title);
    } catch (e) {
      render(`<div class="br-card"><h2>😵 Couldn't load that</h2><p>${esc(e.message)}</p><p>Maybe the internet is busy. Try again in a moment.</p></div>`);
    }
  }

  function home() {
    setUrl('woo://home');
    render(`<div class="br-home">
      <h1>🌐 Woo Browser</h1>
      <p class="dim">The internet, now with 100% more pointing.</p>
      <div class="br-searchbox" data-ui="search">🔍 Search ${LANG === 'de' ? 'Wikipedia (Deutsch)' : 'Wikipedia'}…</div>
      <div class="br-tiles">
        <div class="br-tile" data-ui="random">🎲<b>Random article</b></div>
        <div class="br-tile" data-ui="news">📰<b>Woo News</b></div>
        <div class="br-tile" data-ui="weather">⛅<b>Woo Weather</b></div>
        <div class="br-tile" data-ui="qsearch" data-q="Video game console">🎮<b>Consoles</b></div>
        <div class="br-tile" data-ui="qsearch" data-q="Duck">🦆<b>Ducks</b></div>
        <div class="br-tile" data-ui="ext" data-u="https://en.m.wikipedia.org/wiki/Special:Random">🧭<b>Wikipedia (web)</b></div>
      </div>
      <p class="dim small">Tip: ▲▼ on the right (or the D-pad) scrolls. Click the address bar to type a URL.</p>
    </div>`);
  }
  function news() {
    setUrl('https://news.woo/');
    render(`<div class="br-news"><div class="br-news-head">WOO NEWS <span>Totally real headlines since today</span></div>
      ${NEWS.map(([h, s], i) => `<div class="br-card"><h2>${i === 0 ? '🔥 ' : ''}${esc(h)}</h2><p>${esc(s)}</p></div>`).join('')}</div>`);
  }
  async function search(q) {
    setUrl(`${LANG}.wikipedia.org/?search=${q}`);
    const j = await (await fetch(`${WIKI}?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=12&format=json&origin=*`)).json();
    const hits = (j.query && j.query.search) || [];
    render(`<div class="br-card"><h2>Results for “${esc(q)}”</h2></div>` + (hits.length ? hits.map((h) => `
      <div class="br-result" data-ui="wiki" data-t="${esc(h.title)}"><b>${esc(h.title)}</b><p>${h.snippet.replace(/<(?!\/?span)[^>]*>/g, '')}…</p></div>`).join('') : '<div class="br-card"><p>Nothing found. The internet is surprisingly empty today.</p></div>'));
  }
  async function article(title) {
    setUrl(`${LANG}.wikipedia.org/wiki/${title.replace(/ /g, '_')}`);
    const j = await (await fetch(`${WIKI}?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&formatversion=2&origin=*&disableeditsection=1&redirects=1`)).json();
    if (j.error) throw new Error(j.error.info);
    const doc = new DOMParser().parseFromString(j.parse.text, 'text/html');
    doc.querySelectorAll('script, style, link, iframe, object, embed, .mw-editsection, .navbox, .metadata, .reference, .mw-references-wrap, sup.reference').forEach((n) => n.remove());
    doc.querySelectorAll('*').forEach((n) => { for (const a of [...n.attributes]) if (/^on/i.test(a.name) || a.name === 'style') n.removeAttribute(a.name); });
    doc.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      a.removeAttribute('href');
      const m = /^(?:\.\/|\/wiki\/)([^#?]+)/.exec(href);
      if (m && !/^[A-Za-z]+:/.test(decodeURIComponent(m[1]))) { a.setAttribute('data-ui', 'wiki'); a.setAttribute('data-t', decodeURIComponent(m[1]).replace(/_/g, ' ')); a.className = 'br-link'; }
      else if (/^https?:/.test(href)) { a.setAttribute('data-ui', 'ext'); a.setAttribute('data-u', href); a.className = 'br-link ext'; }
    });
    doc.querySelectorAll('img').forEach((img) => { const s = img.getAttribute('src'); if (s && s.startsWith('//')) img.setAttribute('src', 'https:' + s); img.removeAttribute('srcset'); img.setAttribute('loading', 'lazy'); });
    render(`<div class="br-article"><h1>${esc(j.parse.title)}</h1>${doc.body.innerHTML}<p class="dim small">Source: Wikipedia (CC BY-SA)</p></div>`);
  }
  function frame(url) {
    setUrl(url);
    render(`<div class="br-frame-note">If this stays blank, the site refuses to be shown inside other pages. Trashy, we know — it's not us, it's them.</div>
      <iframe class="br-frame" src="${esc(url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerpolicy="no-referrer"></iframe>`);
  }

  api.music(null); api.audio.stopMusic();
  go({ kind: 'home' });
  return {
    update(dt) {
      // D-pad scrolling for every player
      for (const p of api.active()) { const dy = p.dirY(); if (dy) page().scrollTop += dy * 900 * dt; }
    },
    destroy() { el.remove(); },
  };
}
