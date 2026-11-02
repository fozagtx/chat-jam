import {
  attachRiveArt,
  disposeRive,
  setRiveReducedMotion,
  triggerRive,
} from './rive-art.js';

const INSTRUMENTS = {
  kick: 'kick',
  snare: 'snare',
  hat: 'hat',
  bass: 'bass',
  melody: 'melody',
  vibe: 'vibe',
};
const EMPTY_SLOT_COMMANDS = ['!kick', '!snare', '!hat', '!bass 1', '!melody C E G'];
const DRUM_INSTRUMENTS = new Set(['kick', 'snare', 'hat']);

export function emptySlotCommand(index) {
  return EMPTY_SLOT_COMMANDS[index % EMPTY_SLOT_COMMANDS.length];
}

export function getLayerTransitions(previousLayers, nextLayers) {
  const nextIds = new Set(nextLayers.map((layer) => layer.id));
  const previousIds = new Set(previousLayers.map((layer) => layer.id));
  const joined = nextLayers.filter((layer) => !previousIds.has(layer.id));
  const removed = previousLayers.filter((layer) => !nextIds.has(layer.id));
  const replacements = joined
    .slice(0, removed.length)
    .map((layer, index) => ({ from: removed[index], to: layer }));
  return { joined, removed, replacements };
}

export function instrumentHitDuration(instrument, tempo) {
  const steps = { kick: 1.8, snare: 1.3, hat: 0.8, bass: 2.6, melody: 2, vibe: 2 };
  const stepMs = 15_000 / tempo;
  return Math.round(Math.min(650, Math.max(80, stepMs * (steps[instrument] ?? 1.6))));
}

export function createInstrumentArt(instrument, { join = false, joinDelay = 0 } = {}) {
  const art = document.createElement('div');
  art.className = `instrument-art art-${INSTRUMENTS[instrument] ?? 'vibe'}`;
  art.setAttribute('aria-hidden', 'true');
  if (instrument === 'kick') {
    art.append(makeArtPart('art-shockwave'));
  } else if (instrument === 'bass') {
    art.append(
      makeArtPart('art-ripple ripple-one'),
      makeArtPart('art-ripple ripple-two'),
    );
  } else if (instrument === 'melody') {
    for (let petal = 0; petal < 5; petal += 1) {
      const part = makeArtPart('art-petal');
      part.style.setProperty('--petal-index', String(petal));
      art.append(part);
    }
    art.append(makeArtPart('art-flower-core'));
  }
  if (['kick', 'snare', 'hat', 'bass', 'melody'].includes(instrument)) {
    const canvas = document.createElement('canvas');
    canvas.className = 'rive-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    art.append(canvas);
    const controller = attachRiveArt(
      canvas,
      `/rive/${instrument}.riv`,
      instrument[0].toUpperCase() + instrument.slice(1),
      'Instrument',
      (loaded) => {
        art.classList.add('rive-ready');
        if (join) setTimeout(() => triggerRive(loaded, 'join'), joinDelay);
      },
    );
    art.riveController = controller;
  }
  return art;
}

function makeArtPart(className) {
  const part = document.createElement('span');
  part.className = className;
  return part;
}

export function viewerNameLabel(layers, layer, index) {
  const viewerKey = layer.userId || layer.userName;
  const viewerLayers = layers.filter(
    (candidate) => (candidate.userId || candidate.userName) === viewerKey,
  );
  const firstIndex = layers.findIndex(
    (candidate) => (candidate.userId || candidate.userName) === viewerKey,
  );
  if (index !== firstIndex) return null;
  return viewerLayers.length > 1
    ? `${layer.userName} ×${viewerLayers.length}`
    : layer.userName;
}

export function captionForLayers(layers, step) {
  const active = layers.filter((layer) => layer.steps.includes(step));
  const groups = new Map();
  for (const layer of active) {
    const key = layer.userId || layer.userName;
    const group = groups.get(key) ?? { name: layer.userName, instruments: [] };
    group.instruments.push(layer.instrument);
    groups.set(key, group);
  }

  if (!groups.size) return 'Listening for the next sound…';
  return [...groups.values()]
    .map(({ name, instruments }) => {
      const uniqueInstruments = [...new Set(instruments)];
      const drums = uniqueInstruments.filter((instrument) =>
        DRUM_INSTRUMENTS.has(instrument),
      );
      const pitched = uniqueInstruments.filter(
        (instrument) => !DRUM_INSTRUMENTS.has(instrument),
      );
      const sounds = [drums.join(' · '), pitched.join(' + ')].filter(Boolean).join(' · ');
      return `${sounds} by ${name}`;
    })
    .join(' · ');
}

