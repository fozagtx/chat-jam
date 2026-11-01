export function nextReconnectDelay(delay) {
  return Math.min(delay * 2, 10_000);
}

export function connectOverlaySocket(
  onEvent,
  onConnection = () => {},
  onOpen = () => {},
) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  let socket;
  let retryDelay = 1_000;
  let retryTimer;
  let stopped = false;

  const connect = () => {
    socket = new WebSocket(`${protocol}//${location.host}/live`);
    socket.addEventListener('open', () => {
      retryDelay = 1_000;
      onConnection(true);
      onOpen();
    });
    socket.addEventListener('close', () => {
      onConnection(false);
      if (stopped) return;
      retryTimer = setTimeout(connect, retryDelay);
      retryDelay = nextReconnectDelay(retryDelay);
    });
    socket.addEventListener('message', (message) => {
      try {
        onEvent(JSON.parse(message.data));
      } catch {
        // Ignore malformed local messages and keep the overlay connected.
      }
    });
  };

  connect();
  return {
    close() {
      stopped = true;
      clearTimeout(retryTimer);
      socket?.close();
    },
  };
}
