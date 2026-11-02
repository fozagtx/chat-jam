export interface AudioBus {
  dry: GainNode;
  music: GainNode;
  reverbSend: GainNode;
  master: GainNode;
  limiter: DynamicsCompressorNode;
  duck(time: number): void;
}

export function noteFrequency(note: string): number;
export function chordPadNotes(key: string, scale: string): string[];
export function stepVelocity(instrument: string, step: number): number;
export function swingOffset(instrument: string, step: number, tempo: number): number;
export function createAudioBus(
  context: BaseAudioContext,
  destination?: AudioNode,
  volume?: number,
): AudioBus;
export function playTone(
  context: BaseAudioContext,
  destination: AudioNode | AudioBus,
  frequency: number,
  time: number,
  duration: number,
  wave?: OscillatorType,
  peak?: number,
): void;
export function playVoice(
  context: BaseAudioContext,
  destination: AudioNode | AudioBus,
  instrument: string,
  time: number,
  note?: string,
  options?: { step?: number; velocity?: number; swingOffset?: number },
): void;
export function playPad(
  context: BaseAudioContext,
  destination: AudioNode | AudioBus,
  notes: string[],
  time: number,
  duration: number,
): void;
export function playDropAudio(
  context: BaseAudioContext,
  destination: AudioNode | AudioBus,
  tempo: number,
  time?: number,
): number;
export function renderSong(
  layers: Array<{
    instrument: string;
    steps: number[];
    notes?: string[];
  }>,
  tempo: number,
  volume: number,
  barsPerLoop?: number,
  key?: string,
  scale?: string,
): Promise<AudioBuffer>;
