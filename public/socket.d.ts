export function nextReconnectDelay(delay: number): number;

export function connectOverlaySocket(
  onEvent: (event: Record<string, unknown>) => void,
  onConnection?: (connected: boolean) => void,
  onOpen?: () => void,
): { close(): void };
