export interface TwitchIdentity {
  client_id: string;
  user_id: string;
  login: string;
  scopes: string[];
}

export interface ConnectedAccount extends TwitchIdentity {
  accessToken: string;
}

export async function validateTwitchToken(
  accessToken: string,
  expectedClientId: string,
): Promise<ConnectedAccount> {
  const response = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!response.ok) throw new Error('Twitch rejected this token');

  const identity = (await response.json()) as TwitchIdentity;
  if (identity.client_id !== expectedClientId) {
    throw new Error('Token belongs to another Twitch app');
  }
  return { ...identity, accessToken };
}
