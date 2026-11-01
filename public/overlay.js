import { shouldReduceMotion } from './reduced-motion.js';
import { AudioEngine } from './audio/audio-engine.js';
import { noteFrequency } from './audio/synth.js';
import { LookaheadScheduler } from './audio/scheduler.js';
import { DropSequence } from './audio/drop.js';
import { OverlayView } from './overlay-view.js';
import { connectOverlaySocket } from './socket.js';

const view = new OverlayView();
const vibeDisabledNotice = '!vibe is off — OPENAI_API_KEY is not set';
const initial = await fetch('/api/config').then((response) => response.json());
let layers = initial.layers ?? [];
let tempo = initial.tempo;
const engine = new AudioEngine();
const scheduler = new LookaheadScheduler({
  engine,
  getLayers: () => layers,
  getTempo: () => tempo,
  onStep: (step) => {
    view.showBeat(step);
    view.setCaption(layers, step);
  },
  onLayerHit: (layer) => view.showLayerHit(layer),
});
const drop = new DropSequence({
  engine,
  root: document.querySelector('#drop'),
  title: document.querySelector('#drop .burst'),
  credits: document.querySelector('#drop .credits'),
  names: document.querySelector('#names'),
});

view.setMetadata(initial);
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotionPreference = Boolean(initial.reducedMotion);
const applyReducedMotion = () => {
  view.setReducedMotion(
    shouldReduceMotion({
      setting: reducedMotionPreference,
      search: location.search,
      systemPreference: reducedMotionQuery.matches,
    }),
  );
};
applyReducedMotion();
reducedMotionQuery.addEventListener('change', applyReducedMotion);
engine.setVolume(initial.volume);
view.renderLayers(layers);
scheduler.start();
const showStartButton = () => {
  view.showAudioStart(engine.context.state === 'suspended', () => {
    void engine.context.resume();
  });
};
showStartButton();
engine.context.addEventListener('statechange', showStartButton);

connectOverlaySocket(
  (message) => {
    if (message.type === 'layer') {
      layers = message.layers;
      scheduler.addLayer(message.layer);
      view.renderLayers(layers);
    } else if (message.type === 'reset') {
      layers = message.layers ?? [];
      scheduler.reset();
      view.renderLayers(layers);
    } else if (message.type === 'settings') {
      tempo = message.tempo;
      reducedMotionPreference = Boolean(message.reducedMotion);
      applyReducedMotion();
      engine.setVolume(message.volume);
      view.setMetadata(message);
    } else if (message.type === 'drop') {
      drop.play(message.contributors ?? [], message.tempo ?? tempo);
    } else if (message.type === 'notice') {
      if (message.text !== vibeDisabledNotice) view.showNotice(message.text);
    } else if (message.type === 'slowdown') {
      view.showNotice('Slow down — one sound every 5 seconds');
    } else if (message.type === 'hype') {
      playHype(message, engine, view);
    } else if (message.type === 'status') {
      view.setConnection(message.connected, message.login ?? '');
    }
  },
  (connected) => {
    if (!connected) view.setConnection(false);
  },
);

function playHype(message, audio, overlayView) {
  const now = audio.context.currentTime;
  const beat = 60 / tempo;
  if (message.kind === 'raid') {
    for (let subdivision = 0; subdivision < 8; subdivision += 1) {
      const time = now + (subdivision * beat) / 2;
      audio.voice(subdivision % 2 === 0 ? 'kick' : 'snare', time);
      audio.tone(
        noteFrequency(scaleNote(initial.key, initial.scale, subdivision, 4)),
        time,
        0.2,
        'sawtooth',
        0.1,
      );
    }
    overlayView.showNotice(`⚡ RAID FROM ${message.name}!`);
  } else if (message.kind === 'sub') {
    for (let degree = 0; degree < 4; degree += 1) {
      audio.tone(
        noteFrequency(scaleNote(initial.key, initial.scale, degree * 2, 4)),
        now + degree * beat,
        beat * 0.8,
        'sine',
        0.2,
      );
    }
    overlayView.showNotice(`✦ ${message.name} joined the band`);
  } else {
    for (let subdivision = 0; subdivision < 8; subdivision += 1) {
      audio.voice(
        subdivision % 2 === 0 ? 'snare' : 'kick',
        now + (subdivision * beat) / 2,
      );
    }
    overlayView.showNotice(`BITS! ${message.name ?? ''}`);
  }
}

function scaleNote(key, scale, degree, octave) {
  const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const aliases = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const scales = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    'minor pentatonic': [0, 3, 5, 7, 10],
  };
  const root = chromatic.indexOf(aliases[key] ?? key);
  const intervals = scales[scale] ?? scales.major;
  return `${chromatic[(root + intervals[degree % intervals.length]) % 12]}${octave}`;
}
