import { describe, expect, it } from 'vitest';
import {
  captionForLayers,
  getLayerTransitions,
  instrumentHitDuration,
  viewerNameLabel,
} from '../public/overlay-view.js';

const layers = [
  { userId: 'viewer-1', userName: 'xobadad', instrument: 'kick', steps: [0] },
  { userId: 'viewer-1', userName: 'xobadad', instrument: 'hat', steps: [0] },
  { userId: 'viewer-1', userName: 'xobadad', instrument: 'bass', steps: [0] },
  { userId: 'viewer-1', userName: 'xobadad', instrument: 'melody', steps: [0] },
  { userId: 'viewer-2', userName: 'other', instrument: 'snare', steps: [1] },
];

describe('band viewer labels and captions', () => {
  it('shows a repeated viewer name once with their layer count', () => {
    expect(viewerNameLabel(layers, layers[0]!, 0)).toBe('xobadad ×4');
    expect(viewerNameLabel(layers, layers[1]!, 1)).toBeNull();
    expect(viewerNameLabel(layers, layers[4]!, 4)).toBe('other');
  });

  it('groups active sounds under one viewer name', () => {
    expect(captionForLayers(layers, 0)).toBe('kick · hat · bass + melody by xobadad');
    expect(captionForLayers(layers, 1)).toBe('snare by other');
    expect(captionForLayers(layers, 2)).toBe('Listening for the next sound…');
  });

  it('lists each active instrument once per viewer in first-seen order', () => {
    const repeatedLayers = [
      ...layers.slice(0, 4),
      { ...layers[0]!, steps: [0] },
      { ...layers[2]!, steps: [0] },
      { ...layers[3]!, steps: [0] },
    ];
    expect(captionForLayers(repeatedLayers, 0)).toBe(
      'kick · hat · bass + melody by xobadad',
    );
  });

  it('detects a FIFO replacement while retaining the removed layer for its exit animation', () => {
    const oldLayers = Array.from({ length: 8 }, (_, index) => ({
      id: `old-${index}`,
      userName: `viewer-${index}`,
      instrument: 'kick',
      steps: [0],
    }));
    const newLayer = { id: 'new', userName: 'new-viewer', instrument: 'hat', steps: [1] };
    const result = getLayerTransitions(oldLayers, [...oldLayers.slice(1), newLayer]);
    expect(result.joined).toEqual([newLayer]);
    expect(result.removed).toEqual([oldLayers[0]]);
    expect(result.replacements).toEqual([{ from: oldLayers[0], to: newLayer }]);
  });

  it('scales hit animation duration to tempo while keeping it bounded', () => {
    expect(instrumentHitDuration('kick', 120)).toBe(225);
    expect(instrumentHitDuration('bass', 60)).toBe(650);
    expect(instrumentHitDuration('hat', 300)).toBe(80);
  });
});
