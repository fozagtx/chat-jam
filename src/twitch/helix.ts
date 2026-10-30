const HELIX = 'https://api.twitch.tv/helix';

export interface TwitchCredentials {
  clientId: string;
  accessToken: string;
}

export async function subscribeToChannelEvents(
  credentials: TwitchCredentials,
  sessionId: string,
  broadcasterId: string,
): Promise<void> {
  const broadcaster = { broadcaster_user_id: broadcasterId };
  const subscriptions = [
    {
      type: 'channel.chat.message',
      version: '1',
      condition: { ...broadcaster, user_id: broadcasterId },
    },
    {
      type: 'channel.raid',
      version: '1',
      condition: { to_broadcaster_user_id: broadcasterId },
    },
    { type: 'channel.subscribe', version: '1', condition: broadcaster },
    { type: 'channel.cheer', version: '1', condition: broadcaster },
    {
      type: 'channel.channel_points_custom_reward_redemption.add',
      version: '1',
      condition: broadcaster,
    },
  ];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const response = await fetch(`${HELIX}/eventsub/subscriptions`, {
        method: 'POST',
        headers: {
          'Client-ID': credentials.clientId,
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...subscription,
          transport: { method: 'websocket', session_id: sessionId },
        }),
      });
      if (!response.ok) {
        throw new Error(`EventSub subscription failed (${response.status})`);
      }
    }),
  );
}

export async function createClip(
  credentials: TwitchCredentials,
  broadcasterId: string,
): Promise<void> {
  const response = await fetch(`${HELIX}/clips?broadcaster_id=${broadcasterId}`, {
    method: 'POST',
    headers: {
      'Client-ID': credentials.clientId,
      Authorization: `Bearer ${credentials.accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Create Clip failed (${response.status})`);
  }
}
