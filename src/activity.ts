export interface ActivityEntry {
  id: number;
  at: string;
  kind: string;
  text: string;
}

export class ActivityBuffer {
  private entries: ActivityEntry[] = [];
  private nextId = 1;

  constructor(private readonly capacity = 50) {}

  add(kind: string, text: string, at = new Date().toISOString()): ActivityEntry {
    const entry = { id: this.nextId++, at, kind, text };
    this.entries.push(entry);
    if (this.entries.length > this.capacity) this.entries.shift();
    return entry;
  }

  recent(): ActivityEntry[] {
    return [...this.entries].reverse();
  }
}
