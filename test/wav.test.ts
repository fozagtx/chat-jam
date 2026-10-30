import { describe, expect, it } from 'vitest';
import { encodeWav } from '../public/wav.js';

describe('WAV encoder', () => {
  it('writes the PCM header, exact byte length, and signed samples', () => {
    const channels = [new Float32Array([-1, 0, 1])];
    const audio = {
      numberOfChannels: 1,
      length: 3,
      sampleRate: 22_050,
      getChannelData: (index: number) => channels[index]!,
    };
    const output = encodeWav(audio);
    const view = new DataView(output);
    const text = (offset: number, length: number) =>
      String.fromCharCode(...new Uint8Array(output, offset, length));

    expect(output.byteLength).toBe(50);
    expect(text(0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(42);
    expect(text(8, 4)).toBe('WAVE');
    expect(text(12, 4)).toBe('fmt ');
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(22_050);
    expect(text(36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(6);
    expect(view.getInt16(44, true)).toBe(-32_768);
    expect(view.getInt16(48, true)).toBe(32_767);
  });
});
