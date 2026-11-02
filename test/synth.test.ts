import { describe, expect, it, vi } from 'vitest';
import {
  chordPadNotes,
  playVoice,
  stepVelocity,
  swingOffset,
} from '../public/audio/synth.js';

function makeAudioNode() {
  const parameter = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
  return {
    type: '',
    frequency: parameter,
    detune: parameter,
    Q: parameter,
    gain: parameter,
    connect: vi.fn(() => ({})),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

describe('synth arrangement', () => {
  it('uses a detuned, filtered bass pair with a long envelope', () => {
    const oscillators = [makeAudioNode(), makeAudioNode()];
    const filter = makeAudioNode();
    const envelope = makeAudioNode();
    const context = {
      createOscillator: vi.fn(() => oscillators.shift()!),
      createBiquadFilter: vi.fn(() => filter),
      createGain: vi.fn(() => envelope),
    };
    const destination = makeAudioNode();

    playVoice(
      context as unknown as BaseAudioContext,
      destination as unknown as AudioNode,
      'bass',
      2,
      'C2',
    );

    expect(context.createOscillator).toHaveBeenCalledTimes(2);
    expect(filter.type).toBe('lowpass');
    expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(1_050, 2);
    expect(filter.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(260, 2.32);
    expect(envelope.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 2.4);
  });

  it('builds a key-aware soft chord and varies hat velocity with a swung open accent', () => {
    expect(chordPadNotes('C', 'major')).toEqual(['C3', 'E3', 'G3']);
    expect(chordPadNotes('A', 'minor')).toEqual(['A3', 'C4', 'E4']);
    expect(stepVelocity('hat', 2)).toBeCloseTo(0.86);
    expect(swingOffset('hat', 2, 120)).toBeCloseTo(0.0125);
    expect(swingOffset('kick', 2, 120)).toBe(0);
  });
});
