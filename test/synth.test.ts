import { describe, expect, it, vi } from 'vitest';
import { playVoice } from '../public/audio/synth.js';

describe('bass voice', () => {
  it('uses a low-passed sawtooth with a longer envelope', () => {
    const oscillator = {
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(() => filter),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const filter = {
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(() => envelope),
    };
    const envelope = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(() => destination),
    };
    const context = {
      createOscillator: vi.fn(() => oscillator),
      createBiquadFilter: vi.fn(() => filter),
      createGain: vi.fn(() => envelope),
    };
    const destination = {};

    playVoice(
      context as unknown as BaseAudioContext,
      destination as unknown as AudioNode,
      'bass',
      2,
      'C2',
    );

    expect(oscillator.type).toBe('sawtooth');
    expect(filter.type).toBe('lowpass');
    expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(750, 2);
    expect(envelope.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 2.35);
    expect(oscillator.stop).toHaveBeenCalledWith(2.36);
  });
});
