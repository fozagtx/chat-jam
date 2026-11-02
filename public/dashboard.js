import { renderSong } from './audio/synth.js';
import { encodeWav } from './wav.js';
import { connectOverlaySocket } from './socket.js';
import { disposeRive, setRiveReducedMotion } from './rive-art.js';
import { triggerRive } from './rive-art.js';
import {
  createInstrumentArt,
  emptySlotCommand,
  getLayerTransitions,
  instrumentHitDuration,
  viewerNameLabel,
} from './overlay-view.js';

const $ = (selector) => document.querySelector(selector);
const page = document.body.dataset.page;
const routes = [
  { path: '/', label: 'Live', icon: '◉' },
  { path: '/sound', label: 'Sound', icon: '♫' },
  { path: '/overlay-setup', label: 'Overlay', icon: '▧' },
  { path: '/song', label: 'Song & clips', icon: '◍' },
];
const titles = { live: 'Live', sound: 'Sound', overlay: 'Overlay', song: 'Song & clips' };
const sidebar = $('#sidebar');
const topbar = $('#topbar');
let config = null;
let creditsUrl = null;
let isRendering = false;
let activityEntries = [];
let previousLayers = [];
let countTimer = null;

function applyDashboardReducedMotion() {
  document.body.classList.toggle(
    'reduced',
    Boolean(config?.reducedMotion) ||
      matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  setRiveReducedMotion(document.body.classList.contains('reduced'));
}

function renderShell() {
  sidebar.innerHTML = `
    <div class="sidebar-brand"><span class="brand-mark">cj</span><span class="brand-name">chat jam</span></div>
    <button id="collapseSidebar" class="collapse-button" type="button" aria-label="Collapse sidebar"><span>⇤</span><span class="nav-label">Collapse</span></button>
    <nav class="sidebar-nav" aria-label="Dashboard pages">
      ${routes.map(({ path: route, label, icon }) => `<a class="sidebar-link ${route === location.pathname || (route === '/' && page === 'live') ? 'active' : ''}" href="${route}" title="${label}"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></a>`).join('')}
    </nav>
    <a class="sidebar-overlay-link" href="/overlay" target="_blank" rel="noreferrer"><span class="nav-icon">↗</span><span class="nav-label">Open OBS overlay</span></a>
    <div class="sidebar-footer"><span class="sidebar-sticker" aria-hidden="true">✳</span><span class="nav-label">Your chat is the band.</span></div>`;

  topbar.innerHTML = `
    <div class="topbar-left"><button id="mobileMenu" class="mobile-menu" type="button" aria-label="Open navigation">☰</button><span class="eyebrow">${titles[page] ?? 'Live'}</span><span class="topbar-separator">/</span><strong>Chat Jam</strong></div>
    <div class="topbar-right"><span id="twitchState" class="connection-state"><i></i><span>Not connected to Twitch</span></span><span id="streamState" class="stream-badge unknown">UNKNOWN</span><span class="topbar-layer-count"><span id="topLayerCount">0</span>/8</span><button id="connect" class="button button-primary topbar-connect">Connect with Twitch</button><p id="clientNotice" class="client-notice hidden">Twitch Client ID not set in src/config.ts</p></div>`;

  const saved = localStorage.getItem('chat-jam-sidebar-collapsed') === 'true';
  document.body.classList.toggle('sidebar-collapsed', saved);
  $('#collapseSidebar').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem(
      'chat-jam-sidebar-collapsed',
      String(document.body.classList.contains('sidebar-collapsed')),
    );
  });
  $('#mobileMenu').addEventListener('click', () => {
    document.body.classList.toggle('mobile-nav-open');
  });
  document.addEventListener('click', (event) => {
    if (
      document.body.classList.contains('mobile-nav-open') &&
      !sidebar.contains(event.target) &&
      !$('#mobileMenu').contains(event.target)
    ) {
      document.body.classList.remove('mobile-nav-open');
    }
  });
}