export class OverlayView {
  constructor() {
    this.grid = document.querySelector('#grid');
    this.band = document.querySelector('#band');
    this.lastFlashAt = -Infinity;
    this.reducedMotion = false;
    this.noticeTimer = null;
    this.hitTimers = new WeakMap();
    this.flashTimer = null;
    this.countTimer = null;
    this.currentLayers = [];

    for (let index = 0; index < 16; index += 1) {
      const cell = document.createElement('div');
      cell.className = 'step';
      cell.dataset.i = String(index);
      this.grid.append(cell);
    }
  }

  setMetadata() {
    document.querySelector('#songInfo').textContent = 'Chat Jam';
  }

  setConnection(connected, label = '') {
    const status = document.querySelector('#live');
    const description = connected
      ? `Connected to Twitch${label ? ` as ${label}` : ''}`
      : 'Waiting for Twitch';
    status.classList.toggle('on', connected);
    status.title = description;
    status.setAttribute('aria-label', description);
  }

  showAudioStart(show, onStart) {
    const button = document.querySelector('#start');
    button.classList.toggle('hidden', !show);
    button.onclick = onStart;
  }

  renderLayers(layers, animateChanges = false) {
    const transitions = animateChanges
      ? getLayerTransitions(this.currentLayers, layers)
      : { joined: [], removed: [], replacements: [] };
    const oldSlots = new Map(
      [...this.band.children]
        .filter((slot) => !slot.classList.contains('exit-slot') && slot.dataset.id)
        .map((slot) => [slot.dataset.id, { slot, rect: slot.getBoundingClientRect() }]),
    );
    const oldBandRect = this.band.getBoundingClientRect();
    const counts = new Map();
    for (const layer of layers) {
      counts.set(layer.userName, (counts.get(layer.userName) ?? 0) + 1);
    }
    const leader = [...counts.entries()].sort(
      (left, right) => right[1] - left[1],
    )[0]?.[0];
    const count = document.querySelector('#count');
    count.textContent = `${layers.length}/8`;
    count.classList.toggle('one-away', layers.length === 7);
    if (this.lastCount !== undefined && this.lastCount !== layers.length) {
      clearTimeout(this.countTimer);
      count.classList.remove('count-pop');
      void count.offsetWidth;
      count.classList.add('count-pop');
      this.countTimer = setTimeout(() => count.classList.remove('count-pop'), 380);
    }
    this.lastCount = layers.length;
    document.querySelector('#leader').textContent = leader ? `Top jammer: ${leader}` : '';
    this.renderGrid(layers);

    const slots = Array.from({ length: 8 }, (_, index) => {
      const layer = layers[index];
      if (!layer) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'band-slot';
        const command = emptySlotCommand(index);
        emptySlot.setAttribute(
          'aria-label',
          `Empty band slot ${index + 1}, type ${command}`,
        );
        const emptyDisc = document.createElement('div');
        emptyDisc.className = 'empty-disc';
        const instruction = document.createElement('span');
        instruction.textContent = command;
        emptyDisc.append(instruction);
        emptySlot.append(emptyDisc);
        return emptySlot;
      }

      const slot = document.createElement('div');
      slot.className = 'band-slot band-member';
      slot.dataset.id = layer.id;
      slot.style.setProperty('--slot-index', String(index));
      slot.style.setProperty('--idle-phase', `${index * -0.41}s`);
      slot.style.setProperty('--disc-tint', safeColor(layer.color));
      const instrument = INSTRUMENTS[layer.instrument] ?? 'sound';
      const joined = transitions.joined.some((candidate) => candidate.id === layer.id);
      const replaced = transitions.replacements.some((pair) => pair.to.id === layer.id);
      const art = createInstrumentArt(instrument, {
        join: joined,
        joinDelay: replaced ? 180 : 0,
      });
      if (joined) {
        slot.classList.add('joining');
        if (replaced) slot.classList.add('replacement-join');
      }
      slot.setAttribute('aria-label', `${layer.userName}, ${instrument} layer`);
      const label = viewerNameLabel(layers, layer, index);
      const name = label ? document.createElement('span') : null;
      if (name) {
        name.className = 'viewer-name';
        name.textContent = label;
        if (joined) name.classList.add('chip-joining');
      }
      const instrumentLabel = document.createElement('span');
      instrumentLabel.className = 'instrument-label';
      instrumentLabel.textContent = instrument;
      slot.append(art, ...(name ? [name] : []), instrumentLabel);
      return slot;
    });
    for (const slot of oldSlots.values()) {
      const art = slot.slot.querySelector('.instrument-art');
      if (art) disposeRive(art.riveController);
    }
    this.band.replaceChildren(...slots);
    for (const removed of transitions.removed) {
      const old = oldSlots.get(removed.id);
      if (!old) continue;
      const exit = old.slot.cloneNode(true);
      exit.querySelector('.rive-canvas')?.remove();
      exit.querySelector('.instrument-art')?.classList.remove('rive-ready');
      const oldRect = old.rect;
      exit.className = 'band-slot exit-slot';
      exit.removeAttribute('data-id');
      exit.setAttribute('aria-hidden', 'true');
      exit.style.left = `${oldRect.left - oldBandRect.left}px`;
      exit.style.top = `${oldRect.top - oldBandRect.top}px`;
      exit.style.width = `${oldRect.width}px`;
      exit.style.setProperty('--exit-duration', '180ms');
      this.band.append(exit);
      setTimeout(() => exit.remove(), 210);
    }
    this.currentLayers = [...layers];
  }

  renderGrid(layers) {
    const activeCounts = Array.from(
      { length: 16 },
      (_, step) => layers.filter((layer) => layer.steps.includes(step)).length,
    );
    for (const cell of this.grid.children) {
      const count = activeCounts[Number(cell.dataset.i)];
      cell.classList.toggle('has-sound', count > 0);
      cell.dataset.layers = String(count);
      cell.title = count ? `${count} layer${count === 1 ? '' : 's'}` : 'Empty step';
    }
  }

  showBeat(step) {
    for (const cell of this.grid.children) {
      cell.classList.toggle('active', Number(cell.dataset.i) === step);
      cell.classList.remove('played');
    }
    const current = this.grid.children[step];
    if (current?.dataset.layers !== '0') {
      current?.classList.add('played');
      setTimeout(() => current?.classList.remove('played'), 110);
    }
  }

  setTempo(tempo) {
    this.grid.style.setProperty('--step-ms', `${15_000 / tempo}ms`);
  }

  showLayerHit(layer, _step, tempo = 120) {
    const slot = this.band.querySelector(`[data-id="${CSS.escape(layer.id)}"]`);
    if (slot) {
      const instrument = INSTRUMENTS[layer.instrument] ?? 'vibe';
      triggerRive(slot.querySelector('.instrument-art')?.riveController, 'hit');
      clearTimeout(this.hitTimers.get(slot));
      slot.classList.remove('hit', `hit-${instrument}`);
      void slot.offsetWidth;
      const duration = instrumentHitDuration(instrument, tempo);
      slot.style.setProperty('--hit-duration', `${duration}ms`);
      slot.classList.add('hit', `hit-${instrument}`);
      this.hitTimers.set(
        slot,
        setTimeout(() => slot.classList.remove('hit', `hit-${instrument}`), duration),
      );
    }
    const now = performance.now();
    if (!this.reducedMotion && now - this.lastFlashAt >= 334) {
      this.lastFlashAt = now;
      const flash = document.querySelector('#flash');
      clearTimeout(this.flashTimer);
      flash.style.opacity = '0.78';
      this.flashTimer = setTimeout(() => (flash.style.opacity = '0'), 110);
    }
  }

  setCaption(layers, step) {
    document.querySelector('#caption').textContent = captionForLayers(layers, step);
  }

  showNotice(text) {
    const notice = document.querySelector('#notice');
    clearTimeout(this.noticeTimer);
    notice.textContent = text;
    this.noticeTimer = setTimeout(() => {
      notice.textContent = '';
      this.noticeTimer = null;
    }, 4_000);
  }

  setReducedMotion(enabled) {
    this.reducedMotion = enabled;
    document.body.classList.toggle('reduced', enabled);
    setRiveReducedMotion(enabled);
  }
}

function safeColor(color) {
  return /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)
    ? color
    : '#fff23a';
}
