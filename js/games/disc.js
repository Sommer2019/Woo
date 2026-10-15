// Disc Channel: "reads" an imaginary disc and boots a random game.
import { overlay } from './common.js';
import { shop } from '../shopdata.js';

export function create(api) {
  const games = api.channels.filter((c) => !['disc', 'me', 'homebrew', 'shop', 'browser', 'weather'].includes(c.id) && (!c.shop || shop.installed.includes(c.id)));
  const pick = games[Math.floor(Math.random() * games.length)];
  const el = overlay(api, `
    <h1>Reading disc…</h1>
    <div style="font-size:16vh;animation:spin 0.6s linear infinite">💿</div>
    <p id="disc-msg">Spinning up a totally legit disc. Please do not insert actual discs into your TV.</p>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`);
  let t = 0, launched = false;
  return {
    update(dt) {
      t += dt;
      if (t > 1.6 && !launched) { el.querySelector('#disc-msg').textContent = `Found: ${pick.title}!`; }
      if (t > 2.6 && !launched) { launched = true; api.launch(pick.id); }
    },
    destroy() { el.remove(); },
  };
}
