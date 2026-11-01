import { secondsPerBeat, stepTime } from '../scheduler.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteFrequency(note) {
  const match = note.match(/^([A-G](?:#|b)?)(-?\d+)$/i);
  if (!match) return 110;
  const pitchClass = match[1]
    .replace(/Db/gi, 'C#')
    .replace(/Eb/gi, 'D#')
    .replace(/Gb/gi, 'F#')
    .replace(/Ab/gi, 'G#')
    .replace(/Bb/gi, 'A#');
  const noteIndex = NOTE_NAMES.indexOf(pitchClass.toUpperCase());
  if (noteIndex < 0) return 110;
  const midi = noteIndex + 12 * (Number(match[2]) + 1);
  return 440 * 2 ** ((midi - 69) / 12);
}

export function playTone(context, destination, frequency, time, duration, wave, peak) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, time);
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.exponentialRampToValueAtTime(peak, time + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(envelope).connect(destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.01);
}

export function playNoise(context, destination, time, duration, peak) {
  const source = context.createBufferSource();
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.random() * 2 - 1;
  }
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2_500;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(peak, time);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter).connect(envelope).connect(destination);
  source.start(time);
}

export function playVoice(context, destination, instrument, time, note = 'C3') {
  if (instrument === 'kick') {
    playTone(context, destination, 120, time, 0.22, 'sine', 0.7);
    playTone(context, destination, 48, time, 0.24, 'sine', 0.55);
  } else if (instrument === 'snare') {
    playNoise(context, destination, time, 0.15, 0.22);
    playTone(context, destination, 190, time, 0.1, 'triangle', 0.12);
  } else if (instrument === 'hat') {
    playNoise(context, destination, time, 0.045, 0.11);
  } else if (instrument === 'bass') {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(noteFrequency(note), time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, time);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(0.22, time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
    oscillator.connect(filter).connect(envelope).connect(destination);
    oscillator.start(time);
    oscillator.stop(time + 0.36);
  } else {
    playTone(context, destination, noteFrequency(note), time, 0.24, 'triangle', 0.12);
  }
}

export function playDropAudio(context, destination, tempo, time = context.currentTime) {
  const duration = secondsPerBeat(tempo) * 16;
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(90, time);
  oscillator.frequency.exponentialRampToValueAtTime(900, time + duration);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(180, time);
  filter.frequency.exponentialRampToValueAtTime(9_000, time + duration);
  envelope.gain.setValueAtTime(0.001, time);
  envelope.gain.linearRampToValueAtTime(0.18, time + duration);
  envelope.gain.setValueAtTime(0.001, time + duration + 0.08);
  oscillator.connect(filter).connect(envelope).connect(destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.1);
  playTone(context, destination, 48, time + duration, 0.7, 'sine', 0.8);
  playNoise(context, destination, time + duration, 0.5, 0.4);
  return duration;
}

export async function renderSong(layers, tempo, volume, barsPerLoop = 4) {
  const sampleRate = 44_100;
  const loopDuration = secondsPerBeat(tempo) * 16;
  const dropDuration = secondsPerBeat(tempo) * 16;
  const context = new OfflineAudioContext(
    2,
    Math.ceil(sampleRate * (loopDuration * barsPerLoop + dropDuration)),
    sampleRate,
  );
  const master = context.createGain();
  master.gain.value = 0.501 * volume;
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;
  master.connect(limiter).connect(context.destination);

  for (let loop = 0; loop < barsPerLoop; loop += 1) {
    const loopStart = loop * loopDuration;
    for (const layer of layers) {
      for (const step of layer.steps) {
        const time = loopStart + stepTime(0, step, tempo);
        const noteIndex = Math.max(0, layer.steps.indexOf(step));
        const note = layer.notes?.[noteIndex] ?? 'C3';
        playVoice(context, master, layer.instrument, time, note);
      }
    }
  }
  playDropAudio(context, master, tempo, loopDuration * barsPerLoop);
  return context.startRendering();
}
