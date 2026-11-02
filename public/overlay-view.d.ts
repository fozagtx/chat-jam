export interface CaptionLayer {
  id?: string;
  userId?: string;
  userName: string;
  instrument: string;
  color?: string;
  steps: number[];
}

export function emptySlotCommand(index: number): string;

export function getLayerTransitions(
  previousLayers: CaptionLayer[],
  nextLayers: CaptionLayer[],
): {
  joined: CaptionLayer[];
  removed: CaptionLayer[];
  replacements: Array<{ from: CaptionLayer; to: CaptionLayer }>;
};

export function instrumentHitDuration(instrument: string, tempo: number): number;

export function createInstrumentArt(instrument: string): HTMLElement;

export function viewerNameLabel(
  layers: CaptionLayer[],
  layer: CaptionLayer,
  index: number,
): string | null;

export function captionForLayers(layers: CaptionLayer[], step: number): string;
