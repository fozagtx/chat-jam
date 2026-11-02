import { secondsPerBeat, stepTime } from '../scheduler.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  'minor pentatonic': [0, 3, 5, 7, 10],
};

export function noteFrequency(note) {
  const match = note.match(/^([A-G](?:#|b)?)(-?\d+)$/i);
  if (!match) return 110;
  const aliases = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const pitchClass =
    aliases[match[1][0].toUpperCase() + match[1].slice(1)] ??
    match[1][0].toUpperCase() + match[1].slice(1);
  const noteIndex = NOTE_NAMES.indexOf(pitchClass);
  if (noteIndex < 0) return 110;
  const midi = noteIndex + 12 * (Number(match[2]) + 1);
  return 440 * 2 ** ((midi - 69) / 12);
}

export function chordPadNotes(key, scale) {
  const aliases = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const rootIndex = NOTE_NAMES.indexOf(aliases[key] ?? key);
  const root = rootIndex < 0 ? 0 : rootIndex;
  const intervals = SCALE_INTERVALS[scale.toLowerCase()] ?? SCALE_INTERVALS.major;
  return [0, 2, 4].map((degree) => {
    const pitch = root + intervals[degree % intervals.length] + 48;
    return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
  });
}

export function stepVelocity(instrument, step) {
  const pattern = [0.82, 0.96, 0.74, 1];
  const velocity = pattern[(((step % 16) + 16) % 16) % pattern.length];
  return instrument === 'hat' && step % 4 === 2 ? Math.min(1, velocity + 0.12) : velocity;
}

export function swingOffset(instrument, step, tempo) {
  return instrument === 'hat' && step % 4 === 2 ? secondsPerBeat(tempo) * 0.025 : 0;
}

export function createAudioBus(
  context,
  destination = context.destination,
  volume = 0.501,
) {
  const dry = context.createGain();
  const music = context.createGain();
  const reverbSend = context.createGain();
  const convolver = context.createConvolver();
  const reverbReturn = context.createGain();
  const glue = context.createDynamicsCompressor();
  const master = context.createGain();
  const limiter = context.createDynamicsCompressor();
  convolver.buffer = createImpulse(context);
  music.gain.value = 1;
  reverbSend.gain.value = 0.18;
  reverbReturn.gain.value = 0.24;
  glue.threshold.value = -18;
  glue.knee.value = 14;
  glue.ratio.value = 2.4;
  glue.attack.value = 0.012;
  glue.release.value = 0.22;
  master.gain.value = 0.501 * volume;
  limiter.threshold.value = -5;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.14;
  dry.connect(glue);
  music.connect(glue);
  reverbSend.connect(convolver).connect(reverbReturn).connect(glue);
  glue.connect(master).connect(limiter).connect(destination);
  return {
    dry,
    music,
    reverbSend,
    master,
    limiter,
    duck(time) {
      music.gain.cancelScheduledValues(time);
      music.gain.setValueAtTime(1, time);
      music.gain.linearRampToValueAtTime(0.5, time + 0.012);
      music.gain.setTargetAtTime(1, time + 0.1, 0.055);
    },
  };
}

function createImpulse(context) {
  const duration = 1.45;
  const length = Math.floor(context.sampleRate * duration);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const decay = (1 - index / length) ** 3.2;
      data[index] = (Math.random() * 2 - 1) * decay;
    }
  }
  return impulse;
}

function channelFor(destination, instrument) {
  if (!destination || typeof destination.connect === 'function') return destination;
  return instrument === 'bass' || instrument === 'melody' || instrument === 'pad'
    ? destination.music
    : destination.dry;
}

function routeEnvelope(context, envelope, destination, instrument, send = 0.12) {
  envelope.connect(channelFor(destination, instrument));
  if (destination?.reverbSend && send > 0) {
    const sendGain = context.createGain();
    sendGain.gain.value = send;
    envelope.connect(sendGain).connect(destination.reverbSend);
  }
}

function createEnvelope(context, time, peak, duration, attack = 0.008) {
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  return envelope;
}

export function playTone(
  context,
  destination,
  frequency,
  time,
  duration,
  wave = 'sine',
  peak = 0.15,
) {
  const oscillator = context.createOscillator();
  const envelope = createEnvelope(context, time, peak, duration);
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.connect(envelope);
  routeEnvelope(context, envelope, destination, 'tone', 0.04);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.02);
}

