import { describe, expect, it } from 'vitest';
import { shouldReduceMotion } from '../public/reduced-motion.js';

describe('reduced-motion preference', () => {
  it('combines the saved setting, overlay URL query, and system preference', () => {
    expect(
      shouldReduceMotion({ setting: true, search: '', systemPreference: false }),
    ).toBe(true);
    expect(
      shouldReduceMotion({
        setting: false,
        search: '?reducedMotion=1',
        systemPreference: false,
      }),
    ).toBe(true);
    expect(
      shouldReduceMotion({ setting: false, search: '', systemPreference: true }),
    ).toBe(true);
    expect(
      shouldReduceMotion({ setting: false, search: '', systemPreference: false }),
    ).toBe(false);
  });
});
