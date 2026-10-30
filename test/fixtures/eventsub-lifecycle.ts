// Recorded lifecycle data-frame examples from Twitch's EventSub WebSocket docs:
// https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
export const welcome = {
  metadata: {
    message_id: '96a3f3b5-5dec-4eed-908e-e11ee657416c',
    message_type: 'session_welcome',
    message_timestamp: '2023-07-19T14:56:51.634234626Z',
  },
  payload: {
    session: {
      id: 'AQoQILE98gtqShGmLD7AM6yJThAB',
      status: 'connected',
      connected_at: '2023-07-19T14:56:51.616329898Z',
      keepalive_timeout_seconds: 10,
      reconnect_url: null,
    },
  },
};

export const keepalive = {
  metadata: {
    message_id: '84c1e79a-2a4b-4c13-ba0b-4312293e9308',
    message_type: 'session_keepalive',
    message_timestamp: '2023-07-19T10:11:12.634234626Z',
  },
  payload: {},
};

export const reconnect = {
  metadata: {
    message_id: '84c1e79a-2a4b-4c13-ba0b-4312293e9308',
    message_type: 'session_reconnect',
    message_timestamp: '2022-11-18T09:10:11.634234626Z',
  },
  payload: {
    session: {
      id: 'AQoQexAWVYKSTIu4ec_2VAxyuhAB',
      status: 'reconnecting',
      keepalive_timeout_seconds: null,
      reconnect_url: 'wss://eventsub.wss.twitch.tv?...',
      connected_at: '2022-11-16T10:11:12.634234626Z',
    },
  },
};

export const revocation = {
  metadata: {
    message_id: 'f1c2a387-161a-49f9-a165-0f21d7a4e1c4',
    message_type: 'revocation',
    message_timestamp: '2022-11-16T10:11:12.634234626Z',
    subscription_type: 'channel.follow',
    subscription_version: '1',
  },
  payload: {
    subscription: {
      id: 'f1c2a387-161a-49f9-a165-0f21d7a4e1c4',
      status: 'authorization_revoked',
      type: 'channel.follow',
      version: '1',
      cost: 1,
      condition: { broadcaster_user_id: '12826' },
      transport: { method: 'websocket', session_id: 'AQoQexAWVYKSTIu4ec_2VAxyuhAB' },
      created_at: '2022-11-16T10:11:12.464757833Z',
    },
  },
};
