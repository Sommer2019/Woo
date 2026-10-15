// Woo Shop: points balance + which shop games are installed (stored in localStorage).
const KEY = 'woo-shop';
export const shop = Object.assign(
  { points: 1000, installed: [] },
  (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })()
);
export function saveShop() { try { localStorage.setItem(KEY, JSON.stringify(shop)); } catch (e) {} }
export function isInstalled(id) { return shop.installed.includes(id); }
