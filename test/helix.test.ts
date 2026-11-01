import { describe, expect, it } from 'vitest';
import { clipFailureNotice, HelixError } from '../src/twitch/helix.js';

describe('Create Clip failure notices', () => {
  it('explains that Twitch needs the channel to be live for a 404', () => {
    expect(clipFailureNotice(new HelixError(404))).toBe('Go live to auto-clip the Drop');
  });

  it('uses a short generic notice for other failures', () => {
    expect(clipFailureNotice(new HelixError(500))).toBe('Clip failed');
    expect(clipFailureNotice(new Error('network error'))).toBe('Clip failed');
  });
});
