import { describe, expect, it } from 'vitest';
import { parseStreamStatus } from '../src/twitch/helix.js';

describe('Twitch stream status parsing', () => {
  it('parses a populated stream response as live', () => {
    expect(parseStreamStatus({ data: [{ id: 'real-shaped-stream-id' }] })).toBe('live');
  });

  it('parses an empty stream response as offline', () => {
    expect(parseStreamStatus({ data: [] })).toBe('offline');
  });

  it('returns unknown for malformed responses', () => {
    expect(parseStreamStatus({})).toBe('unknown');
    expect(parseStreamStatus({ data: null })).toBe('unknown');
  });
});
