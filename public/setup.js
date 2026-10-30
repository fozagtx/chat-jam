import { renderSong } from './audio/synth.js';
import { encodeWav } from './wav.js';

const $ = (selector) => document.querySelector(selector);
const config = await fetch('/api/config').then((response) => response.json());
const connectButton = $('#connect');
const downloadButton = $('#download');
const downloadHint = $('#downloadHint');
const creditsDownload = $('#creditsDownload');
let creditsUrl = null;

if (!config.clientIdConfigured) {
  $('#clientNotice').classList.remove('hidden');
  connectButton.disabled = true;
  connectButton.textContent = 'Connect with Twitch';
}
if (!config.openAIEnabled) $('#vibeNotice').classList.remove('hidden');

if (location.pathname === '/callback') {
  const hash = new URLSearchParams(location.hash.slice(1));
  const accessToken = hash.get('access_token');
  if (accessToken) {
    $('#status').textContent = 'Validating Twitch connection…';
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    });
    const result = await response.json();
    $('#status').textContent = response.ok
      ? `Connected as ${result.login}`
      : `Connection failed: ${result.error}`;
    history.replaceState(null, '', '/');
  }
}

connectButton.onclick = () => {
  const scopes = [
    'user:read:chat',
    'clips:edit',
    'channel:read:subscriptions',
    'bits:read',
    'channel:read:redemptions',
  ].join(' ');
  const authorization = new URL('https://id.twitch.tv/oauth2/authorize');
  authorization.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: 'http://localhost:3000/callback',
    response_type: 'token',
    scope: scopes,
  }).toString();
  location.href = authorization.toString();
};

for (const [id, value] of [
  ['key', config.key],
  ['scale', config.scale],
  ['tempo', config.tempo],
  ['volume', Math.round(config.volume * 100)],
]) {
  $(`#${id}`).value = value;
}
$('#reducedMotion').checked = Boolean(config.reducedMotion);

const updateSliderLabels = () => {
  $('#tempoVal').textContent = $('#tempo').value;
  $('#volumeVal').textContent = `${$('#volume').value}%`;
};
$('#tempo').oninput = $('#volume').oninput = updateSliderLabels;
updateSliderLabels();

let connected = config.connected;
let currentLogin = config.login;
let layerCount = config.layers.length;
let isRendering = false;
let lastCommand = '—';

function updateStatus() {
  $('#status').textContent =
    `${connected ? `Connected as ${currentLogin}` : 'Not connected to Twitch'} · ${layerCount}/8 layers · Last: ${lastCommand}`;
}

function setLayerCount(count) {
  layerCount = count;
  downloadButton.disabled = count === 0 || isRendering;
  downloadHint.classList.toggle('hidden', count > 0);
  if (count === 0) {
    downloadHint.textContent = "Nothing to download yet — chat hasn't added a sound";
    clearCreditsLink();
  }
  updateStatus();
}

function clearCreditsLink() {
  if (creditsUrl) URL.revokeObjectURL(creditsUrl);
  creditsUrl = null;
  creditsDownload.removeAttribute('href');
  creditsDownload.classList.add('hidden');
}

function clearOldExport() {
  clearCreditsLink();
  downloadHint.textContent = '';
  downloadHint.classList.add('hidden');
}

$('#save').onclick = async () => {
  const settings = Object.fromEntries(
    ['key', 'scale', 'tempo'].map((id) => [id, $(`#${id}`).value]),
  );
  settings.volume = Number($('#volume').value) / 100;
  settings.reducedMotion = $('#reducedMotion').checked;
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  $('#status').textContent = 'Settings applied';
};

updateStatus();
setLayerCount(layerCount);
const live = new WebSocket(`ws://${location.host}/live`);
live.onopen = async () => {
  const song = await fetch('/api/song').then((response) => response.json());
  setLayerCount(song.layers.length);
};
live.onmessage = (message) => {
  const event = JSON.parse(message.data);
  if (event.type === 'status') {
    connected = event.connected;
    currentLogin = event.login || currentLogin;
  } else if (event.type === 'layer') {
    lastCommand = `${event.layer.userName} · ${event.layer.instrument}`;
    clearOldExport();
    setLayerCount(event.layers.length);
  } else if (event.type === 'reset') {
    lastCommand = 'song reset';
    setLayerCount(0);
  }
  updateStatus();
};

downloadButton.onclick = async () => {
  isRendering = true;
  downloadButton.disabled = true;
  downloadButton.textContent = 'Rendering tonight’s song…';
  downloadHint.textContent = 'Rendering WAV and embedding contributor credits…';
  downloadHint.classList.remove('hidden');
  clearCreditsLink();

  try {
    const song = await fetch('/api/song').then((response) => response.json());
    setLayerCount(song.layers.length);
    if (song.layers.length === 0) return;

    const rendered = await renderSong(song.layers, song.tempo, song.volume);
    const credits = [
      "Chat Jam — tonight's song",
      `Key: ${song.key} ${song.scale} · ${song.tempo} BPM`,
      'Contributors:',
      ...song.contributors.map((name) => `- ${name}`),
      '',
    ].join('\n');
    const wav = encodeWav(rendered, {
      INAM: "Chat Jam — tonight's song",
      IART: 'Chat Jam community',
      ICMT: credits,
    });
    const wavLink = document.createElement('a');
    wavLink.href = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
    wavLink.download = 'chat-jam-tonight.wav';
    wavLink.click();

    creditsUrl = URL.createObjectURL(new Blob([credits], { type: 'text/plain' }));
    creditsDownload.href = creditsUrl;
    creditsDownload.classList.remove('hidden');
    downloadHint.textContent =
      'WAV ready. Credits are embedded; download credits.txt separately if needed.';
    downloadHint.classList.remove('hidden');
  } catch {
    downloadHint.textContent = 'Could not render the song. Please try again.';
    downloadHint.classList.remove('hidden');
  } finally {
    isRendering = false;
    downloadButton.textContent = 'Download tonight’s song';
    downloadButton.disabled = layerCount === 0;
  }
};
