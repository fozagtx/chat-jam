import { describe, expect, it } from 'vitest';
import { captionForLayers, viewerNameLabel } from '../public/overlay-view.js';

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
});
