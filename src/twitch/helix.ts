const HELIX = 'https://api.twitch.tv/helix';

export interface TwitchCredentials {
  clientId: string;
  accessToken: string;
}

export interface TwitchClip {
  id: string;
  edit_url: string;
}

export interface CreateClipResponse {
  data: TwitchClip[];
}

export type StreamStatus = 'live' | 'offline' | 'unknown';

export function parseStreamStatus(payload: unknown): StreamStatus {
  if (typeof payload !== 'object' || payload === null || !('data' in payload)) {
    return 'unknown';
  }
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return 'unknown';
  return data.length > 0 ? 'live' : 'offline';
}

export async function getStreamStatus(
  credentials: TwitchCredentials,
  broadcasterId: string,
): Promise<StreamStatus> {
  const response = await fetch(
    `${HELIX}/streams?user_id=${encodeURIComponent(broadcasterId)}`,
    {
      headers: {
        'Client-ID': credentials.clientId,
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    },
  );
  if (!response.ok) throw new HelixError(response.status);
  return parseStreamStatus(await response.json());
}

export class HelixError extends Error {
  constructor(public readonly status: number) {
    super(`Helix request failed (${status})`);
    this.name = 'HelixError';
  }
}

export function clipFailureNotice(error: unknown): string {
  return error instanceof HelixError && error.status === 404
    ? 'Go live to auto-clip the Drop'
    : 'Clip failed';
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
): Promise<CreateClipResponse> {
  const response = await fetch(`${HELIX}/clips?broadcaster_id=${broadcasterId}`, {
    method: 'POST',
    headers: {
      'Client-ID': credentials.clientId,
      Authorization: `Bearer ${credentials.accessToken}`,
    },
  });
  if (!response.ok) {
    throw new HelixError(response.status);
  }
  return (await response.json()) as CreateClipResponse;
}
