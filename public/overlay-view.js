const INSTRUMENTS = {
  kick: 'kick',
  snare: 'snare',
  hat: 'hat',
  bass: 'bass',
  melody: 'melody',
  vibe: 'vibe',
};

export class OverlayView {
  constructor() {
    this.grid = document.querySelector('#grid');
    this.band = document.querySelector('#band');
    this.lastFlashAt = -Infinity;
    this.reducedMotion = false;

    for (let index = 0; index < 16; index += 1) {
      const cell = document.createElement('div');
      cell.className = 'step';
      cell.dataset.i = String(index);
      this.grid.append(cell);
    }
  }

  setMetadata({ key, scale, tempo }) {
    document.querySelector('#songInfo').textContent =
      `[chat jam] ${key} ${scale} · ${tempo} bpm ·`;
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

  renderLayers(layers) {
    const counts = new Map();
    for (const layer of layers) {
      counts.set(layer.userName, (counts.get(layer.userName) ?? 0) + 1);
    }
    const leader = [...counts.entries()].sort(
      (left, right) => right[1] - left[1],
    )[0]?.[0];
    document.querySelector('#count').textContent = `${layers.length}/8`;
    document.querySelector('#leader').textContent = leader ? `[leader] ${leader}` : '';
    this.renderGrid(layers);

    const slots = Array.from({ length: 8 }, (_, index) => {
      const layer = layers[index];
      if (!layer) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'band-slot';
        emptySlot.setAttribute('aria-label', `Empty band slot ${index + 1}`);
        const emptyDisc = document.createElement('div');
        emptyDisc.className = 'empty-disc';
        emptySlot.append(emptyDisc);
        return emptySlot;
      }

      const slot = document.createElement('div');
      slot.className = 'band-slot band-member';
      slot.dataset.id = layer.id;
      slot.style.setProperty('--disc-tint', safeColor(layer.color));
      const disc = document.createElement('div');
      disc.className = 'cd-disc';
      disc.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'viewer-name';
      name.textContent = layer.userName;
      const instrument = document.createElement('span');
      instrument.className = 'instrument-label';
      instrument.textContent = INSTRUMENTS[layer.instrument] ?? 'sound';
      slot.append(disc, name, instrument);
      return slot;
    });
    this.band.replaceChildren(...slots);
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
    }
  }

  showLayerHit(layer) {
    const slot = this.band.querySelector(`[data-id="${CSS.escape(layer.id)}"]`);
    if (slot) {
      slot.classList.add('hit');
      setTimeout(() => slot.classList.remove('hit'), 260);
    }
    const now = performance.now();
    if (!this.reducedMotion && now - this.lastFlashAt >= 334) {
      this.lastFlashAt = now;
      const flash = document.querySelector('#flash');
      flash.style.opacity = '0.22';
      setTimeout(() => (flash.style.opacity = '0'), 70);
    }
  }

  setCaption(layers, step) {
    const active = layers.filter((layer) => layer.steps.includes(step));
    const caption = active.length
      ? active
          .map((layer) =>
            ['bass', 'melody', 'vibe'].includes(layer.instrument)
              ? `${layer.instrument} by ${layer.userName}`
              : layer.instrument,
          )
          .join(' · ')
      : 'Listening for the next sound…';
    document.querySelector('#caption').textContent = caption;
  }

  showNotice(text) {
    document.querySelector('#notice').textContent = text;
  }

  setReducedMotion(enabled) {
    this.reducedMotion = enabled;
    document.body.classList.toggle('reduced', enabled);
  }
}

function safeColor(color) {
  return /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)
    ? color
    : '#b7c4c6';
}