function updateTopbar() {
  if (!config) return;
  const connection = $('#twitchState');
  connection.classList.toggle('connected', config.connected);
  connection.querySelector('span').textContent = config.connected
    ? `Connected as ${config.login}`
    : matchMedia('(max-width: 440px)').matches
      ? 'Not connected'
      : 'Not connected to Twitch';
  const streamStatus = config.streamStatus ?? 'unknown';
  $('#streamState').textContent =
    streamStatus === 'unknown' ? 'unknown' : streamStatus.toUpperCase();
  $('#streamState').className = `stream-badge ${streamStatus}`;
  $('#topLayerCount').textContent = String(config.layers?.length ?? 0);
  const connect = $('#connect');
  connect.classList.toggle('hidden', Boolean(config.connected));
  connect.disabled = !config.clientIdConfigured;
  $('#clientNotice').classList.toggle('hidden', Boolean(config.clientIdConfigured));
}

function connectTwitch() {
  if (!config?.clientIdConfigured) return;
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
    redirect_uri: `${location.origin}/callback`,
    response_type: 'token',
    scope: scopes,
  }).toString();
  location.href = authorization.toString();
}

async function handleCallback() {
  if (location.pathname !== '/callback') return;
  const accessToken = new URLSearchParams(location.hash.slice(1)).get('access_token');
  if (accessToken) {
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    });
    const result = await response.json();
    if (!response.ok) window.alert(`Twitch connection failed: ${result.error}`);
  }
  history.replaceState(null, '', '/');
}

function renderBand(layers = []) {
  const count = $('#bandCount');
  if (!count) return;
  count.textContent = `${layers.length}/8`;
  count.classList.toggle('one-away', layers.length === 7);
  if (
    count.dataset.previous !== undefined &&
    count.dataset.previous !== String(layers.length)
  ) {
    clearTimeout(countTimer);
    count.classList.remove('count-pop');
    void count.offsetWidth;
    count.classList.add('count-pop');
    countTimer = setTimeout(() => count.classList.remove('count-pop'), 380);
  }
  count.dataset.previous = String(layers.length);
  $('#topLayerCount').textContent = String(layers.length);
  const empty = $('#bandEmpty');
  empty.classList.toggle('hidden', layers.length > 0);
  const counts = new Map();
  for (const layer of layers)
    counts.set(layer.userName, (counts.get(layer.userName) ?? 0) + 1);
  const leader = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  $('#dashboardLeader').textContent = leader ? `Top jammer: ${leader}` : '';
  const slots = Array.from({ length: 8 }, (_, index) => {
    const layer = layers[index];
    if (!layer) {
      return `<div class="dashboard-band-slot empty" aria-label="Empty band slot ${index + 1}, type ${emptySlotCommand(index)}"><div class="dashboard-empty-disc">${emptySlotCommand(index)}</div></div>`;
    }
    const label = viewerNameLabel(layers, layer, index);
    const color = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(layer.color)
      ? layer.color
      : '#fff23a';
    return `<div class="dashboard-band-slot" data-id="${escapeAttribute(layer.id)}" data-instrument="${escapeAttribute(layer.instrument)}" style="--disc-tint:${color};--slot-index:${index};--idle-phase:${index * -0.41}s" aria-label="${escapeAttribute(layer.userName)}, ${escapeAttribute(layer.instrument)} layer"><div class="instrument-art art-${escapeAttribute(layer.instrument)}"></div>${label ? `<span class="viewer-name">${escapeHtml(label)}</span>` : ''}<span class="dashboard-instrument">${escapeHtml(layer.instrument)}</span></div>`;
  });
  const band = $('#dashboardBand');
  const transitions = getLayerTransitions(previousLayers, layers);
  const oldSlots = new Map(
    [...band.children]
      .filter((slot) => slot.dataset.id)
      .map((slot) => [slot.dataset.id, { slot, rect: slot.getBoundingClientRect() }]),
  );
  const oldBandRect = band.getBoundingClientRect();
  const nextLayers = new Map(layers.map((layer) => [layer.id, layer]));
  for (const [id, old] of oldSlots) {
    const next = nextLayers.get(id);
    const art = old.slot.querySelector('.instrument-art');
    if (art && (!next || next.instrument !== art.dataset.instrument)) {
      disposeRive(art.riveController);
    }
  }
  band.innerHTML = slots.join('');
  for (const slot of band.querySelectorAll('.dashboard-band-slot[data-id]')) {
    const layer = layers.find((candidate) => candidate.id === slot.dataset.id);
    const joined = transitions.joined.some((candidate) => candidate.id === layer.id);
    const replaced = transitions.replacements.some((pair) => pair.to.id === layer.id);
    const previousArt = oldSlots.get(layer.id)?.slot.querySelector('.instrument-art');
    const art =
      previousArt?.dataset.instrument === layer.instrument
        ? previousArt
        : createInstrumentArt(layer.instrument, {
            join: joined,
            joinDelay: replaced ? 180 : 0,
          });
    slot.querySelector('.instrument-art').replaceWith(art);
    if (joined) {
      slot.classList.add('joining');
      if (transitions.replacements.some((pair) => pair.to.id === layer.id))
        slot.classList.add('replacement-join');
      slot.querySelector('.viewer-name')?.classList.add('chip-joining');
    }
  }
  for (const removed of transitions.removed) {
    const old = oldSlots.get(removed.id);
    if (!old) continue;
    const exit = old.slot.cloneNode(true);
    exit.querySelector('.rive-canvas')?.remove();
    exit.querySelector('.instrument-art')?.classList.remove('rive-ready');
    const oldRect = old.rect;
    exit.className = 'dashboard-band-slot exit-slot';
    exit.removeAttribute('data-id');
    exit.setAttribute('aria-hidden', 'true');
    exit.style.left = `${oldRect.left - oldBandRect.left}px`;
    exit.style.top = `${oldRect.top - oldBandRect.top}px`;
    exit.style.width = `${oldRect.width}px`;
    band.append(exit);
    setTimeout(() => exit.remove(), 210);
  }
  previousLayers = [...layers];
}

