import { describe, expect, it } from 'vitest';
import {
  LOOKAHEAD_SECONDS,
  lookaheadEnd,
  nextBarStart,
  nextBeatStart,
  secondsPerStep,
  stepTime,
} from '../public/scheduler.js';

describe('audio-clock scheduler math', () => {
  it('starts drums on the next beat and pitched layers on the next bar', () => {
    expect(nextBeatStart(2.01, 2, 100)).toBeCloseTo(2.6);
    expect(nextBarStart(2.01, 2, 100)).toBeCloseTo(4.4);
  });

  it('calculates 16th-step times and the look-ahead window', () => {
    expect(secondsPerStep(120)).toBeCloseTo(0.125);
    expect(stepTime(1, 15, 120)).toBeCloseTo(2.875);
    expect(lookaheadEnd(3)).toBeCloseTo(3 + LOOKAHEAD_SECONDS);
  });
});
