export class DropSequence {
  constructor({ engine, root, title, credits, names }) {
    this.engine = engine;
    this.root = root;
    this.title = title;
    this.credits = credits;
    this.names = names;
    this.hideTimer = null;
  }

  play(contributors, tempo) {
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
      () => this.root.classList.remove('show'),
      duration * 1_000 + 5_000,
    );
  }
}