function animateDashboardBeat(step, delayMs = 0) {
  if (page !== 'live' || !config) return;
  setTimeout(
    () => {
      for (const layer of config.layers ?? []) {
        if (!layer.steps.includes(step)) continue;
        const slot = $('#dashboardBand').querySelector(
          `[data-id="${CSS.escape(layer.id)}"]`,
        );
        if (!slot) continue;
        const hitClass = `hit-${layer.instrument}`;
        const duration = instrumentHitDuration(layer.instrument, config.tempo);
        slot.classList.remove('hit', hitClass);
        void slot.offsetWidth;
        slot.style.setProperty('--hit-duration', `${duration}ms`);
        slot.classList.add('hit', hitClass);
        triggerRive(slot.querySelector('.instrument-art')?.riveController, 'hit');
        setTimeout(() => slot.classList.remove('hit', hitClass), duration);
      }
    },
    Math.max(0, Math.min(2000, delayMs)),
  );
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function renderActivity() {
  const feed = $('#activityFeed');
  if (!feed) return;
  $('#activityEmpty').classList.toggle('hidden', activityEntries.length > 0);
  feed.replaceChildren(
    ...activityEntries.map((entry) => {
      const item = document.createElement('li');
      item.className = `activity-item activity-${entry.kind}`;
      const time = document.createElement('time');
      time.dateTime = entry.at;
      time.textContent = new Date(entry.at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const text = document.createElement('span');
      text.textContent = entry.text;
      const kind = document.createElement('small');
      kind.textContent = entry.kind;
      item.append(time, text, kind);
      return item;
    }),
  );
}

function receiveActivity(entry) {
  if (!entry || activityEntries.some((item) => item.id === entry.id)) return;
  activityEntries = [entry, ...activityEntries].slice(0, 50);
  renderActivity();
}

async function syncServerState() {
  const [nextConfig, recentActivity, clips] = await Promise.all([
    fetch('/api/config').then((response) => response.json()),
    fetch('/api/activity').then((response) => response.json()),
    fetch('/api/clips').then((response) => response.json()),
  ]);
  config = nextConfig;
  applyDashboardReducedMotion();
  const mergedActivity = new Map(
    [...recentActivity, ...activityEntries].map((entry) => [entry.id, entry]),
  );
  activityEntries = [...mergedActivity.values()]
    .sort((left, right) => right.id - left.id)
    .slice(0, 50);
  updateTopbar();
  renderBand(config.layers);
  renderActivity();
  renderContributors(config.contributors ?? []);
  renderClips(clips);
  if ($('#vibeUnavailable'))
    $('#vibeUnavailable').classList.toggle('hidden', config.openAIEnabled);
  populateSettings();
  updateExportState();
}

function populateSettings() {
  if (!config || !$('#key')) return;
  $('#key').value = config.key;
  $('#scale').value = config.scale;
  $('#tempo').value = config.tempo;
  $('#volume').value = Math.round(config.volume * 100);
  $('#reducedMotion').checked = Boolean(config.reducedMotion);
  updateSliderLabels();
}

function updateSliderLabels() {
  if (!$('#tempoVal')) return;
  $('#tempoVal').textContent = $('#tempo').value;
  $('#volumeVal').textContent = `${$('#volume').value}%`;
}

async function saveSettings() {
  const settings = {
    key: $('#key').value,
    scale: $('#scale').value,
    tempo: Number($('#tempo').value),
    volume: Number($('#volume').value) / 100,
    reducedMotion: $('#reducedMotion').checked,
  };
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  config = { ...config, ...(await response.json()) };
  renderBand(config.layers);
  $('#settingsFeedback').textContent = 'Settings applied';
  updateTopbar();
}

function renderContributors(contributors) {
  const list = $('#contributorsList');
  if (!list) return;
  $('#contributorCount').textContent = String(contributors.length);
  $('#contributorsEmpty').classList.toggle('hidden', contributors.length > 0);
  list.replaceChildren(
    ...contributors.map((name) => {
      const item = document.createElement('li');
      item.textContent = name;
      return item;
    }),
  );
}

function renderClips(clips) {
  const list = $('#clipsList');
  if (!list) return;
  $('#clipsEmpty').classList.toggle('hidden', clips.length > 0);
  list.replaceChildren(
    ...clips.map((clip) => {
      const item = document.createElement('li');
      const description = document.createElement('span');
      description.textContent = `${clip.text} · ${new Date(clip.at).toLocaleString()}`;
      item.append(description);
      if (clip.edit_url) {
        const link = document.createElement('a');
        link.href = clip.edit_url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'Edit clip ↗';
        item.append(link);
      }
      return item;
    }),
  );
}

function updateExportState() {
  const download = $('#download');
  if (!download) return;
  download.disabled = !config.layers.length || isRendering;
  const hint = $('#downloadHint');
  if (!config.layers.length && !isRendering) {
    hint.textContent = "Nothing to download yet: chat hasn't added a sound";
    hint.classList.remove('hidden');
  } else if (!isRendering && hint.textContent.trim().startsWith('Nothing to download')) {
    hint.classList.add('hidden');
  }
}

function clearCreditsLink() {
  if (creditsUrl) URL.revokeObjectURL(creditsUrl);
  creditsUrl = null;
  const link = $('#creditsDownload');
  if (!link) return;
  link.removeAttribute('href');
  link.classList.add('hidden');
}

async function downloadSong() {
  if (!config.layers.length || isRendering) return;
  isRendering = true;
  const button = $('#download');
  const hint = $('#downloadHint');
  button.textContent = 'Rendering tonight’s song…';
  hint.textContent = 'Rendering WAV and embedding contributor credits…';
  hint.classList.remove('hidden');
  clearCreditsLink();
  updateExportState();
  try {
    const song = await fetch('/api/song').then((response) => response.json());
    if (!song.layers.length) {
      config.layers = [];
      return;
    }
    const rendered = await renderSong(
      song.layers,
      song.tempo,
      song.volume,
      4,
      song.key,
      song.scale,
    );
    const credits = [
      "Chat Jam · tonight's song",
      'Contributors:',
      ...song.contributors.map((name) => `- ${name}`),
      '',
    ].join('\n');
    const wav = encodeWav(rendered, {
      INAM: "Chat Jam · tonight's song",
      IART: 'Chat Jam community',
      ICMT: credits,
    });
    const wavLink = document.createElement('a');
    wavLink.href = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
    wavLink.download = 'chat-jam-tonight.wav';
    wavLink.click();
    creditsUrl = URL.createObjectURL(new Blob([credits], { type: 'text/plain' }));
    const creditsLink = $('#creditsDownload');
    creditsLink.href = creditsUrl;
    creditsLink.classList.remove('hidden');
    hint.textContent =
      'WAV ready. Credits are embedded; download credits.txt separately if needed.';
  } catch {
    hint.textContent = 'Could not render the song. Please try again.';
  } finally {
    isRendering = false;
    button.textContent = 'Download tonight’s song';
    updateExportState();
  }
}

function setupOverlayPage() {
  const url = `${location.origin}/overlay`;
  $('#overlayUrl').textContent = url;
  $('#copyOverlayUrl').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      $('#copyFeedback').textContent = 'Copied';
    } catch {
      $('#copyFeedback').textContent = 'Copy unavailable. Select the URL above';
    }
  });
  const viewport = $('#previewViewport');
  const preview = $('#overlayPreview');
  const resizePreview = () => {
    const scale = viewport.clientWidth / 1920;
    preview.style.transform = `scale(${scale})`;
  };
  new ResizeObserver(resizePreview).observe(viewport);
  resizePreview();
}

