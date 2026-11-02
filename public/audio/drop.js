import { attachRiveArt, triggerRive } from '../rive-art.js';

export class DropSequence {
  constructor({ engine, root, title, credits, names, panel, stage }) {
    this.engine = engine;
    this.root = root;
    this.title = title;
    this.credits = credits;
    this.names = names;
    this.panel = panel;
    this.stage = stage;
    this.hideTimer = null;
    this.fadeTimer = null;
    this.buildTimers = [];
    this.confetti = root.querySelector('#confetti');
    this.riveCanvas = document.createElement('canvas');
    this.riveCanvas.className = 'drop-rive-canvas';
    this.riveCanvas.setAttribute('aria-hidden', 'true');
    this.root.append(this.riveCanvas);
    this.riveController = null;
    this.riveRequested = false;
  }

  play(contributors, tempo, layers = []) {
    this.loadRive();
    const prefersReduced =
      document.body.classList.contains('reduced') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) this.riveController?.instance?.play();
    clearTimeout(this.hideTimer);
    clearTimeout(this.fadeTimer);
    this.buildTimers.forEach(clearTimeout);
    this.buildTimers = [];
    this.confetti.replaceChildren();
    this.root.classList.remove(
      'fade-out',
      'building',
      'slamming',
      'static',
      'rive-celebrating',
    );
    this.panel.classList.remove('drop-building');
    this.root.style.setProperty('--build-speed', '34s');
    this.root.style.setProperty('--star-scale', '0.7');
    this.root.style.setProperty('--title-scale', '0.78');
    this.root.style.setProperty('--title-tilt', '0deg');
    this.names.replaceChildren(
      ...contributors.map((name, index) => {
        const sticker = document.createElement('span');
        sticker.className = 'credit-sticker';
        sticker.textContent = name;
        sticker.style.setProperty('--name-delay', `${index * 110}ms`);
        sticker.style.setProperty('--sticker-rotation', `${index % 2 ? 3 : -3}deg`);
        const color = layers.find((layer) => layer.userName === name)?.color;
        if (/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(color ?? '')) {
          sticker.style.setProperty('--sticker-color', color);
        }
        return sticker;
      }),
    );
    this.root.classList.add('show');
    this.riveController.instance?.resizeDrawingSurfaceToCanvas();
    this.title.textContent = 'THE BUILD';
    this.credits.classList.remove('visible');

    const duration = this.engine.drop(tempo);
    if (prefersReduced) {
      if (this.root.classList.contains('rive-ready')) this.root.classList.add('static');
      this.title.textContent = 'THE DROP';
      this.credits.classList.add('visible');
    } else {
      this.root.classList.add('building');
      this.panel.classList.add('drop-building');
      this.animateBuild(duration);
    }

    this.hideTimer = setTimeout(
      () => {
        this.root.classList.add('fade-out');
        this.fadeTimer = setTimeout(() => {
          this.root.classList.remove(
            'show',
            'fade-out',
            'building',
            'slamming',
            'static',
            'rive-celebrating',
          );
          this.panel.classList.remove('drop-building');
          this.confetti.replaceChildren();
          this.riveController?.instance?.pause();
        }, 700);
      },
      duration * 1_000 + 5_000,
    );
  }

  loadRive() {
    if (this.riveRequested) return;
    this.riveRequested = true;
    this.riveController = attachRiveArt(
      this.riveCanvas,
      '/rive/drop.riv',
      'Drop',
      'DropCelebration',
      (loaded) => {
        this.root.classList.add('rive-ready');
        if (
          !this.root.classList.contains('show') ||
          document.body.classList.contains('reduced') ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          loaded.instance?.pause();
        }
      },
    );
  }

  animateBuild(duration) {
    const stepDuration = (duration * 1_000) / 16;
    for (let step = 0; step < 16; step += 1) {
      this.buildTimers.push(
        setTimeout(
          () => {
            const progress = (step + 1) / 16;
            this.root.style.setProperty('--build-speed', `${34 - progress * 31}s`);
            this.root.style.setProperty('--star-scale', `${0.7 + progress * 0.42}`);
            this.root.style.setProperty('--title-scale', `${0.78 + progress * 0.38}`);
            this.root.style.setProperty('--title-tilt', `${step % 2 ? 2 : -2}deg`);
            this.title.classList.remove('build-jolt');
            void this.title.offsetWidth;
            this.title.classList.add('build-jolt');
            if (step === 15) this.slam();
          },
          stepDuration * (step + 1),
        ),
      );
    }
  }

  slam() {
    this.root.classList.remove('building');
    this.root.classList.add('slamming');
    this.riveController.instance?.resizeDrawingSurfaceToCanvas();
    if (this.root.classList.contains('rive-ready') && this.riveController.instance) {
      this.root.classList.add('rive-celebrating');
      triggerRive(this.riveController, 'celebrate');
    }
    this.panel.classList.remove('drop-building');
    this.stage.classList.add('screen-shake');
    this.title.textContent = 'THE DROP';
    this.credits.classList.add('visible');
    this.spawnConfetti();
    setTimeout(() => {
      this.root.classList.remove('slamming');
      this.stage.classList.remove('screen-shake');
    }, 320);
  }

  spawnConfetti() {
    const colors = ['#fff23a', '#ff3ecf', '#73ff4a', '#00d2ff'];
    for (let index = 0; index < 28; index += 1) {
      const piece = document.createElement('span');
      const angle = (Math.PI * 2 * index) / 28;
      const distance = 160 + (index % 4) * 55;
      piece.className = 'confetti-piece';
      piece.style.setProperty('--confetti-color', colors[index % colors.length]);
      piece.style.setProperty('--fly-x', `${Math.cos(angle) * distance}px`);
      piece.style.setProperty('--fly-y', `${Math.sin(angle) * distance}px`);
      piece.style.setProperty('--fly-rotate', `${index * 47}deg`);
      this.confetti.append(piece);
    }
    setTimeout(() => this.confetti.replaceChildren(), 1_000);
  }
}
