export class DropSequence {
  constructor({ engine, root, title, credits, names }) {
    this.engine = engine;
    this.root = root;
    this.title = title;
    this.credits = credits;
    this.names = names;
    this.hideTimer = null;
    this.fadeTimer = null;
  }

  play(contributors, tempo) {
    clearTimeout(this.hideTimer);
    clearTimeout(this.fadeTimer);
    this.root.classList.remove('fade-out');
    this.names.textContent = contributors.join(' · ') || 'THE CHAT';
    this.root.classList.add('show');
    this.title.textContent = 'THE BUILD';
    this.credits.classList.remove('visible');

    const duration = this.engine.drop(tempo);
    setTimeout(() => {
      this.title.textContent = 'THE DROP';
      this.credits.classList.add('visible');
    }, duration * 1_000);
    this.hideTimer = setTimeout(
      () => {
        this.root.classList.add('fade-out');
        this.fadeTimer = setTimeout(() => {
          this.root.classList.remove('show', 'fade-out');
        }, 700);
      },
      duration * 1_000 + 5_000,
    );
  }
}