async function initialize() {
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener(
    'change',
    applyDashboardReducedMotion,
  );
  renderShell();
  $('#connect').addEventListener('click', connectTwitch);
  await handleCallback();
  await syncServerState();
  if (page === 'live') renderBand(config.layers);
  if (page === 'sound') {
    $('#tempo').addEventListener('input', updateSliderLabels);
    $('#volume').addEventListener('input', updateSliderLabels);
    $('#save').addEventListener('click', saveSettings);
  }
  if (page === 'overlay') setupOverlayPage();
  if (page === 'song') $('#download').addEventListener('click', downloadSong);

  connectOverlaySocket(
    (event) => {
      if (event.type === 'status') {
        config = {
          ...config,
          connected: event.connected,
          login: event.login ?? config.login,
        };
        updateTopbar();
      } else if (event.type === 'stream') {
        config = { ...config, streamStatus: event.streamStatus };
        updateTopbar();
      } else if (event.type === 'layer') {
        config = {
          ...config,
          layers: event.layers,
          contributors: [
            ...new Set([...(config.contributors ?? []), event.layer.userName]),
          ],
        };
        updateTopbar();
        renderBand(config.layers);
        renderContributors(config.contributors);
        updateExportState();
      } else if (event.type === 'reset') {
        config = { ...config, layers: [], contributors: [] };
        updateTopbar();
        renderBand([]);
        renderContributors([]);
        updateExportState();
      } else if (event.type === 'settings') {
        config = { ...config, ...event };
        applyDashboardReducedMotion();
        if ($('#key')) populateSettings();
      } else if (event.type === 'activity') {
        receiveActivity(event.activity);
      } else if (event.type === 'beat') {
        animateDashboardBeat(Number(event.step), Number(event.delayMs));
      } else if (
        event.type === 'notice' &&
        (String(event.text).startsWith('Clip ') ||
          String(event.text).startsWith('Go live to auto-clip'))
      ) {
        config.clips = [
          { at: new Date().toISOString(), text: event.text, edit_url: event.url },
          ...(config.clips ?? []),
        ].slice(0, 20);
        renderClips(config.clips);
      }
    },
    () => {},
    () => void syncServerState().catch(() => undefined),
  );
}

void initialize();
