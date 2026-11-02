export interface CaptionLayer {
  userId?: string;
  userName: string;
  instrument: string;
  steps: number[];
}

export function emptySlotCommand(index: number): string;

export function viewerNameLabel(
  layers: CaptionLayer[],
  layer: CaptionLayer,
  index: number,
): string | null;

export function captionForLayers(layers: CaptionLayer[], step: number): string;
