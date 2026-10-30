import { describe, expect, it, vi } from 'vitest';
import {
  EventSubClient,
  routeEventSubMessage,
  type EventSubMessageHandlers,
  type EventSubSocket,
} from '../src/twitch/eventsub.js';
import {
  keepalive,
  reconnect,
  revocation,
  welcome,
} from './fixtures/eventsub-lifecycle.js';

function handlers() {
  return {
    onWelcome: vi.fn(),
    onKeepalive: vi.fn(),
    onReconnect: vi.fn(),
    onNotification: vi.fn(),
    onRevocation: vi.fn(),
  } satisfies EventSubMessageHandlers;
}

describe('EventSub lifecycle routing', () => {
  it('routes a welcome to the subscription step and keepalive to its timer hook', () => {
    const callbacks = handlers();
    const subscribe = vi.fn();
    routeEventSubMessage(welcome, {
      ...callbacks,
      onWelcome: (session) => subscribe(session.id),
    });
    routeEventSubMessage(keepalive, callbacks);
    expect(subscribe).toHaveBeenCalledWith('session-id');
    expect(callbacks.onKeepalive).toHaveBeenCalledOnce();
  });

  it('routes reconnect URLs and permission revocations', () => {
    const callbacks = handlers();
    routeEventSubMessage(reconnect, callbacks);
    routeEventSubMessage(revocation, callbacks);
    expect(callbacks.onReconnect).toHaveBeenCalledWith(
      'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=10',
    );
    expect(callbacks.onRevocation).toHaveBeenCalledWith(revocation.payload.subscription);
  });

  it('reconnects when the welcome keepalive timeout expires', () => {
    vi.useFakeTimers();
    const sockets: TestSocket[] = [];
    const socketFactory = vi.fn(() => {
      const socket = new TestSocket();
      sockets.push(socket);
      return socket;
    });
    const client = new EventSubClient(
      {
        onWelcome: vi.fn(),
        onNotification: vi.fn(),
        onStatus: vi.fn(),
        onRevocation: vi.fn(),
      },
      socketFactory,
    );
    client.connect();
    sockets[0]!.message(welcome);
    vi.advanceTimersByTime(9_000);
    sockets[0]!.message(keepalive);
    vi.advanceTimersByTime(9_000);
    expect(socketFactory).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    expect(socketFactory).toHaveBeenCalledTimes(2);
    client.stop();
    vi.useRealTimers();
  });
});

class TestSocket implements EventSubSocket {
  private messageHandler?: (data: Buffer) => void;
  private closeHandler?: () => void;

  on(event: 'message' | 'close' | 'error', listener: any): this {
    if (event === 'message') this.messageHandler = listener;
    if (event === 'close') this.closeHandler = listener;
    return this;
  }

  close(): void {
    this.closeHandler?.();
  }

  terminate(): void {
    this.closeHandler?.();
  }

  message(payload: unknown): void {
    this.messageHandler?.(Buffer.from(JSON.stringify(payload)));
  }
}
