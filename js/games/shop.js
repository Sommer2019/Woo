// Woo Shop Channel — spend (fake) Woo Points on (real) extra games that install as new channels.
import { overlay } from './common.js';
import { shop, saveShop } from '../shopdata.js';

const ADS = [
  ['🥤 WOO COLA', 'Now with 30% more bubbles and 0% actual cola.'],
  ['🧦 Smart Socks', 'They connect to Bluetooth. Nobody knows why.'],
  ['🍕 Pizza Remote', 'A remote shaped like pizza. Do not eat.'],
  ['🦆 Duck Insurance', 'Because Duck Blaster is a dangerous game.'],
];

export function create(api) {
  const games = api.channels.filter((c) => c.shop);
  let el = null, anim = null;
  const stamp = (ch, w = 280, h = 158) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    ch.draw(c.getContext('2d'), 1.3, w, h, false);
    return c.toDataURL();
  };
  const thumbs = Object.fromEntries(games.map((g) => [g.id, stamp(g)]));
  const header = () => `<div class="shop-head"><span class="shop-logo">🛍️ Woo Shop Channel</span><span class="shop-pts">⭐ ${shop.points} Woo Points</span></div>`;
  const show = (html, handlers) => { if (el) el.remove(); el = overlay(api, header() + html, handlers, 'shop-bg'); };

  function welcome() {
    show(`<h1>Welcome to the Woo Shop Channel!</h1>
      <div class="shop-spin">🛒</div>
      <p>Connecting to the Woo Shop… (it's on your own device. Shhh.)</p>`, {});
    anim = setTimeout(home, 1500);
  }
  function home() {
    show(`<h1>What would you like to do?</h1>
      <div class="g-row">
        <div class="g-card" data-ui="catalog"><div class="ico">🎮</div>Woo Games</div>
        <div class="g-card" data-ui="points"><div class="ico">⭐</div>Add Woo Points</div>
        <div class="g-card" data-ui="manage"><div class="ico">🗂️</div>My Downloads</div>
      </div>
      <div class="pill small" data-ui="quit">Woo Menu</div>`, {
      catalog, points: watchAd, manage, quit: () => api.exit(),
    });
  }
  function catalog() {
    show(`<h1>Woo Games</h1>
      <div class="shop-list">${games.map((g) => {
        const own = shop.installed.includes(g.id);
        return `<div class="shop-item">
          <img src="${thumbs[g.id]}">
          <div class="shop-info"><b>${g.title}</b><small>${g.shop.desc}</small></div>
          <div class="shop-price">${own ? '✔ Installed' : `⭐ ${g.shop.price}`}</div>
          ${own ? '<div class="pill small disabled">Owned</div>' : `<div class="pill small" data-ui="buy" data-id="${g.id}">Download</div>`}
        </div>`;
      }).join('')}</div>
      <div class="g-row"><div class="pill small" data-ui="back">Back</div></div>`, {
      buy: (x) => buy(games.find((g) => g.id === x.dataset.id)),
      back: home,
    });
  }
  function buy(g) {
    if (shop.points < g.shop.price) {
      show(`<h1>Not enough Woo Points 😢</h1><p>${g.title} costs ⭐ ${g.shop.price}. You have ⭐ ${shop.points}.</p>
        <div class="g-row"><div class="pill" data-ui="points">Watch an ad for points</div><div class="pill" data-ui="back">Back</div></div>`, { points: watchAd, back: catalog });
      return;
    }
    show(`<h1>Download ${g.title}?</h1><img src="${thumbs[g.id]}" style="width:30vh;border-radius:16px;border:3px solid #cde">
      <p>${g.shop.desc}</p><p>This will use ⭐ ${g.shop.price} Woo Points.</p>
      <div class="g-row"><div class="pill" data-ui="no">No</div><div class="pill" data-ui="yes">Yes</div></div>`, {
      no: catalog,
      yes: () => download(g),
    });
  }
  function download(g) {
    shop.points -= g.shop.price; saveShop();
    show(`<h1>Downloading…</h1>
      <div class="shop-bar"><i id="shop-fill"></i></div>
      <p id="shop-msg">Please do not turn off the power or remove your phone from your hand.</p>
      <div class="shop-walker">🚶‍♂️📦</div>`, {});
    let pct = 0;
    const msgs = ['Downloading pixels…', 'Untangling cables…', 'Asking the server nicely…', 'Polishing the ball…', 'Almost there…'];
    anim = setInterval(() => {
      pct += 2 + Math.random() * 5;
      const f = el.querySelector('#shop-fill'); if (f) f.style.width = Math.min(100, pct) + '%';
      const m = el.querySelector('#shop-msg'); if (m && Math.random() < 0.15) m.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      if (pct >= 100) {
        clearInterval(anim);
        shop.installed.push(g.id); saveShop();
        api.homebrewChanged();
        api.audio.play('powerup');
        show(`<h1>Download complete! 🎉</h1><p><b>${g.title}</b> is now on your Woo Menu (page 2 — use the › arrow).</p>
          <div class="g-row"><div class="pill" data-ui="more">Keep shopping</div><div class="pill" data-ui="play">Play now</div></div>`, {
          more: catalog, play: () => api.launch(g.id),
        });
      }
    }, 120);
  }
  function watchAd() {
    const [name, line] = ADS[Math.floor(Math.random() * ADS.length)];
    let n = 5;
    show(`<h1>A word from our sponsor</h1>
      <div class="shop-ad"><div class="shop-ad-title">${name}</div><div>${line}</div></div>
      <p id="ad-count">Points in ${n}…</p>`, {});
    api.audio.play('bell');
    anim = setInterval(() => {
      n--;
      const c = el.querySelector('#ad-count'); if (c) c.textContent = n > 0 ? `Points in ${n}…` : '';
      if (n <= 0) {
        clearInterval(anim);
        shop.points += 500; saveShop();
        api.audio.play('coin');
        show(`<h1>+500 Woo Points! ⭐</h1><p>Thank you for watching. Your brain has been mildly advertised to.</p>
          <div class="g-row"><div class="pill" data-ui="more">Watch another</div><div class="pill" data-ui="cat">Go shopping</div></div>`, { more: watchAd, cat: catalog });
      }
    }, 1000);
  }
  function manage() {
    const mine = games.filter((g) => shop.installed.includes(g.id));
    show(`<h1>My Downloads</h1>
      ${mine.length ? `<div class="shop-list">${mine.map((g) => `<div class="shop-item"><img src="${thumbs[g.id]}"><div class="shop-info"><b>${g.title}</b><small>Refund on delete: ⭐ ${Math.floor(g.shop.price / 2)}</small></div><div class="pill small" data-ui="del" data-id="${g.id}">Delete</div></div>`).join('')}</div>` : '<p>Nothing here yet. Go buy something, it\'s fake money!</p>'}
      <div class="g-row"><div class="pill small" data-ui="back">Back</div></div>`, {
      del: (x) => {
        const g = games.find((q) => q.id === x.dataset.id);
        shop.installed = shop.installed.filter((id) => id !== g.id);
        shop.points += Math.floor(g.shop.price / 2); saveShop();
        api.homebrewChanged(); manage();
      },
      back: home,
    });
  }

  api.music('shop');
  welcome();
  return { update() {}, destroy() { clearTimeout(anim); clearInterval(anim); if (el) el.remove(); } };
}
