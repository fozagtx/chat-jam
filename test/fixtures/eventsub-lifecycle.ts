// These lifecycle envelopes follow Twitch's documented EventSub WebSocket payload shapes.
export const welcome = {
  metadata: {
    message_id: 'example-welcome',
    message_type: 'session_welcome',
    message_timestamp: '2026-10-30T00:00:00.000Z',
  },
  payload: {
    session: {
      id: 'session-id',
      status: 'connected',
      connected_at: '2026-10-30T00:00:00.000Z',
      keepalive_timeout_seconds: 10,
      reconnect_url: null,
    },
  },
};

export const keepalive = {
  metadata: {
    message_id: 'example-keepalive',
    message_type: 'session_keepalive',
    message_timestamp: '2026-10-30T00:00:05.000Z',
  },
  payload: {},
};

export const reconnect = {
  metadata: {
    message_id: 'example-reconnect',
    message_type: 'session_reconnect',
    message_timestamp: '2026-10-30T00:00:06.000Z',
  },
  payload: {
    session: {
      id: 'new-session-id',
      status: 'reconnecting',
      connected_at: '2026-10-30T00:00:00.000Z',
      reconnect_url: 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=10',
    },
  },
};

export const revocation = {
  metadata: {
    message_id: 'example-revocation',
    message_type: 'revocation',
    message_timestamp: '2026-10-30T00:00:07.000Z',
  },
  payload: {
    subscription: {
      id: 'subscription-id',
      status: 'authorization_revoked',
      type: 'channel.chat.message',
      version: '1',
      condition: { broadcaster_user_id: 'broadcaster-id', user_id: 'broadcaster-id' },
      transport: { method: 'websocket', session_id: 'session-id' },
      created_at: '2026-10-30T00:00:00.000Z',
      cost: 0,
    },
  },
};
