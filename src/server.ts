import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { clientId, PORT } from './config.js';
import { Song } from './song.js';
import { ChatJam } from './chat.js';
import { ActivityBuffer } from './activity.js';
import { EventSubClient } from './twitch/eventsub.js';
import {
  getStreamStatus,
  subscribeToChannelEvents,
  type StreamStatus,
} from './twitch/helix.js';
import { validateTwitchToken, type ConnectedAccount } from './twitch/oauth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(here, '../../public');
const app = express();
app.use(express.json({ limit: '32kb' }));
app.use(express.static(publicDirectory));
app.get('/fonts/inter-400.woff2', (_request, response) =>
  response.sendFile(
    path.resolve(
      here,
      '../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2',
    ),
  ),
);
app.get('/fonts/inter-700.woff2', (_request, response) =>
  response.sendFile(
    path.resolve(
      here,
      '../../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2',
    ),
  ),
);
app.get('/fonts/inter-800.woff2', (_request, response) =>
  response.sendFile(
    path.resolve(
      here,
      '../../node_modules/@fontsource/inter/files/inter-latin-800-normal.woff2',
    ),
  ),
);
app.get('/fonts/ibm-plex-mono-400.woff2', (_request, response) =>
  response.sendFile(
    path.resolve(
      here,
      '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
    ),
  ),
);

const server = createServer(app);
const webSockets = new WebSocketServer({ server, path: '/live' });
webSockets.on('connection', (client) => {
  client.on('message', (raw) => {
    try {
      const event = JSON.parse(raw.toString()) as {
        type?: string;
        step?: number;
        delayMs?: number;
      };
      if (
        event.type !== 'beat' ||
        !Number.isInteger(event.step) ||
        (event.step ?? -1) < 0 ||
        (event.step ?? 16) > 15 ||
        !Number.isFinite(event.delayMs) ||
        (event.delayMs ?? -1) < 0 ||
        (event.delayMs ?? 2001) > 2000
      )
        return;
      const message = JSON.stringify(event);
      for (const socket of webSockets.clients) {
        if (socket !== client && socket.readyState === WebSocket.OPEN)
          socket.send(message);
      }
    } catch {
      // Ignore malformed client messages.
    }
  });
});
const song = new Song();
let account: ConnectedAccount | null = null;
let eventSub: EventSubClient | null = null;
let streamStatus: StreamStatus = 'unknown';
const activity = new ActivityBuffer(50);
const clipResults: Array<{ at: string; text: string; edit_url?: string }> = [];

function send(event: Record<string, unknown>): void {
  const message = JSON.stringify(event);
  for (const socket of webSockets.clients) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
}

function activityFor(
  event: Record<string, unknown>,
): { kind: string; text: string } | null {
  const name = String(event.userName ?? event.name ?? 'A viewer');
  if (event.type === 'layer') {
    const layer = event.layer as { userName?: string; instrument?: string } | undefined;
    return {
      kind: 'sound',
      text: `${layer?.userName ?? name} added a ${layer?.instrument ?? 'sound'} layer`,
    };
  }
  if (event.type === 'slowdown')
    return { kind: 'chat', text: `${name} was rate limited` };
  if (event.type === 'reset') return { kind: 'song', text: 'Song reset by a moderator' };
  if (event.type === 'drop') return { kind: 'drop', text: 'The Drop fired' };
  if (event.type === 'hype') {
    const kind = String(event.kind ?? 'event');
    const details = kind === 'cheer' && event.bits ? ` · ${event.bits} bits` : '';
    return {
      kind,
      text: `${name} ${kind === 'raid' ? 'raided' : kind === 'sub' ? 'subscribed' : 'cheered'}${details}`,
    };
  }
  if (event.type === 'notice' && typeof event.text === 'string') {
    const text = event.text;
    if (text.startsWith('Clip ') || text.startsWith('Go live to auto-clip')) {
      return { kind: 'clip', text };
    }
  }
  return null;
}

