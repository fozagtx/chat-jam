import { describe, expect, it } from 'vitest';
import { ActivityBuffer } from '../src/activity.js';

describe('activity ring buffer', () => {
  it('keeps the latest entries up to its capacity in newest-first order', () => {
    const activity = new ActivityBuffer(3);
    activity.add('sound', 'first', '2026-01-01T00:00:00.000Z');
    activity.add('sound', 'second', '2026-01-01T00:00:01.000Z');
    activity.add('sound', 'third', '2026-01-01T00:00:02.000Z');
    activity.add('sound', 'fourth', '2026-01-01T00:00:03.000Z');

    expect(activity.recent().map((entry) => entry.text)).toEqual([
      'fourth',
      'third',
      'second',
    ]);
    expect(activity.recent()).toHaveLength(3);
  });
});
