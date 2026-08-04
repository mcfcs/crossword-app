// Tiny synthesized sound effects (no audio files). Off by default; the toggle
// (a user gesture) initialises the AudioContext so autoplay policies are happy.
import { loadJSON, saveJSON } from './storage';

let ctx = null;
let enabled = loadJSON('soundOn', false);

const getCtx = () => {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume?.();
  } catch { return null; }
  return ctx;
};

export const isSoundOn = () => enabled;
export const setSoundOn = (v) => {
  enabled = !!v;
  saveJSON('soundOn', enabled);
  if (enabled) getCtx(); // warm up on the enabling gesture
};

const tone = (freq, dur = 0.08, type = 'sine', gain = 0.05) => {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
};

const melody = (notes) =>
  notes.forEach((n) => setTimeout(() => tone(n.f, n.d || 0.14, n.type || 'triangle', n.g || 0.06), (n.t || 0) * 1000));

export const sfx = {
  key: () => tone(330, 0.045, 'sine', 0.035),
  reveal: () => tone(520, 0.12, 'triangle', 0.05),
  wrong: () => tone(150, 0.14, 'sawtooth', 0.035),
  win: () => melody([{ f: 523, t: 0 }, { f: 659, t: 0.11 }, { f: 784, t: 0.22 }, { f: 1047, t: 0.33, d: 0.28 }]),
};