function broadcast(event: Record<string, unknown>): void {
  const entry = activityFor(event);
  if (entry) {
    const record = activity.add(entry.kind, entry.text);
    send({ type: 'activity', activity: record });
  }
  if (entry?.kind === 'clip') {
    const result: { at: string; text: string; edit_url?: string } = {
      at: new Date().toISOString(),
      text: entry.text,
    };
    if (typeof event.url === 'string') result.edit_url = event.url;
    clipResults.unshift(result);
    clipResults.splice(20);
  }
  send(event);
}

async function refreshStreamStatus(): Promise<void> {
  const current = account;
  if (!current) {
    streamStatus = 'unknown';
  } else {
    try {
      streamStatus = await getStreamStatus(
        { clientId, accessToken: current.accessToken },
        current.user_id,
      );
    } catch {
      streamStatus = 'unknown';
    }
    if (account !== current) return;
  }
  send({ type: 'stream', streamStatus });
}
setInterval(() => void refreshStreamStatus(), 60_000);

app.get('/', (_request, response) =>
  response.sendFile(path.join(publicDirectory, 'index.html')),
);
app.get('/callback', (_request, response) =>
  response.sendFile(path.join(publicDirectory, 'index.html')),
);
app.get('/sound', (_request, response) =>
  response.sendFile(path.join(publicDirectory, 'sound.html')),
);
app.get('/overlay-setup', (_request, response) =>
  response.sendFile(path.join(publicDirectory, 'overlay-setup.html')),
);
app.get('/song', (_request, response) =>
  response.sendFile(path.join(publicDirectory, 'song.html')),
);
app.get('/overlay', (_request, response) =>
  response.sendFile(path.join(publicDirectory, 'overlay.html')),
);
const chat = new ChatJam({
  song,
  clientId,
  broadcast,
  getAccount: () => account,
});

app.get('/api/config', (_request, response) => {
  response.json({
    clientId,
    clientIdConfigured: Boolean(clientId),
    openAIEnabled: Boolean(process.env.OPENAI_API_KEY),
    ...song.settings,
    connected: Boolean(account),
    login: account?.login ?? '',
    streamStatus,
    layers: song.layers,
    contributors: song.contributors,
    clips: clipResults,
  });
});
app.get('/api/activity', (_request, response) => response.json(activity.recent()));
app.get('/api/clips', (_request, response) => response.json(clipResults));
app.post('/api/token', async (request, response) => {
  const accessToken = String(request.body?.access_token ?? '');
  if (!accessToken) return response.status(400).json({ error: 'Missing token' });
  if (!clientId) return response.status(503).json({ error: 'Twitch Client ID not set' });
  try {
    account = await validateTwitchToken(accessToken, clientId);
    response.json({ ok: true, login: account.login });
    streamStatus = 'unknown';
    void refreshStreamStatus();
    eventSub?.stop();
    eventSub = new EventSubClient({
      onWelcome: async (sessionId, migratedSubscriptions) => {
        if (!account) return;
        if (!migratedSubscriptions) {
          await subscribeToChannelEvents(
            { clientId, accessToken: account.accessToken },
            sessionId,
            account.user_id,
          );
        }
        broadcast({ type: 'status', connected: true, login: account.login });
      },
      onNotification: chat.onNotification,
      onStatus: (connected, error) =>
        broadcast({ type: 'status', connected, error, login: account?.login }),
      onRevocation: () => undefined,
    });
    eventSub.connect();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not validate Twitch token';
    response
      .status(
        message.includes('Twitch rejected') || message.includes('another Twitch app')
          ? 401
          : 502,
      )
      .json({ error: message });
  }
});
app.post('/api/settings', (request, response) => {
  const settings = song.updateSettings(request.body ?? {});
  broadcast({ type: 'settings', ...settings });
  response.json({ ok: true, ...settings });
});
app.get('/api/song', (_request, response) => {
  response.json({
    layers: song.layers,
    contributors: song.contributors,
    ...song.settings,
  });
});

server.listen(PORT, () => console.log(`Chat Jam listening on http://localhost:${PORT}`));
