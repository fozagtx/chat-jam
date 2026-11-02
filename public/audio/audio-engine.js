import { createAudioBus, playDropAudio, playPad, playTone, playVoice } from './synth.js';

export class AudioEngine {
  constructor() {
    this.context = new AudioContext();
    this.bus = createAudioBus(this.context);
    this.master = this.bus.master;
    this.limiter = this.bus.limiter;
  }

  setVolume(volume) {
    this.master.gain.setTargetAtTime(
      0.501 * Math.max(0, Math.min(1, volume)),
      this.context.currentTime,
      0.04,
    );
  }

  voice(instrument, time, note, options = {}) {
    playVoice(this.context, this.bus, instrument, time, note, options);
  }

  pad(notes, time, duration) {
    playPad(this.context, this.bus, notes, time, duration);
  }

  tone(frequency, time, duration, wave = 'sine', peak = 0.15) {
    playTone(this.context, this.bus, frequency, time, duration, wave, peak);
  }

  drop(tempo, time = this.context.currentTime) {
    return playDropAudio(this.context, this.bus, tempo, time);
  }
}
