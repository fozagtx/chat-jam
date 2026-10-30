import { renderSong } from './audio/synth.js';
import { encodeWav } from './wav.js';
const $ = (s) => document.querySelector(s);
const cfg = await fetch('/api/config').then((r) => r.json());
const notice = $('#clientNotice'),
  connect = $('#connect');
if (!cfg.clientIdConfigured) {
  notice.classList.remove('hidden');
  connect.disabled = true;
  connect.textContent = 'Twitch Client ID not set';
}
if (!cfg.openAIEnabled) $('#vibeNotice').classList.remove('hidden');
if (location.pathname === '/callback') {
  const hash = new URLSearchParams(location.hash.slice(1));
  const access = hash.get('access_token');
  if (access) {
    $('#status').textContent = 'Validating Twitch connection…';
    const r = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: access }),
    });
    const d = await r.json();
    $('#status').textContent = r.ok
      ? `Connected as ${d.login}`
      : `Connection failed: ${d.error}`;
    history.replaceState(null, '', '/');
  }
}
connect.onclick = () => {
  const scopes = [
    'user:read:chat',
    'clips:edit',
    'channel:read:subscriptions',
    'bits:read',
    'channel:read:redemptions',
  ].join(' ');
  const authorization = new URL('https://id.twitch.tv/oauth2/authorize');
  authorization.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: 'http://localhost:3000/callback',
    response_type: 'token',
    scope: scopes,
  }).toString();
  location.href = authorization.toString();
};
for (const [id, val] of [
  ['key', cfg.key],
  ['scale', cfg.scale],
  ['tempo', cfg.tempo],
  ['volume', Math.round(cfg.volume * 100)],
])
  $('#' + id).value = val;
const show = () => {
  $('#tempoVal').textContent = $('#tempo').value;
  $('#volumeVal').textContent = $('#volume').value + '%';
};
$('#tempo').oninput = $('#volume').oninput = show;
show();
$('#save').onclick = async () => {
  const d = Object.fromEntries(
    ['key', 'scale', 'tempo'].map((id) => [id, $('#' + id).value]),
  );
  d.volume = Number($('#volume').value) / 100;
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(d),
  });
  $('#status').textContent = 'Settings applied';
};
let connected = cfg.connected;
let currentLogin = cfg.login;
let layerCount = cfg.layers.length;
let lastCommand = '—';
const updateStatus = () => {
  $('#status').textContent =
    `${connected ? `Connected as ${currentLogin}` : 'Not connected to Twitch'} · ${layerCount}/8 layers · Last: ${lastCommand}`;
};
updateStatus();
const live = new WebSocket(`ws://${location.host}/live`);
live.onmessage = (message) => {
  const event = JSON.parse(message.data);
  if (event.type === 'status') {
    connected = event.connected;
    currentLogin = event.login || currentLogin;
  }
  if (event.type === 'layer') {
    layerCount = event.layers.length;
    lastCommand = `${event.layer.userName} · ${event.layer.instrument}`;
  }
  if (event.type === 'reset') {
    layerCount = 0;
    lastCommand = 'song reset';
  }
  updateStatus();
};
$('#download').onclick = async () => {
  const { layers, contributors, tempo, key, scale, volume } = await fetch(
    '/api/song',
  ).then((r) => r.json());
  const rendered = await renderSong(layers, tempo, volume);
  const wav = encodeWav(rendered);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
  a.download = 'chat-jam-tonight.wav';
  a.click();
  const contributorLines = contributors.map((name) => `- ${name}`);
  const credits = [
    "Chat Jam — tonight's song",
    `Key: ${key} ${scale} · ${tempo} BPM`,
    'Contributors:',
    ...(contributorLines.length ? contributorLines : ['- No contributors yet']),
    '',
  ].join('\n');
  const c = document.createElement('a');
  c.href = URL.createObjectURL(new Blob([credits], { type: 'text/plain' }));
  c.download = 'credits.txt';
  c.click();
};
