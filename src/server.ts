import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { clientId, PORT } from './config.js';
import { Song } from './song.js';
import { ChatJam } from './chat.js';
import { EventSubClient } from './twitch/eventsub.js';
import { subscribeToChannelEvents } from './twitch/helix.js';
import { validateTwitchToken, type ConnectedAccount } from './twitch/oauth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(here, '../../public');
const app = express();
app.use(express.json({ limit: '32kb' }));
app.use(express.static(publicDirectory));
app.get('/fonts/inter-tight-400.woff2', (_request, response) =>
  response.sendFile(
    path.resolve(
      here,
      '../../node_modules/@fontsource/inter-tight/files/inter-tight-latin-400-normal.woff2',
    ),
  ),
);
app.get('/fonts/inter-tight-500.woff2', (_request, response) =>
  response.sendFile(
    path.resolve(
      here,
      '../../node_modules/@fontsource/inter-tight/files/inter-tight-latin-500-normal.woff2',
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
const song = new Song();
let account: ConnectedAccount | null = null;
let eventSub: EventSubClient | null = null;

function broadcast(event: Record<string, unknown>): void {
  const message = JSON.stringify(event);
  for (const socket of webSockets.clients) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
}

app.get('/', (_request, response) =>
  response.sendFile(path.join(publicDirectory, 'index.html')),
);
app.get('/callback', (_request, response) =>
  response.sendFile(path.join(publicDirectory, 'index.html')),
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
    layers: song.layers,
    contributors: song.contributors,
  });
});
app.post('/api/token', async (request, response) => {
  const accessToken = String(request.body?.access_token ?? '');
  if (!accessToken) return response.status(400).json({ error: 'Missing token' });
  if (!clientId) return response.status(503).json({ error: 'Twitch Client ID not set' });
  try {
    account = await validateTwitchToken(accessToken, clientId);
    response.json({ ok: true, login: account.login });
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
