import WebSocket from 'ws';
import type { RawData } from 'ws';

export interface EventSubSession {
  id: string;
  keepalive_timeout_seconds?: number | null;
}

export interface EventSubHandlers {
  onWelcome(sessionId: string, migratedSubscriptions: boolean): void | Promise<void>;
  onNotification(event: unknown, subscriptionType: string): void;
  onStatus(connected: boolean, error?: string): void;
  onRevocation(subscription: unknown): void;
}

type EventSubEnvelope = {
  metadata?: { message_type?: string; subscription_type?: string };
  payload?: {
    session?: EventSubSession & { reconnect_url?: string | null };
    event?: unknown;
    subscription?: unknown;
  };
};

export interface EventSubMessageHandlers {
  onWelcome(session: EventSubSession): void;
  onKeepalive(): void;
  onReconnect(url: string): void;
  onNotification(event: unknown, subscriptionType: string): void;
  onRevocation(subscription: unknown): void;
}

export function routeEventSubMessage(
  message: EventSubEnvelope,
  handlers: EventSubMessageHandlers,
): void {
  const payload = message.payload;
  switch (message.metadata?.message_type) {
    case 'session_welcome':
      if (payload?.session) handlers.onWelcome(payload.session);
      break;
    case 'session_keepalive':
      handlers.onKeepalive();
      break;
    case 'session_reconnect':
      if (payload?.session?.reconnect_url) {
        handlers.onReconnect(payload.session.reconnect_url);
      }
      break;
    case 'notification':
      if (payload?.event && message.metadata.subscription_type) {
        handlers.onNotification(payload.event, message.metadata.subscription_type);
      }
      break;
    case 'revocation':
      if (payload?.subscription) handlers.onRevocation(payload.subscription);
      break;
  }
}

export interface EventSubSocket {
  on(event: 'message', listener: (data: RawData) => void): this;
  on(event: 'close', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  close(): void;
  terminate(): void;
}

export type EventSubSocketFactory = (url: string) => EventSubSocket;

export class EventSubClient {
  private socket: EventSubSocket | null = null;
  private previousSocket: EventSubSocket | null = null;
  private keepaliveTimer: NodeJS.Timeout | null = null;
  private keepaliveSeconds = 10;
  private reconnecting = false;
  private stopped = false;

  constructor(
    private readonly handlers: EventSubHandlers,
    private readonly socketFactory: EventSubSocketFactory = (url) =>
      new WebSocket(url) as EventSubSocket,
  ) {}

  connect(url = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30'): void {
    this.stopped = false;
    const socket = this.socketFactory(url);
    if (this.previousSocket && this.previousSocket !== this.socket) {
      this.previousSocket.close();
    }
    this.previousSocket = this.socket;
    this.socket = socket;

    socket.on('message', (raw) => {
      let message: EventSubEnvelope;
      try {
        message = JSON.parse(raw.toString()) as EventSubEnvelope;
      } catch {
        return;
      }

      this.armKeepaliveTimeout();
      routeEventSubMessage(message, {
        onWelcome: (session) => {
          if (socket !== this.socket) return;
          this.keepaliveSeconds = session.keepalive_timeout_seconds ?? 10;
          const migratedSubscriptions = this.reconnecting;
          this.reconnecting = false;
          this.previousSocket?.close();
          this.previousSocket = null;
          this.armKeepaliveTimeout();
          this.handlers.onStatus(true);
          void Promise.resolve(
            this.handlers.onWelcome(session.id, migratedSubscriptions),
          ).catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : 'EventSub subscription failed';
            this.handlers.onStatus(false, message);
          });
        },
        onKeepalive: () => this.armKeepaliveTimeout(),
        onReconnect: (reconnectUrl) => {
          this.reconnecting = true;
          this.connect(reconnectUrl);
        },
        onNotification: (event, subscriptionType) => {
          this.handlers.onNotification(event, subscriptionType);
        },
        onRevocation: (subscription) => {
          this.clearKeepaliveTimeout();
          this.handlers.onStatus(false, 'A Twitch permission was revoked');
          this.handlers.onRevocation(subscription);
          this.stop();
        },
      });
    });

    socket.on('close', () => {
      if (socket !== this.socket || this.stopped) return;
      this.reconnecting = false;
      this.previousSocket?.close();
      this.previousSocket = null;
      this.clearKeepaliveTimeout();
      this.handlers.onStatus(false, 'EventSub disconnected; reconnecting');
      setTimeout(() => {
        if (!this.stopped && !this.reconnecting) this.connect();
      }, 3_000);
    });
    socket.on('error', () => undefined);
    this.armKeepaliveTimeout();
  }

  stop(): void {
    this.stopped = true;
    this.clearKeepaliveTimeout();
    this.socket?.close();
    this.previousSocket?.close();
    this.socket = null;
    this.previousSocket = null;
  }

  private armKeepaliveTimeout(): void {
    this.clearKeepaliveTimeout();
    this.keepaliveTimer = setTimeout(
      () => {
        this.keepaliveTimer = null;
        if (this.stopped || this.reconnecting) return;
        this.handlers.onStatus(false, 'EventSub keepalive timed out; reconnecting');
        this.reconnecting = false;
        this.connect();
      },
      Math.max(this.keepaliveSeconds + 5, this.keepaliveSeconds * 1.5) * 1_000,
    );
  }

  private clearKeepaliveTimeout(): void {
    if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer);
    this.keepaliveTimer = null;
  }
}
