import { playDropAudio, playTone, playVoice } from './synth.js';

export class AudioEngine {
  constructor() {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.501;
    this.limiter = this.context.createDynamicsCompressor();
    this.limiter.threshold.value = -8;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.12;
    this.master.connect(this.limiter).connect(this.context.destination);
  }

  setVolume(volume) {
    this.master.gain.setTargetAtTime(0.501 * volume, this.context.currentTime, 0.04);
  }

  voice(instrument, time, note) {
    playVoice(this.context, this.master, instrument, time, note);
  }

  tone(frequency, time, duration, wave = 'sine', peak = 0.15) {
    playTone(this.context, this.master, frequency, time, duration, wave, peak);
  }

  drop(tempo, time = this.context.currentTime) {
    return playDropAudio(this.context, this.master, tempo, time);
  }
}