export function playNoise(context, destination, time, duration, peak, options = {}) {
  const source = context.createBufferSource();
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1)
    samples[index] = Math.random() * 2 - 1;
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = options.filterType ?? 'highpass';
  filter.frequency.setValueAtTime(options.frequency ?? 2_500, time);
  if (options.frequencyEnd) {
    filter.frequency.exponentialRampToValueAtTime(options.frequencyEnd, time + duration);
  }
  if (options.q) filter.Q.setValueAtTime(options.q, time);
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, time);
  if (options.rise) {
    envelope.gain.linearRampToValueAtTime(peak, time + duration);
  } else {
    envelope.gain.exponentialRampToValueAtTime(peak, time + 0.002);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  }
  source.connect(filter).connect(envelope);
  routeEnvelope(
    context,
    envelope,
    destination,
    options.instrument ?? 'noise',
    options.reverb ?? 0.12,
  );
  source.start(time);
  source.stop(time + duration + 0.01);
}

export function playVoice(
  context,
  destination,
  instrument,
  time,
  note = 'C3',
  options = {},
) {
  const velocity = options.velocity ?? stepVelocity(instrument, options.step ?? 0);
  time += options.swingOffset ?? 0;
  if (instrument === 'kick') {
    destination?.duck?.(time);
    const body = context.createOscillator();
    const bodyEnvelope = createEnvelope(context, time, 0.78 * velocity, 0.24, 0.004);
    body.type = 'sine';
    body.frequency.setValueAtTime(148, time);
    body.frequency.exponentialRampToValueAtTime(42, time + 0.19);
    body.connect(bodyEnvelope);
    routeEnvelope(context, bodyEnvelope, destination, 'kick', 0.08);
    body.start(time);
    body.stop(time + 0.26);
    playNoise(context, destination, time, 0.018, 0.18 * velocity, {
      frequency: 5_200,
      instrument: 'kick',
      reverb: 0.02,
    });
  } else if (instrument === 'snare') {
    playNoise(context, destination, time, 0.16, 0.31 * velocity, {
      filterType: 'bandpass',
      frequency: 1_850,
      q: 0.72,
      instrument: 'snare',
      reverb: 0.38,
    });
    playTone(context, destination, 188, time, 0.13, 'triangle', 0.19 * velocity);
  } else if (instrument === 'hat') {
    const open = options.step % 4 === 2;
    playNoise(
      context,
      destination,
      time,
      open ? 0.22 : 0.045,
      (open ? 0.14 : 0.12) * velocity,
      {
        frequency: 7_100,
        instrument: 'hat',
        reverb: open ? 0.2 : 0.04,
      },
    );
  } else if (instrument === 'bass') {
    const filter = context.createBiquadFilter();
    const envelope = createEnvelope(context, time, 0.3 * velocity, 0.4, 0.012);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1_050, time);
    filter.frequency.exponentialRampToValueAtTime(260, time + 0.32);
    filter.Q.setValueAtTime(0.75, time);
    for (const [wave, cents] of [
      ['sawtooth', -6],
      ['square', 6],
    ]) {
      const oscillator = context.createOscillator();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(noteFrequency(note), time);
      oscillator.detune.setValueAtTime(cents, time);
      oscillator.connect(filter);
      oscillator.start(time);
      oscillator.stop(time + 0.42);
    }
    filter.connect(envelope);
    routeEnvelope(context, envelope, destination, 'bass', 0.22);
  } else if (instrument === 'melody') {
    const envelope = createEnvelope(context, time, 0.21 * velocity, 0.28, 0.006);
    for (const [wave, multiplier, cents] of [
      ['triangle', 1, -3],
      ['sine', 2, 4],
    ]) {
      const oscillator = context.createOscillator();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(noteFrequency(note) * multiplier, time);
      oscillator.detune.setValueAtTime(cents, time);
      oscillator.connect(envelope);
      oscillator.start(time);
      oscillator.stop(time + 0.31);
    }
    routeEnvelope(context, envelope, destination, 'melody', 0.2);
    const delay = context.createDelay(0.5);
    const feedback = context.createGain();
    const wet = context.createGain();
    delay.delayTime.setValueAtTime(0.19, time);
    feedback.gain.setValueAtTime(0.22, time);
    wet.gain.setValueAtTime(0.16, time);
    envelope.connect(delay).connect(wet).connect(channelFor(destination, 'melody'));
    delay.connect(feedback).connect(delay);
  } else {
    const frequency = noteFrequency(note);
    playTone(context, destination, frequency, time, 0.32, 'sine', 0.16 * velocity);
    playTone(
      context,
      destination,
      frequency * 1.5,
      time,
      0.24,
      'triangle',
      0.06 * velocity,
    );
  }
}

