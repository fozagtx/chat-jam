import { addLayer, type Layer } from './music.js';

export interface SongSettings {
  key: string;
  scale: string;
  tempo: number;
  volume: number;
  reducedMotion: boolean;
}

export class Song {
  private currentLayers: Layer[] = [];
  private hasDropped = false;
  private contributorNames = new Set<string>();
  private currentSettings: SongSettings = {
    key: 'C',
    scale: 'major',
    tempo: 100,
    volume: 0.7,
    reducedMotion: false,
  };

  get layers(): Layer[] {
    return [...this.currentLayers];
  }

  get contributors(): string[] {
    return [...this.contributorNames];
  }

  get settings(): SongSettings {
    return { ...this.currentSettings };
  }

  add(layer: Layer): { layers: Layer[]; firstFull: boolean } {
    this.currentLayers = addLayer(this.currentLayers, layer);
    this.contributorNames.add(layer.userName);
    const firstFull = this.currentLayers.length === 8 && !this.hasDropped;
    if (firstFull) this.hasDropped = true;
    return { layers: this.layers, firstFull };
  }

  reset(): Layer[] {
    this.currentLayers = [];
    this.contributorNames.clear();
    this.hasDropped = false;
    return this.layers;
  }

  updateSettings(input: Partial<SongSettings>): SongSettings {
    if (input.key) this.currentSettings.key = input.key;
    if (input.scale) this.currentSettings.scale = input.scale;
    const tempo = Number(input.tempo);
    if (Number.isFinite(tempo)) {
      this.currentSettings.tempo = Math.min(180, Math.max(60, tempo));
    }
    if (typeof input.reducedMotion === 'boolean') {
      this.currentSettings.reducedMotion = input.reducedMotion;
    }
    const volume = Number(input.volume);
    if (Number.isFinite(volume)) {
      this.currentSettings.volume = Math.min(1, Math.max(0, volume));
    }
    return this.settings;
  }
}

export function isModeratorOrBroadcaster(badges: Array<{ set_id?: string }>): boolean {
  return badges.some((badge) =>
    ['broadcaster', 'moderator'].includes(badge.set_id ?? ''),
  );
}
