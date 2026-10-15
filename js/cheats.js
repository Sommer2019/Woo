// Homebrew state: whether the Letter Bomb was opened, and which cheats are on.
const KEY = 'woo-homebrew';

export const CHEATS = [
  { id: 'bigHead', name: 'Big Head Mode', desc: 'Every Me gets a gigantic head (Sports, Kart).' },
  { id: 'moon', name: 'Moon Gravity', desc: 'Super Woo Bros. jumps go to space. Almost.' },
  { id: 'infLives', name: 'Infinite Lives', desc: 'Super Woo Bros. never says GAME OVER.' },
  { id: 'turbo', name: 'Turbo Karts', desc: 'Human racers in Woo Kart get +35% top speed.' },
  { id: 'disco', name: 'Disco Mode', desc: 'The whole console cycles through the rainbow.', secret: true },
];

export const hb = Object.assign(
  { installed: false, konami: false, cheats: {} },
  (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })()
);
export function saveHb() { try { localStorage.setItem(KEY, JSON.stringify(hb)); } catch (e) {} }
export function cheat(id) { return !!(hb.installed && hb.cheats[id]); }