export function playPad(context, destination, notes, time, duration) {
  for (const note of notes) {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const frequency = noteFrequency(note);
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1_000, time);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.linearRampToValueAtTime(0.045, time + 0.36);
    envelope.gain.setValueAtTime(0.04, time + Math.max(0.4, duration - 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter).connect(envelope);
    routeEnvelope(context, envelope, destination, 'pad', 0.28);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }
}

export function playDropAudio(context, destination, tempo, time = context.currentTime) {
  const duration = secondsPerBeat(tempo) * 16;
  const riser = context.createOscillator();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.linearRampToValueAtTime(0.17, time + duration);
  riser.type = 'sawtooth';
  riser.frequency.setValueAtTime(70, time);
  riser.frequency.exponentialRampToValueAtTime(740, time + duration);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(150, time);
  filter.frequency.exponentialRampToValueAtTime(8_500, time + duration);
  riser.connect(filter).connect(envelope);
  routeEnvelope(context, envelope, destination, 'drop', 0.24);
  riser.start(time);
  riser.stop(time + duration + 0.02);
  playNoise(context, destination, time, duration, 0.055, {
    filterType: 'highpass',
    frequency: 350,
    frequencyEnd: 8_500,
    instrument: 'drop',
    reverb: 0.2,
    rise: true,
  });
  playVoice(context, destination, 'kick', time + duration, 'C2', { velocity: 0.9 });
  playTone(context, destination, 42, time + duration, 0.7, 'sine', 0.42);
  playNoise(context, destination, time + duration, 0.46, 0.28, {
    filterType: 'lowpass',
    frequency: 1_100,
    instrument: 'drop',
    reverb: 0.42,
  });
  return duration;
}

export async function renderSong(
  layers,
  tempo,
  volume,
  barsPerLoop = 4,
  key = 'C',
  scale = 'major',
) {
  const sampleRate = 44_100;
  const loopDuration = secondsPerBeat(tempo) * 16;
  const dropDuration = loopDuration;
  const context = new OfflineAudioContext(
    2,
    Math.ceil(sampleRate * (loopDuration * barsPerLoop + dropDuration)),
    sampleRate,
  );
  const bus = createAudioBus(context, context.destination, volume);
  const hasMelodicLayer = layers.some((layer) =>
    ['bass', 'melody'].includes(layer.instrument),
  );

  for (let loop = 0; loop < barsPerLoop; loop += 1) {
    const loopStart = loop * loopDuration;
    if (hasMelodicLayer) {
      playPad(context, bus, chordPadNotes(key, scale), loopStart, loopDuration);
    }
    for (const layer of layers) {
      for (const step of layer.steps) {
        const time = loopStart + stepTime(0, step, tempo);
        const noteIndex = Math.max(0, layer.steps.indexOf(step));
        const note = layer.notes?.[noteIndex] ?? 'C3';
        playVoice(context, bus, layer.instrument, time, note, {
          step,
          velocity: stepVelocity(layer.instrument, step),
          swingOffset: swingOffset(layer.instrument, step, tempo),
        });
      }
    }
  }
  playDropAudio(context, bus, tempo, loopDuration * barsPerLoop);
  return context.startRendering();
}
