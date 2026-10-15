// Woo Me Channel — edit the four player avatars, with a live 3D turntable preview.
import * as THREE from '../lib/three.module.min.js';
import { overlay, meCanvas } from './common.js';
import { getMe, setMe, randomMe, randomName, normalize, buildMe3D, drawMe, SKINS, HAIRS, SHIRTS, PANTS, EYE_COLORS, LIPS, OPTIONS } from '../me.js';

const TABS = [
  { id: 'face', label: '🙂 Face', rows: [['Skin', 'sw', 'skin', SKINS], ['Shape', 'opt', 'face'], ['Nose', 'opt', 'nose'], ['Blush', 'bool', 'blush'], ['Freckles', 'bool', 'freckles']] },
  { id: 'hair', label: '💇 Hair', rows: [['Style', 'opt', 'hairStyle'], ['Color', 'sw', 'hair', HAIRS], ['Brows', 'opt', 'brows'], ['Facial hair', 'opt', 'facial']] },
  { id: 'eyes', label: '👀 Eyes', rows: [['Eyes', 'opt', 'eyes'], ['Eye color', 'sw', 'eyeColor', EYE_COLORS], ['Glasses', 'opt', 'glasses']] },
  { id: 'mouth', label: '👄 Mouth', rows: [['Mouth', 'opt', 'mouth'], ['Lips', 'sw', 'lips', LIPS]] },
  { id: 'style', label: '🎩 Style', rows: [['Hat', 'opt', 'hat'], ['Hat color', 'sw', 'hatColor', SHIRTS], ['Shirt', 'sw', 'shirt', SHIRTS], ['Pants', 'sw', 'pants', PANTS]] },
  { id: 'body', label: '📏 Body', rows: [['Height', 'range', 'height', ['Tiny', 'Short', 'Normal', 'Tall', 'Giant']], ['Build', 'range', 'build', ['Slim', 'Lean', 'Normal', 'Sturdy', 'Round']]] },
];

export function create(api) {
  let el = null;
  let editing = -1, draft = null, tab = 'face';
  api.music('fish');

  // one shared renderer for the turntable
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(420, 520, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.domElement.style.cssText = 'width:40vh;height:50vh;border-radius:30px;background:radial-gradient(circle at 50% 35%,#ffffff,#d9eefc);border:3px solid #d5dae0';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x99aabb, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 4, 3); key.castShadow = true; scene.add(key);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.ShadowMaterial({ opacity: 0.25 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const cam = new THREE.PerspectiveCamera(32, 420 / 520, 0.1, 50);
  let fig = null, spin = 0;
  function rebuild() {
    if (fig) { scene.remove(fig); fig.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    fig = buildMe3D(THREE, draft);
    scene.add(fig);
  }

  function list() {
    editing = -1;
    if (el) el.remove();
    el = overlay(api, `
      <h1>Woo Me Channel</h1>
      <p>Pick a Me to edit. Each player number uses their own Me in every game.</p>
      <div class="g-row">${[0, 1, 2, 3].map((i) => `
        <div class="g-card me-card" data-ui="edit" data-i="${i}" style="color:${api.COLORS[i]}">
          <img src="${meCanvas(getMe(i), 200, api.COLORS[i])}" style="width:18vh;height:18vh">
          <div>${escapeHtml(getMe(i).name)}</div><div style="font-size:2vh">Player ${i + 1}</div>
        </div>`).join('')}</div>
      <div class="pill" data-ui="quit">Woo Menu</div>`, {
      edit: (t) => edit(+t.dataset.i),
      quit: () => api.exit(),
    }, 'me-bg');
  }

  function edit(i) {
    editing = i;
    draft = normalize(getMe(i));
    tab = 'face';
    rebuild();
    render();
  }

  function rowHtml([label, kind, key, list]) {
    let inner = '';
    if (kind === 'sw') inner = list.map((c, i) => `<div class="me-sw ${draft[key] === i ? 'sel' : ''}" data-ui="set" data-k="${key}" data-v="${i}" style="background:${c}"></div>`).join('');
    else if (kind === 'opt') inner = OPTIONS[key].map((l, i) => `<div class="pill small ${draft[key] === i ? 'sel' : ''}" data-ui="set" data-k="${key}" data-v="${i}">${l}</div>`).join('');
    else if (kind === 'range') inner = list.map((l, i) => `<div class="pill small ${draft[key] === i ? 'sel' : ''}" data-ui="set" data-k="${key}" data-v="${i}">${l}</div>`).join('');
    else inner = `<div class="pill small ${draft[key] ? 'sel' : ''}" data-ui="bool" data-k="${key}">${draft[key] ? 'Yes' : 'No'}</div>`;
    return `<div class="me-row"><b>${label}</b><div class="me-opts">${inner}</div></div>`;
  }

  function render() {
    if (el) el.remove();
    const t = TABS.find((x) => x.id === tab);
    el = overlay(api, `
      <div class="me-editor">
        <div class="me-left">
          <div id="me-stage"></div>
          <h2 style="color:${api.COLORS[editing]}">${escapeHtml(draft.name)}</h2>
          <div class="g-row"><div class="pill small" data-ui="name">🎲 Name</div><div class="pill small" data-ui="random">🎲 Random Me</div></div>
        </div>
        <div class="me-right">
          <div class="me-tabs">${TABS.map((x) => `<div class="pill small ${x.id === tab ? 'sel' : ''}" data-ui="tab" data-t="${x.id}">${x.label}</div>`).join('')}</div>
          <div class="me-panel">${t.rows.map(rowHtml).join('')}</div>
          <div class="g-row" style="justify-content:flex-end"><div class="pill" data-ui="cancel">Cancel</div><div class="pill" data-ui="save">💾 Save Me</div></div>
        </div>
      </div>`, {
      set: (x) => { draft[x.dataset.k] = +x.dataset.v; rebuild(); render(); },
      bool: (x) => { draft[x.dataset.k] = !draft[x.dataset.k]; rebuild(); render(); },
      tab: (x) => { tab = x.dataset.t; render(); },
      name: () => { draft.name = randomName(); render(); },
      random: () => { draft = randomMe(); rebuild(); render(); },
      cancel: () => list(),
      save: () => { setMe(editing, draft); api.toast(`Saved ${draft.name}!`); list(); },
    }, 'me-bg');
    el.querySelector('#me-stage').appendChild(renderer.domElement);
  }

  list();
  return {
    update(dt) {
      if (editing < 0 || !fig) return;
      spin += dt * 0.8;
      fig.rotation.y = Math.sin(spin) * 0.7;
      const h = fig.userData.head; h.rotation.y = Math.sin(spin * 1.7) * 0.2;
      fig.userData.arms[0].rotation.z = -0.15 - Math.max(0, Math.sin(spin * 2.3)) * 0.4;
      const top = 1.2 + draft.height * 0.08;
      cam.position.set(0, top * 0.8, 4.3 + draft.height * 0.2);
      cam.lookAt(0, top * 0.62, 0);
      renderer.render(scene, cam);
    },
    destroy() { if (el) el.remove(); renderer.dispose(); },
  };
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
export { drawMe };
