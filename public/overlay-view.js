const ICONS = { kick: '◉', snare: '✳', hat: '✧', bass: '〰', melody: '♫', vibe: '✦' };

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
      `${key} ${scale.toUpperCase()} · ${tempo} BPM`;
  }

  setConnection(connected, label = '') {
    const live = document.querySelector('#live');
    live.classList.toggle('on', connected);
    live.lastChild.textContent = connected ? ` LIVE · ${label}` : ' WAITING FOR TWITCH';
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
    document.querySelector('#count').textContent = `${layers.length} / 8`;
    document.querySelector('#leader').textContent = leader
      ? `♛ BAND LEADER · ${leader}`
      : '';
    this.band.replaceChildren(
      ...layers.map((layer) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.id = layer.id;
        tile.style.setProperty('--c', safeColor(layer.color));
        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.textContent = ICONS[layer.instrument] ?? ICONS.vibe;
        const detail = document.createElement('div');
        const person = document.createElement('div');
        person.className = 'person';
        person.textContent = layer.userName;
        const instrument = document.createElement('div');
        instrument.className = 'inst';
        instrument.textContent = layer.instrument;
        detail.append(person, instrument);
        tile.append(icon, detail);
        if (layer.userName === leader) {
          const leaderTag = document.createElement('span');
          leaderTag.className = 'leaderTag';
          leaderTag.textContent = 'LEADER';
          tile.append(leaderTag);
        }
        return tile;
      }),
    );
  }

  showBeat(step) {
    for (const cell of this.grid.children) {
      cell.classList.toggle('active', Number(cell.dataset.i) === step);
    }
  }

  showLayerHit(layer) {
    const tile = this.band.querySelector(`[data-id="${CSS.escape(layer.id)}"]`);
    if (tile) {
      tile.classList.add('hit');
      setTimeout(() => tile.classList.remove('hit'), 110);
    }
    const now = performance.now();
    if (!this.reducedMotion && now - this.lastFlashAt >= 334) {
      this.lastFlashAt = now;
      const flash = document.querySelector('#flash');
      flash.style.opacity = '0.32';
      setTimeout(() => (flash.style.opacity = '0'), 70);
    }
  }

  setCaption(layers, step) {
    const active = layers.filter((layer) => layer.steps.includes(step));
    const caption = active.length
      ? `♪ ${active
          .map((layer) =>
            ['bass', 'melody', 'vibe'].includes(layer.instrument)
              ? `${layer.instrument} by ${layer.userName}`
              : layer.instrument,
          )
          .join(' + ')}`
      : '♪ Listening for the next layer';
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
  return /^#[\da-f]{3,8}$/i.test(color) ? color : '#9b59ff';
}
