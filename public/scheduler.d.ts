export const STEP_COUNT: number;
export const LOOKAHEAD_SECONDS: number;
export function secondsPerBeat(bpm: number): number;
export function secondsPerStep(bpm: number): number;
export function nextGridStart(now: number, anchor: number, interval: number): number;
export function nextBeatStart(now: number, anchor: number, bpm: number): number;
export function nextBarStart(now: number, anchor: number, bpm: number): number;
export function stepTime(anchor: number, step: number, bpm: number): number;
export function lookaheadEnd(currentTime: number, windowSeconds?: number): number;
