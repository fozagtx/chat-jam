export const STEP_COUNT = 16;
export const LOOKAHEAD_SECONDS = 0.1;

export function secondsPerBeat(bpm) {
  return 60 / bpm;
}

export function secondsPerStep(bpm) {
  return secondsPerBeat(bpm) / 4;
}

export function nextGridStart(now, anchor, interval) {
  if (interval <= 0) throw new Error('interval must be positive');
  return anchor + Math.max(0, Math.ceil((now - anchor) / interval)) * interval;
}

export function nextBeatStart(now, anchor, bpm) {
  return nextGridStart(now, anchor, secondsPerBeat(bpm));
}

export function nextBarStart(now, anchor, bpm) {
  return nextGridStart(now, anchor, secondsPerBeat(bpm) * 4);
}

export function stepTime(anchor, step, bpm) {
  return anchor + step * secondsPerStep(bpm);
}

export function lookaheadEnd(currentTime, windowSeconds = LOOKAHEAD_SECONDS) {
  return currentTime + windowSeconds;
}
