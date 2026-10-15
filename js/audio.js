// Tiny WebAudio synth: sound effects + a step sequencer for (original) chiptune-ish loops.
import { settings } from './input.js';

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(n) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(n);
  if (!m) return 0;
  let semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3]) + 1) * 12;
  return 440 * Math.pow(2, (semi - 69) / 12);
}

// All melodies here are original noodles written for this project.
const TRACKS = {
  menu: {
    bpm: 96, wave: 'triangle', bassWave: 'sine', leadVol: 0.16, bassVol: 0.2,
    lead: 'E5 . G5 . A5 . G5 E5 | D5 . . . C5 . D5 . | E5 . G5 . C6 . B5 A5 | G5 . . . . . . . | F5 . A5 . C6 . A5 F5 | E5 . G5 . C6 . G5 E5 | D5 . F5 . A5 . G5 F5 | E5 . D5 . C5 . . .',
    bass: 'C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 . | E2 . B2 . E2 . B2 . | F2 . C3 . F2 . C3 . | C3 . G3 . C3 . G3 . | D3 . A3 . G2 . D3 . | C3 . G3 . C3 . . .',
    drums: 'h . h . h . h . | h . h . h . h h',
  },
  kart: {
    bpm: 150, wave: 'square', bassWave: 'sawtooth', leadVol: 0.09, bassVol: 0.1,
    lead: 'A4 . C5 E5 A5 . G5 E5 | F5 . E5 D5 C5 . D5 . | E5 . A4 . C5 E5 G5 . | F5 E5 D5 . E5 . . . | A4 . C5 E5 A5 . B5 C6 | B5 . A5 G5 A5 . E5 . | F5 . A5 . G5 . E5 . | D5 . C5 . B4 . . .',
    bass: 'A2 A2 A3 A2 A2 A3 A2 A3 | F2 F2 F3 F2 F2 F3 F2 F3 | C3 C3 C4 C3 C3 C4 C3 C4 | G2 G2 G3 G2 G2 G3 G2 G3',
    drums: 'k . h . s . h . | k k h . s . h h',
  },
  bros: {
    bpm: 168, wave: 'square', bassWave: 'triangle', leadVol: 0.08, bassVol: 0.22,
    lead: 'C5 . E5 G5 . E5 C5 . | D5 . F5 A5 . F5 D5 . | E5 G5 C6 . B5 . G5 . | A5 . . G5 . . . . | C5 . E5 G5 . E5 C5 . | F5 . A5 C6 . A5 F5 . | G5 F5 E5 D5 C5 . G4 . | C5 . . . . . . .',
    bass: 'C3 . G3 . C3 . G3 . | D3 . A3 . D3 . A3 . | E3 . G3 . C3 . E3 . | F3 . G3 . G2 . . . | C3 . G3 . C3 . G3 . | F3 . C4 . F3 . C4 . | G3 . F3 . E3 . D3 . | C3 . G2 . C3 . . .',
    drums: 'k . h k s . h . | k . h k s . h s',
  },
  sports: {
    bpm: 120, wave: 'triangle', bassWave: 'triangle', leadVol: 0.14, bassVol: 0.2,
    lead: 'G4 . B4 D5 G5 . . D5 | E5 . C5 . A4 . . . | F#4 . A4 D5 F#5 . E5 D5 | G5 . . . . . . . | G4 . B4 D5 G5 . A5 G5 | E5 . C5 . E5 . G5 . | F#5 . E5 . D5 . C5 . | B4 . A4 . G4 . . .',
    bass: 'G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | D3 . A3 . D3 . A3 . | G2 . D3 . G2 . B2 .',
    drums: 'k . h . s . h . | k . h k s . h .',
  },
  shoot: {
    bpm: 132, wave: 'sawtooth', bassWave: 'square', leadVol: 0.06, bassVol: 0.08,
    lead: 'D5 . D5 F5 . D5 C5 . | D5 . . . A4 . . . | D5 . D5 F5 . G5 A5 . | G5 F5 E5 . D5 . . . | Bb4 . Bb4 D5 . F5 E5 . | D5 . C5 . A4 . . . | Bb4 . C5 . D5 . E5 . | F5 . E5 . D5 . . .',
    bass: 'D3 D3 . D3 A2 . D3 . | D3 D3 . D3 A2 . D3 . | Bb2 Bb2 . Bb2 F2 . Bb2 . | C3 C3 . C3 A2 . . .',
    drums: 'k . h . s . h k | k . h . s s h .',
  },
  fish: {
    bpm: 84, wave: 'sine', bassWave: 'triangle', leadVol: 0.17, bassVol: 0.16,
    lead: 'C5 . E5 . G5 . . E5 | F5 . . . E5 . D5 . | C5 . E5 . G5 . C6 . | B5 . . . . . . . | A5 . G5 . F5 . E5 . | D5 . F5 . A5 . . . | G5 . E5 . D5 . G4 . | C5 . . . . . . .',
    bass: 'C3 . . . G2 . . . | F2 . . . G2 . . . | A2 . . . E2 . . . | F2 . . . G2 . . .',
    drums: 'h . . . h . . . ',
  },
  win: {
    bpm: 150, wave: 'square', bassWave: 'triangle', leadVol: 0.1, bassVol: 0.2, once: true,
    lead: 'C5 E5 G5 C6 . G5 C6 . | E6 . . . . . . .',
    bass: 'C3 . G3 . C4 . G3 . | C3 . . . . . . .',
    drums: 'k . s . k . s . | k . . . . . . .',
  },
};

