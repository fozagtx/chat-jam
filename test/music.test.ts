import { describe, expect, it } from 'vitest';
import {
  addLayer,
  parseCommand,
  RateLimiter,
  snapNote,
  type Layer,
} from '../src/music.js';
import { isModeratorOrBroadcaster, Song } from '../src/song.js';

describe('command parser', () => {
  it('parses the supported drum, bass, melody, vibe, and reset commands', () => {
    expect(parseCommand('!kick')).toMatchObject({ kind: 'layer', instrument: 'kick' });
    expect(parseCommand('!snare')?.kind).toBe('layer');
    expect(parseCommand('!hat')?.kind).toBe('layer');
    expect(parseCommand('!bass 4')).toMatchObject({
      instrument: 'bass',
      pattern: [0, 3, 7, 11, 14],
    });
    expect(parseCommand('!melody C Eb G')?.kind).toBe('layer');
    expect(parseCommand('!vibe spooky')).toMatchObject({ kind: 'vibe', text: 'spooky' });
    expect(parseCommand('!reset')).toEqual({ kind: 'reset' });
  });

  it('silently ignores unknown and malformed commands', () => {
    expect(parseCommand('!unknown')).toBeNull();
    expect(parseCommand('!bass 5')).toBeNull();
    expect(parseCommand('!melody H C')).toBeNull();
    expect(parseCommand('!vibe')).toBeNull();
  });

  it('caps melodies at eight notes', () => {
    expect(parseCommand('!melody C D E F G A B C')).not.toBeNull();
    expect(parseCommand('!melody C D E F G A B C D')).toBeNull();
  });

  it('allows reset only when the badges identify a moderator or broadcaster', () => {
    expect(isModeratorOrBroadcaster([])).toBe(false);
    expect(isModeratorOrBroadcaster([{ set_id: 'subscriber' }])).toBe(false);
    expect(isModeratorOrBroadcaster([{ set_id: 'moderator' }])).toBe(true);
    expect(isModeratorOrBroadcaster([{ set_id: 'broadcaster' }])).toBe(true);
  });
});

describe('rate limiter', () => {
  it('allows one layer per five seconds and one vibe per thirty seconds per user', () => {
    const limiter = new RateLimiter();
    expect(limiter.allow('user', 1_000)).toBe(true);
    expect(limiter.allow('user', 2_000)).toBe(false);
    expect(limiter.allow('user', 6_000)).toBe(true);
    expect(limiter.allow('user', 6_000, true)).toBe(true);
    expect(limiter.allow('user', 35_000, true)).toBe(false);
    expect(limiter.allow('another-user', 2_000)).toBe(true);
  });
});

describe('key snapping', () => {
  it('snaps pitches to the selected key and scale', () => {
    expect(snapNote('F#', 'C', 'major')).toBe('F');
    expect(snapNote('C#', 'C', 'major')).toBe('C');
    expect(snapNote('Bb', 'C', 'minor')).toBe('A#');
  });
});

describe('eight-layer FIFO and Drop state', () => {
  it('keeps the newest eight layers', () => {
    const layers: Layer[] = Array.from({ length: 9 }, (_, index) => ({
      id: String(index),
      userId: String(index),
      userName: String(index),
      color: '#fff',
      instrument: 'kick',
      steps: [0],
      createdAt: index,
    }));
    expect(addLayer(layers, layers[0]!)).toHaveLength(8);
    expect(addLayer(layers, layers[0]!)[0]?.id).toBe('2');
  });

  it('triggers the Drop on first fill and re-arms it after reset', () => {
    const song = new Song();
    const layer: Layer = {
      id: 'layer',
      userId: 'user',
      userName: 'member',
      color: '#fff',
      instrument: 'kick',
      steps: [0],
      createdAt: 0,
    };
    for (let index = 0; index < 7; index += 1) {
      expect(song.add({ ...layer, id: String(index) }).firstFull).toBe(false);
    }
    expect(song.add({ ...layer, id: 'full' }).firstFull).toBe(true);
    expect(song.add({ ...layer, id: 'replace' }).firstFull).toBe(false);
    song.reset();
    for (let index = 0; index < 7; index += 1)
      song.add({ ...layer, id: `again-${index}` });
    expect(song.add({ ...layer, id: 'again-full' }).firstFull).toBe(true);
  });
});
