export function nextReconnectDelay(delay: number): number;

export function connectOverlaySocket(
  onEvent: (event: Record<string, unknown>) => void,
  onConnection?: (connected: boolean) => void,
  onOpen?: () => void,
): { send(event: Record<string, unknown>): boolean; close(): void };