function parseSeq(s) {
  return s.replace(/\|/g, ' ').split(/\s+/).filter(Boolean);
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.trackName = null;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = settings.vol;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = settings.music ? 0.8 : 0; this.musicBus.connect(this.master);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.timer = setInterval(() => this.schedule(), 40);
    if (this.trackName) { const n = this.trackName; this.trackName = null; this.music(n); }
  }
  get ready() { return this.ctx && this.ctx.state === 'running'; }
  applySettings() {
    if (!this.ctx) return;
    this.master.gain.value = settings.vol;
    this.musicBus.gain.value = settings.music ? 0.8 : 0;
  }

  tone(f, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0, bus } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noiseBurst(dur, { vol = 0.3, filter = 2000, q = 1, delay = 0, type = 'lowpass', bus } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = filter; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  play(name) {
    switch (name) {
      case 'hover': this.tone(1500, 0.04, { type: 'sine', vol: 0.06 }); break;
      case 'click': this.tone(880, 0.06, { type: 'triangle', vol: 0.2 }); this.tone(1320, 0.1, { type: 'triangle', vol: 0.15, delay: 0.05 }); break;
      case 'back': this.tone(660, 0.08, { type: 'triangle', vol: 0.2 }); this.tone(440, 0.12, { type: 'triangle', vol: 0.15, delay: 0.06 }); break;
      case 'start': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.18, delay: i * 0.07 })); break;
      case 'connect': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.15, { type: 'sine', vol: 0.2, delay: i * 0.08 })); break;
      case 'disconnect': [700, 500].forEach((f, i) => this.tone(f, 0.15, { type: 'sine', vol: 0.2, delay: i * 0.1 })); break;
      case 'coin': this.tone(988, 0.07, { vol: 0.12 }); this.tone(1319, 0.25, { vol: 0.12, delay: 0.07 }); break;
      case 'jump': this.tone(300, 0.18, { vol: 0.1, slide: 2.6 }); break;
      case 'stomp': this.tone(500, 0.12, { vol: 0.15, slide: 0.3 }); break;
      case 'bump': this.tone(150, 0.08, { vol: 0.2, type: 'triangle' }); break;
      case 'break': this.noiseBurst(0.25, { vol: 0.35, filter: 1500 }); break;
      case 'powerup': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.1, { vol: 0.1, delay: i * 0.06 })); break;
      case 'shrink': [800, 600, 400, 300].forEach((f, i) => this.tone(f, 0.1, { vol: 0.12, delay: i * 0.06 })); break;
      case 'die': [660, 620, 580, 400, 300, 200].forEach((f, i) => this.tone(f, 0.14, { vol: 0.12, delay: i * 0.1 })); break;
      case 'shoot': this.noiseBurst(0.18, { vol: 0.45, filter: 3000 }); this.tone(180, 0.12, { vol: 0.2, slide: 0.4 }); break;
      case 'pop': this.tone(900, 0.08, { type: 'sine', vol: 0.25, slide: 1.8 }); this.noiseBurst(0.06, { vol: 0.2, filter: 5000, type: 'highpass' }); break;
      case 'quack': this.tone(420, 0.13, { type: 'sawtooth', vol: 0.12, slide: 0.7 }); this.tone(400, 0.13, { type: 'sawtooth', vol: 0.12, slide: 0.7, delay: 0.16 }); break;
      case 'boost': this.noiseBurst(0.5, { vol: 0.25, filter: 900, type: 'bandpass', q: 3 }); this.tone(200, 0.5, { type: 'sawtooth', vol: 0.08, slide: 3 }); break;
      case 'item': for (let i = 0; i < 6; i++) this.tone(600 + i * 150, 0.05, { vol: 0.08, delay: i * 0.04 }); break;
      case 'spin': this.tone(700, 0.5, { type: 'triangle', vol: 0.15, slide: 0.3 }); break;
      case 'beep': this.tone(660, 0.18, { vol: 0.15, type: 'square' }); break;
      case 'go': this.tone(1320, 0.5, { vol: 0.15, type: 'square' }); break;
      case 'whoosh': this.noiseBurst(0.25, { vol: 0.3, filter: 1200, type: 'bandpass', q: 0.8 }); break;
      case 'hit': this.noiseBurst(0.08, { vol: 0.5, filter: 4000 }); this.tone(220, 0.08, { type: 'triangle', vol: 0.3 }); break;
      case 'punch': this.noiseBurst(0.12, { vol: 0.6, filter: 800 }); this.tone(90, 0.15, { type: 'sine', vol: 0.5, slide: 0.5 }); break;
      case 'block': this.tone(300, 0.06, { type: 'square', vol: 0.1 }); this.noiseBurst(0.05, { vol: 0.2, filter: 2500 }); break;
      case 'bounce': this.tone(260, 0.07, { type: 'sine', vol: 0.25, slide: 0.6 }); break;
      case 'pins': for (let i = 0; i < 7; i++) this.noiseBurst(0.12, { vol: 0.3, filter: 2500 + Math.random() * 2000, type: 'bandpass', q: 4, delay: i * 0.03 + Math.random() * 0.03 }); break;
      case 'roll': this.noiseBurst(1.2, { vol: 0.15, filter: 250 }); break;
      case 'cheer': for (let i = 0; i < 4; i++) this.noiseBurst(0.9, { vol: 0.14, filter: 1800 + i * 300, type: 'bandpass', q: 0.6, delay: i * 0.1 }); break;
      case 'aww': this.tone(400, 0.7, { type: 'sawtooth', vol: 0.05, slide: 0.6 }); break;
      case 'splash': this.noiseBurst(0.35, { vol: 0.35, filter: 1400 }); break;
      case 'bite': this.tone(1000, 0.05, { type: 'square', vol: 0.12 }); this.tone(1000, 0.05, { type: 'square', vol: 0.12, delay: 0.1 }); break;
      case 'reel': for (let i = 0; i < 8; i++) this.tone(1800, 0.02, { type: 'square', vol: 0.05, delay: i * 0.04 }); break;
      case 'bell': this.tone(1568, 0.6, { type: 'sine', vol: 0.15 }); this.tone(2093, 0.6, { type: 'sine', vol: 0.08 }); break;
      case 'win': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.2, { vol: 0.12, delay: i * 0.1 })); break;
      case 'lose': [400, 380, 360, 300].forEach((f, i) => this.tone(f, 0.25, { vol: 0.12, type: 'triangle', delay: i * 0.18 })); break;
      default: break;
    }
  }

  // ---------- music ----------
  music(name) {
    if (this.trackName === name) return;
    this.trackName = name;
    const tr = TRACKS[name];
    if (!tr || !this.ctx) { this.track = null; return; }
    this.track = {
      def: tr, step: 0, next: this.ctx.currentTime + 0.1,
      lead: parseSeq(tr.lead), bass: parseSeq(tr.bass), drums: parseSeq(tr.drums || ''),
    };
  }
  stopMusic() { this.trackName = null; this.track = null; }
  schedule() {
    if (!this.track || !this.ready) return;
    const tr = this.track, def = tr.def;
    const stepDur = 60 / def.bpm / 2;
    const now = this.ctx.currentTime;
    if (tr.next < now - 0.5) tr.next = now + 0.05;
    while (tr.next < now + 0.15) {
      const t0 = tr.next - now;
      const i = tr.step;
      if (def.once && i >= tr.lead.length) { this.track = null; this.trackName = null; return; }
      const ln = tr.lead[i % tr.lead.length];
      if (ln && ln !== '.' && ln !== '-') {
        let len = 1; while (tr.lead[(i + len) % tr.lead.length] === '-' ) len++;
        this.tone(freq(ln), stepDur * len * 0.95, { type: def.wave, vol: def.leadVol, delay: t0, bus: this.musicBus });
      }
      const bn = tr.bass[i % tr.bass.length];
      if (bn && bn !== '.' && bn !== '-') this.tone(freq(bn), stepDur * 0.9, { type: def.bassWave, vol: def.bassVol, delay: t0, bus: this.musicBus });
      if (tr.drums.length) {
        const dn = tr.drums[i % tr.drums.length];
        if (dn === 'k') this.tone(130, 0.12, { type: 'sine', vol: 0.35, slide: 0.35, delay: t0, bus: this.musicBus });
        else if (dn === 's') this.noiseBurst(0.1, { vol: 0.16, filter: 2500, delay: t0, bus: this.musicBus });
        else if (dn === 'h') this.noiseBurst(0.03, { vol: 0.06, filter: 7000, type: 'highpass', delay: t0, bus: this.musicBus });
      }
      tr.step++;
      tr.next += stepDur;
    }
  }
}

export const audio = new AudioEngine();
