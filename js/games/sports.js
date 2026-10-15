// Woo Sports hub: pick Bowling, Tennis or Boxing.
import * as THREE from '../lib/three.module.min.js';
import { overlay } from './common.js';

const SPORTS = [
  { id: 'bowling', name: 'Bowling', ico: '🎳', load: () => import('./sports-bowling.js') },
  { id: 'tennis', name: 'Tennis', ico: '🎾', load: () => import('./sports-tennis.js') },
  { id: 'boxing', name: 'Boxing', ico: '🥊', load: () => import('./sports-boxing.js') },
];

export function create(api) {
  const root = api.root;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.className = 'g-full';
  root.appendChild(renderer.domElement);
  const hud = document.createElement('canvas');
  hud.className = 'g-full';
  root.appendChild(hud);
  const resize = () => {
    renderer.setSize(root.clientWidth, root.clientHeight, false);
    hud.width = root.clientWidth; hud.height = root.clientHeight;
  };
  resize();
  const env = { api, THREE, renderer, hud, hctx: hud.getContext('2d'), root, back: () => hubMenu() };

  let current = null, ui = null;
  function hubMenu() {
    if (current && current.destroy) current.destroy();
    current = null;
    api.music('sports');
    renderer.setClearColor(0x9fd6ff); renderer.clear();
    env.hctx.clearRect(0, 0, hud.width, hud.height);
    if (ui) ui.remove();
    ui = overlay(api, `
      <h1>Woo Sports</h1>
      <p>Swing your phone like you mean it. (Wrist strap not included. Hold on tight.)</p>
      <div class="g-row">${SPORTS.map((s) => `<div class="g-card" data-ui="pick" data-id="${s.id}"><div class="ico">${s.ico}</div>${s.name}</div>`).join('')}</div>
      <div class="pill small" data-ui="quit">Woo Menu</div>`, {
      pick: async (el) => {
        const s = SPORTS.find((x) => x.id === el.dataset.id);
        ui.remove(); ui = null;
        const mod = await s.load();
        current = mod.create(env);
      },
      quit: () => api.exit(),
    });
    ui.style.background = 'linear-gradient(#bfe6ff, #e9fff0)';
  }
  hubMenu();

  return {
    update(dt, t) { if (current) current.update(dt, t); },
    resize() { resize(); if (current && current.resize) current.resize(); },
    destroy() { if (current && current.destroy) current.destroy(); renderer.dispose(); },
  };
}
