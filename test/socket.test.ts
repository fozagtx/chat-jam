import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectOverlaySocket, nextReconnectDelay } from '../public/socket.js';

describe('live socket reconnects', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('backs off from one second to a ten second maximum', () => {
    expect(nextReconnectDelay(1_000)).toBe(2_000);
    expect(nextReconnectDelay(8_000)).toBe(10_000);
    expect(nextReconnectDelay(10_000)).toBe(10_000);
  });

  it('reconnects over wss and calls the resync callback when open', () => {
    vi.useFakeTimers();
    const sockets: TestSocket[] = [];
    class MockWebSocket extends TestSocket {
      constructor(url: string) {
        super();
        this.url = url;
        sockets.push(this);
      }
    }
    vi.stubGlobal('location', { protocol: 'https:', host: 'jam.example' });
    vi.stubGlobal('WebSocket', MockWebSocket);
    const onOpen = vi.fn();
    const onConnection = vi.fn();
    const client = connectOverlaySocket(vi.fn(), onConnection, onOpen);

    expect(sockets[0]?.url).toBe('wss://jam.example/live');
    sockets[0]?.dispatch('open');
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onConnection).toHaveBeenCalledWith(true);
    sockets[0]?.dispatch('close');
    vi.advanceTimersByTime(1_000);
    expect(sockets).toHaveLength(2);
    sockets[1]?.dispatch('open');
    expect(onOpen).toHaveBeenCalledTimes(2);
    client.close();
  });
});

class TestSocket {
  url = '';
  private listeners = new Map<string, (event: { data?: string }) => void>();

  addEventListener(type: string, listener: (event: { data?: string }) => void): void {
    this.listeners.set(type, listener);
  }

  dispatch(type: string, event: { data?: string } = {}): void {
    this.listeners.get(type)?.(event);
  }

  close(): void {
    this.dispatch('close');
  }
}
