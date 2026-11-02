import {
  LOOKAHEAD_SECONDS,
  STEP_COUNT,
  lookaheadEnd,
  nextBarStart,
  nextBeatStart,
  secondsPerStep,
} from '../scheduler.js';
import { stepVelocity, swingOffset } from './synth.js';

const DRUMS = new Set(['kick', 'snare', 'hat']);

export class LookaheadScheduler {
  constructor({ engine, getLayers, getTempo, onStep, onLayerHit }) {
    this.engine = engine;
    this.getLayers = getLayers;
    this.getTempo = getTempo;
    this.onStep = onStep;
    this.onLayerHit = onLayerHit;
    this.startTimes = new Map();
    this.nextTime = 0;
    this.phaseAnchor = 0;
    this.step = 0;
    this.timer = null;
  }

  start() {
    this.nextTime = this.engine.context.currentTime + LOOKAHEAD_SECONDS;
    this.phaseAnchor = this.nextTime;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  addLayer(layer) {
    const now = this.engine.context.currentTime;
    const tempo = this.getTempo();
    const start = DRUMS.has(layer.instrument)
      ? nextBeatStart(now, this.phaseAnchor, tempo)
      : nextBarStart(now, this.phaseAnchor, tempo);
    this.startTimes.set(layer.id, start);
  }

  reset() {
    this.startTimes.clear();
  }

  schedule() {
    const context = this.engine.context;
    if (context.state !== 'running') return;
    const endTime = lookaheadEnd(context.currentTime);
    const tempo = this.getTempo();
    while (this.nextTime < endTime) {
      const step = this.step % STEP_COUNT;
      for (const layer of this.getLayers()) {
        if (
          layer.steps.includes(step) &&
          this.nextTime >= (this.startTimes.get(layer.id) ?? 0)
        ) {
          const noteIndex = Math.max(0, layer.steps.indexOf(step));
          this.engine.voice(
            layer.instrument,
            this.nextTime,
            layer.notes?.[noteIndex] ?? 'C3',
            {
              step,
              velocity: stepVelocity(layer.instrument, step),
              swingOffset: swingOffset(layer.instrument, step, tempo),
            },
          );
          this.onLayerHit(layer, step);
        }
      }
      this.onStep(step, this.nextTime);
      this.nextTime += secondsPerStep(tempo);
      this.step += 1;
    }
  }
}
